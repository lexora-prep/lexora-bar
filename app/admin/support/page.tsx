import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import SupportTicketsWorkbench, {
  SupportTicketForWorkbench,
} from "./SupportTicketsWorkbench"

type SupportStatus = "open" | "pending" | "resolved" | "closed"
type SupportPriority = "normal" | "high"

const allowedStatuses: SupportStatus[] = ["open", "pending", "resolved", "closed"]
const allowedPriorities: SupportPriority[] = ["normal", "high"]

function cleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeStatus(value: string): SupportStatus {
  const status = value.toLowerCase()

  if (allowedStatuses.includes(status as SupportStatus)) {
    return status as SupportStatus
  }

  return "open"
}

function normalizePriority(value: string): SupportPriority {
  const priority = value.toLowerCase()

  if (allowedPriorities.includes(priority as SupportPriority)) {
    return priority as SupportPriority
  }

  return "normal"
}

function labelStatus(value: string) {
  const status = normalizeStatus(value)

  if (status === "open") return "Open"
  if (status === "pending") return "Pending"
  if (status === "resolved") return "Resolved"
  return "Closed"
}

function labelPriority(value: string) {
  return normalizePriority(value) === "high" ? "High" : "Normal"
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName.trim()
  return email.split("@")[0] || "Admin"
}

async function getCurrentAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profiles.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_view_billing: true,
      can_manage_users: true,
      can_view_audit_log: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = profile.admin_role === "super_admin"
  const canViewSupport =
    isSuperAdmin ||
    !!profile.can_view_billing ||
    !!profile.can_manage_users ||
    !!profile.can_view_audit_log

  if (!canViewSupport) {
    redirect("/admin")
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    displayName: safeName(profile.full_name, profile.email),
    isSuperAdmin,
  }
}

function formatMemberSince(value: Date | null | undefined) {
  if (!value) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(value)
}

function normalizePlan(value: string | null | undefined) {
  const plan = String(value || "free").trim().toLowerCase()

  if (plan === "premium") return "Premium"
  if (plan === "bll-monthly" || plan === "bll_monthly" || plan === "bll") {
    return "BLL Monthly"
  }
  if (plan === "trial") return "Trial"

  return "Free"
}

export default async function AdminSupportPage() {
  const admin = await getCurrentAdmin()

  async function replyToTicket(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const message = cleanString(formData.get("message"))

    if (!ticketId || !message) {
      redirect("/admin/support")
    }

    const ticket = await prisma.support_tickets.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    if (normalizeStatus(ticket.status) === "closed") {
      await prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "system",
          message: `Reply blocked because this ticket is closed. ${currentAdmin.displayName} must reopen it before replying.`,
        },
      })

      revalidatePath("/admin/support")
      return
    }

    await prisma.$transaction([
      prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "support",
          message,
        },
      }),

      prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "system",
          message: `Support replied by ${currentAdmin.displayName}. Ticket moved to Pending.`,
        },
      }),

      prisma.support_tickets.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: "pending",
          updated_at: new Date(),
        },
      }),
    ])

    revalidatePath("/admin/support")
  }

  async function updateTicketStatus(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const nextStatus = normalizeStatus(cleanString(formData.get("status")))

    if (!ticketId) {
      redirect("/admin/support")
    }

    const ticket = await prisma.support_tickets.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    const oldStatus = normalizeStatus(ticket.status)

    if (oldStatus === nextStatus) {
      revalidatePath("/admin/support")
      return
    }

    const eventMessage =
      nextStatus === "resolved"
        ? `Ticket marked Resolved by ${currentAdmin.displayName}.`
        : nextStatus === "closed"
          ? `Ticket closed by ${currentAdmin.displayName}. This thread is now closed. The user should open a new ticket if more help is needed.`
          : `Status changed from ${labelStatus(oldStatus)} to ${labelStatus(nextStatus)} by ${currentAdmin.displayName}.`

    await prisma.$transaction([
      prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "system",
          message: eventMessage,
        },
      }),

      prisma.support_tickets.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: nextStatus,
          updated_at: new Date(),
        },
      }),
    ])

    revalidatePath("/admin/support")
  }

  async function updateTicketPriority(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const nextPriority = normalizePriority(cleanString(formData.get("priority")))

    if (!ticketId) {
      redirect("/admin/support")
    }

    const ticket = await prisma.support_tickets.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        priority: true,
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    const oldPriority = normalizePriority(ticket.priority)

    if (oldPriority === nextPriority) {
      revalidatePath("/admin/support")
      return
    }

    await prisma.$transaction([
      prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "system",
          message: `Priority changed from ${labelPriority(oldPriority)} to ${labelPriority(nextPriority)} by ${currentAdmin.displayName}.`,
        },
      }),

      prisma.support_tickets.update({
        where: {
          id: ticket.id,
        },
        data: {
          priority: nextPriority,
          updated_at: new Date(),
        },
      }),
    ])

    revalidatePath("/admin/support")
  }

  const [
    rawTickets,
    openCount,
    pendingCount,
    resolvedCount,
    closedCount,
  ] = await Promise.all([
    prisma.support_tickets.findMany({
      orderBy: {
        updated_at: "desc",
      },
      take: 100,
      include: {
        messages: {
          orderBy: {
            created_at: "asc",
          },
        },
      },
    }),

    prisma.support_tickets.count({
      where: {
        status: "open",
      },
    }),

    prisma.support_tickets.count({
      where: {
        status: "pending",
      },
    }),

    prisma.support_tickets.count({
      where: {
        status: "resolved",
      },
    }),

    prisma.support_tickets.count({
      where: {
        status: "closed",
      },
    }),
  ])

  const userIds = Array.from(new Set(rawTickets.map((ticket) => ticket.user_id)))

  const profiles = await prisma.profiles.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      subscription_tier: true,
      created_at: true,
    },
  })

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const tickets: SupportTicketForWorkbench[] = rawTickets.map((ticket) => {
    const profile = profileMap.get(ticket.user_id)

    return {
      id: ticket.id,
      email: ticket.email,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      userPlan: normalizePlan(profile?.subscription_tier),
      memberSince: formatMemberSince(profile?.created_at),
      messages: ticket.messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        message: message.message,
        created_at: message.created_at.toISOString(),
      })),
    }
  })

  return (
    <SupportTicketsWorkbench
      admin={{
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      }}
      tickets={tickets}
      counts={{
        open: openCount,
        pending: pendingCount,
        resolved: resolvedCount,
        closed: closedCount,
        all: rawTickets.length,
      }}
      replyAction={replyToTicket}
      updateStatusAction={updateTicketStatus}
      updatePriorityAction={updateTicketPriority}
    />
  )
}
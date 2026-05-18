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

function normalizePlan(value: string | null | undefined) {
  const plan = String(value || "free").toLowerCase()

  if (plan === "premium") return "Premium"

  if (plan === "bll-monthly" || plan === "bll_monthly" || plan === "bll") {
    return "BLL Monthly"
  }

  return "Free"
}

function formatMemberSince(value: Date | null | undefined) {
  if (!value) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
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
    isSuperAdmin,
  }
}

export default async function AdminSupportPage() {
  const admin = await getCurrentAdmin()

  async function replyToTicket(formData: FormData) {
    "use server"

    await getCurrentAdmin()

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
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "support",
        message,
      },
    })

    await prisma.support_tickets.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "pending",
        updated_at: new Date(),
      },
    })

    revalidatePath("/admin/support")
    revalidatePath("/subscription")
  }

  async function updateTicketStatus(formData: FormData) {
    "use server"

    await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const rawStatus = cleanString(formData.get("status")).toLowerCase()
    const status = allowedStatuses.includes(rawStatus as SupportStatus)
      ? (rawStatus as SupportStatus)
      : "open"

    if (!ticketId) {
      redirect("/admin/support")
    }

    await prisma.support_tickets.update({
      where: {
        id: ticketId,
      },
      data: {
        status,
        updated_at: new Date(),
      },
    })

    revalidatePath("/admin/support")
    revalidatePath("/subscription")
  }

  async function updateTicketPriority(formData: FormData) {
    "use server"

    await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const rawPriority = cleanString(formData.get("priority")).toLowerCase()
    const priority = allowedPriorities.includes(rawPriority as SupportPriority)
      ? (rawPriority as SupportPriority)
      : "normal"

    if (!ticketId) {
      redirect("/admin/support")
    }

    await prisma.support_tickets.update({
      where: {
        id: ticketId,
      },
      data: {
        priority,
        updated_at: new Date(),
      },
    })

    revalidatePath("/admin/support")
  }

  const [tickets, openCount, pendingCount, resolvedCount, closedCount] =
    await Promise.all([
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

  const userIds = Array.from(new Set(tickets.map((ticket) => ticket.user_id)))

  const profiles =
    userIds.length > 0
      ? await prisma.profiles.findMany({
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
      : []

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const serializedTickets: SupportTicketForWorkbench[] = tickets.map((ticket) => {
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
      tickets={serializedTickets}
      counts={{
        open: openCount,
        pending: pendingCount,
        resolved: resolvedCount,
        closed: closedCount,
        all: tickets.length,
      }}
      replyAction={replyToTicket}
      updateStatusAction={updateTicketStatus}
      updatePriorityAction={updateTicketPriority}
    />
  )
}
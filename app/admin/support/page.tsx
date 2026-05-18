import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import SupportTicketsWorkbench, {
  SupportTicketForWorkbench,
} from "./SupportTicketsWorkbench"

type SupportStatus = "open" | "pending" | "resolved" | "closed"
type SupportPriority = "normal" | "high" | "urgent"

const allowedStatuses: SupportStatus[] = ["open", "pending", "resolved", "closed"]
const allowedPriorities: SupportPriority[] = ["normal", "high", "urgent"]

type SupportTicketMetaRow = {
  id: string
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  last_user_message_at: Date | null
  last_support_reply_at: Date | null
  last_admin_read_at: Date | null
  resolved_at: Date | null
  closed_at: Date | null
  sla_due_at: Date | null
}

function cleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function adminDisplayName(admin: {
  fullName: string | null
  email: string
}) {
  if (admin.fullName && admin.fullName.trim()) return admin.fullName.trim()
  return admin.email.split("@")[0] || "Admin"
}

function normalizeStatus(value: string): SupportStatus {
  const normalized = value.trim().toLowerCase()

  if (allowedStatuses.includes(normalized as SupportStatus)) {
    return normalized as SupportStatus
  }

  return "open"
}

function normalizePriority(value: string): SupportPriority {
  const normalized = value.trim().toLowerCase()

  if (allowedPriorities.includes(normalized as SupportPriority)) {
    return normalized as SupportPriority
  }

  return "normal"
}

function getSlaDueAt(priority: string, baseDate = new Date()) {
  const normalized = normalizePriority(priority)
  const due = new Date(baseDate)

  if (normalized === "urgent") {
    due.setHours(due.getHours() + 2)
    return due
  }

  if (normalized === "high") {
    due.setHours(due.getHours() + 12)
    return due
  }

  due.setHours(due.getHours() + 24)
  return due
}

function formatMonthYear(value: Date | null | undefined) {
  if (!value) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(value)
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
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

async function getSupportTicketMeta(ticketIds: string[]) {
  if (ticketIds.length === 0) return new Map<string, SupportTicketMetaRow>()

  const rows = await prisma.$queryRaw<SupportTicketMetaRow[]>`
    select
      id::text,
      assigned_admin_id::text,
      assigned_admin_name,
      last_user_message_at,
      last_support_reply_at,
      last_admin_read_at,
      resolved_at,
      closed_at,
      sla_due_at
    from public.support_tickets
    where id = any(${ticketIds}::uuid[])
  `

  return new Map(rows.map((row) => [row.id, row]))
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

    if (!ticket || ticket.status === "closed") {
      redirect("/admin/support")
    }

    const now = new Date()
    const name = adminDisplayName(currentAdmin)

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "support",
        message,
      },
    })

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "system",
        message: `Support replied by ${name}. Ticket moved to Pending.`,
      },
    })

    await prisma.support_tickets.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "pending",
        updated_at: now,
      },
    })

    await prisma.$executeRaw`
      update public.support_tickets
      set
        assigned_admin_id = ${currentAdmin.id}::uuid,
        assigned_admin_name = ${name},
        last_support_reply_at = ${now},
        last_admin_read_at = ${now},
        resolved_at = null,
        closed_at = null,
        updated_at = ${now}
      where id = ${ticket.id}::uuid
    `

    revalidatePath("/admin/support")
  }

  async function updateTicketStatus(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const rawStatus = cleanString(formData.get("status")).toLowerCase()
    const nextStatus = normalizeStatus(rawStatus)

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
        priority: true,
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    const now = new Date()
    const previousStatus = normalizeStatus(ticket.status)
    const name = adminDisplayName(currentAdmin)

    if (previousStatus === nextStatus) {
      await prisma.$executeRaw`
        update public.support_tickets
        set
          assigned_admin_id = coalesce(assigned_admin_id, ${currentAdmin.id}::uuid),
          assigned_admin_name = coalesce(assigned_admin_name, ${name}),
          last_admin_read_at = ${now},
          updated_at = ${now}
        where id = ${ticket.id}::uuid
      `

      revalidatePath("/admin/support")
      return
    }

    let systemMessage = `Status changed from ${previousStatus} to ${nextStatus} by ${name}.`

    if (nextStatus === "resolved") {
      systemMessage = `Ticket marked Resolved by ${name}.`
    }

    if (nextStatus === "closed") {
      systemMessage = `Ticket closed by ${name}. The thread is now locked. The user should open a new ticket if more help is needed.`
    }

    if (previousStatus === "closed" && nextStatus === "open") {
      systemMessage = `Ticket reopened by ${name}. Status changed from Closed to Open.`
    }

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "system",
        message: systemMessage,
      },
    })

    await prisma.support_tickets.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: nextStatus,
        updated_at: now,
      },
    })

    const nextSlaDueAt =
      nextStatus === "open" || nextStatus === "pending"
        ? getSlaDueAt(ticket.priority, now)
        : null

    await prisma.$executeRaw`
      update public.support_tickets
      set
        assigned_admin_id = coalesce(assigned_admin_id, ${currentAdmin.id}::uuid),
        assigned_admin_name = coalesce(assigned_admin_name, ${name}),
        last_admin_read_at = ${now},
        resolved_at = case
          when ${nextStatus} = 'resolved' then ${now}
          when ${nextStatus} = 'open' then null
          else resolved_at
        end,
        closed_at = case
          when ${nextStatus} = 'closed' then ${now}
          when ${nextStatus} = 'open' then null
          else closed_at
        end,
        sla_due_at = ${nextSlaDueAt},
        updated_at = ${now}
      where id = ${ticket.id}::uuid
    `

    revalidatePath("/admin/support")
  }

  async function updateTicketPriority(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const rawPriority = cleanString(formData.get("priority")).toLowerCase()
    const nextPriority = normalizePriority(rawPriority)

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
        priority: true,
      },
    })

    if (!ticket || ticket.status === "closed") {
      redirect("/admin/support")
    }

    const previousPriority = normalizePriority(ticket.priority)
    const now = new Date()
    const name = adminDisplayName(currentAdmin)

    if (previousPriority !== nextPriority) {
      await prisma.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender: "system",
          message: `Priority changed from ${previousPriority} to ${nextPriority} by ${name}.`,
        },
      })
    }

    await prisma.support_tickets.update({
      where: {
        id: ticket.id,
      },
      data: {
        priority: nextPriority,
        updated_at: now,
      },
    })

    const nextSlaDueAt =
      ticket.status === "open" || ticket.status === "pending"
        ? getSlaDueAt(nextPriority, now)
        : null

    await prisma.$executeRaw`
      update public.support_tickets
      set
        assigned_admin_id = coalesce(assigned_admin_id, ${currentAdmin.id}::uuid),
        assigned_admin_name = coalesce(assigned_admin_name, ${name}),
        last_admin_read_at = ${now},
        sla_due_at = ${nextSlaDueAt},
        updated_at = ${now}
      where id = ${ticket.id}::uuid
    `

    revalidatePath("/admin/support")
  }

  async function markTicketRead(formData: FormData) {
    "use server"

    const currentAdmin = await getCurrentAdmin()
    const ticketId = cleanString(formData.get("ticketId"))

    if (!ticketId) {
      redirect("/admin/support")
    }

    const now = new Date()

    await prisma.$executeRaw`
      update public.support_tickets
      set
        assigned_admin_id = coalesce(assigned_admin_id, ${currentAdmin.id}::uuid),
        assigned_admin_name = coalesce(assigned_admin_name, ${adminDisplayName(currentAdmin)}),
        last_admin_read_at = ${now},
        updated_at = updated_at
      where id = ${ticketId}::uuid
    `

    revalidatePath("/admin/support")
  }

  const baseTickets = await prisma.support_tickets.findMany({
    orderBy: {
      updated_at: "desc",
    },
    take: 200,
    include: {
      messages: {
        orderBy: {
          created_at: "asc",
        },
      },
    },
  })

  const userIds = Array.from(new Set(baseTickets.map((ticket) => ticket.user_id)))
  const ticketIds = baseTickets.map((ticket) => ticket.id)

  const [profiles, metaMap] = await Promise.all([
    prisma.profiles.findMany({
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
    }),
    getSupportTicketMeta(ticketIds),
  ])

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const tickets: SupportTicketForWorkbench[] = baseTickets.map((ticket) => {
    const profile = profileMap.get(ticket.user_id)
    const meta = metaMap.get(ticket.id)

    return {
      id: ticket.id,
      email: ticket.email,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      userPlan: profile?.subscription_tier || "free",
      memberSince: formatMonthYear(profile?.created_at),
      assignedAdminName: meta?.assigned_admin_name || null,
      assignedAdminId: meta?.assigned_admin_id || null,
      lastUserMessageAt: toIso(meta?.last_user_message_at),
      lastSupportReplyAt: toIso(meta?.last_support_reply_at),
      lastAdminReadAt: toIso(meta?.last_admin_read_at),
      resolvedAt: toIso(meta?.resolved_at),
      closedAt: toIso(meta?.closed_at),
      slaDueAt: toIso(meta?.sla_due_at),
      messages: ticket.messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        message: message.message,
        created_at: message.created_at.toISOString(),
      })),
    }
  })

  const counts = tickets.reduce(
    (acc, ticket) => {
      const status = normalizeStatus(ticket.status)

      acc.all += 1
      acc[status] += 1

      const latestHumanMessage = [...ticket.messages]
        .reverse()
        .find((message) => message.sender.toLowerCase() !== "system")

      const latestHumanIsUser =
        latestHumanMessage?.sender.toLowerCase() === "user"

      const lastUserTime = ticket.lastUserMessageAt
        ? new Date(ticket.lastUserMessageAt).getTime()
        : 0

      const lastReadTime = ticket.lastAdminReadAt
        ? new Date(ticket.lastAdminReadAt).getTime()
        : 0

      const isUnread =
        latestHumanIsUser &&
        status !== "closed" &&
        status !== "resolved" &&
        lastUserTime > lastReadTime

      if (isUnread) acc.unread += 1

      const slaDueTime = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : 0

      if (
        slaDueTime &&
        status !== "closed" &&
        status !== "resolved" &&
        slaDueTime < Date.now()
      ) {
        acc.slaAtRisk += 1
      }

      return acc
    },
    {
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      all: 0,
      unread: 0,
      slaAtRisk: 0,
    },
  )

  return (
    <SupportTicketsWorkbench
      admin={admin}
      tickets={tickets}
      counts={counts}
      replyAction={replyToTicket}
      updateStatusAction={updateTicketStatus}
      updatePriorityAction={updateTicketPriority}
      markReadAction={markTicketRead}
    />
  )
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, error: null }
}

function cleanString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function normalizeCategory(value: string) {
  const normalized = value.trim().toLowerCase()

  if (normalized === "billing") return "billing"
  if (normalized === "account") return "account"
  if (normalized === "technical") return "technical"
  if (normalized === "content") return "content"

  return normalized || "billing"
}

function getSlaDueAt(category: string, baseDate = new Date()) {
  const normalized = normalizeCategory(category)
  const due = new Date(baseDate)

  if (normalized === "billing" || normalized === "technical") {
    due.setHours(due.getHours() + 12)
    return due
  }

  due.setHours(due.getHours() + 24)
  return due
}

const publicMessageFilter = {
  NOT: {
    sender: {
      in: ["internal", "note", "admin_note"],
    },
  },
}

export async function POST(
  req: Request,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { id } = await context.params
    const ticketId = String(id ?? "").trim()

    if (!ticketId) {
      return NextResponse.json(
        { ok: false, error: "Missing ticket id." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const message = cleanString(body.message)

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 }
      )
    }

    const ticket = await prisma.support_tickets.findFirst({
      where: {
        id: ticketId,
        user_id: auth.user.id,
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found." },
        { status: 404 }
      )
    }

    if (ticket.status === "closed") {
      return NextResponse.json(
        { ok: false, error: "This ticket is closed. Please create a new ticket." },
        { status: 400 }
      )
    }

    const now = new Date()
    const nextStatus = ticket.status === "resolved" ? "open" : ticket.status || "open"
    const slaDueAt = getSlaDueAt(ticket.category, now)

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "user",
        message,
      },
    })

    await prisma.$executeRaw`
      update public.support_tickets
      set
        status = ${nextStatus},
        last_user_message_at = ${now},
        sla_due_at = ${slaDueAt},
        updated_at = ${now}
      where id = ${ticket.id}::uuid
    `

    const refreshedTicket = await prisma.support_tickets.findFirst({
      where: {
        id: ticket.id,
        user_id: auth.user.id,
      },
      include: {
        messages: {
          where: publicMessageFilter,
          orderBy: {
            created_at: "asc",
          },
        },
      },
    })

    return NextResponse.json({ ok: true, ticket: refreshedTicket })
  } catch (err: any) {
    console.error("SUPPORT TICKET USER REPLY ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to send reply." },
      { status: 500 }
    )
  }
}

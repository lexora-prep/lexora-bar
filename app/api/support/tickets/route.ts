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

function getPriority(category: string) {
  const normalized = normalizeCategory(category)

  if (normalized === "billing") return "high"
  if (normalized === "technical") return "high"

  return "normal"
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

export async function GET() {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const tickets = await prisma.support_tickets.findMany({
      where: {
        user_id: auth.user.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
      include: {
        messages: {
          where: publicMessageFilter,
          orderBy: {
            created_at: "asc",
          },
        },
      },
    })

    return NextResponse.json({ ok: true, tickets })
  } catch (err: any) {
    console.error("SUPPORT TICKETS GET ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load support tickets." },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const body = await req.json().catch(() => ({}))

    const subject = cleanString(body.subject, "Billing support request")
    const category = normalizeCategory(cleanString(body.category, "billing"))
    const message = cleanString(body.message)

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 },
      )
    }

    const email =
      auth.user.email ||
      cleanString(body.email, "unknown@lexoraprep.com")

    const now = new Date()
    const priority = getPriority(category)
    const slaDueAt = getSlaDueAt(category, now)

    const ticket = await prisma.support_tickets.create({
      data: {
        user_id: auth.user.id,
        email,
        subject,
        category,
        status: "open",
        priority,
        messages: {
          create: {
            sender: "user",
            message,
          },
        },
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

    await prisma.$executeRaw`
      update public.support_tickets
      set
        last_user_message_at = ${now},
        sla_due_at = ${slaDueAt},
        updated_at = ${now}
      where id = ${ticket.id}::uuid
    `

    const refreshedTicket = await prisma.support_tickets.findUnique({
      where: {
        id: ticket.id,
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

    return NextResponse.json({ ok: true, ticket: refreshedTicket || ticket })
  } catch (err: any) {
    console.error("SUPPORT TICKETS POST ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create support ticket." },
      { status: 500 },
    )
  }
}
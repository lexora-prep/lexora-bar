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

function normalizePriority(category: string) {
  const normalized = category.trim().toLowerCase()

  if (
    normalized === "billing" ||
    normalized === "payment" ||
    normalized === "invoice" ||
    normalized === "subscription"
  ) {
    return "high"
  }

  return "normal"
}

function getSlaDueAt(priority: string, baseDate = new Date()) {
  const normalized = priority.trim().toLowerCase()
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

    const subject = cleanString(body.subject, "Support request")
    const category = cleanString(body.category, "general")
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
    const priority = normalizePriority(category)
    const slaDueAt = getSlaDueAt(priority, now)

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

    return NextResponse.json({ ok: true, ticket })
  } catch (err: any) {
    console.error("SUPPORT TICKETS POST ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create support ticket." },
      { status: 500 },
    )
  }
}
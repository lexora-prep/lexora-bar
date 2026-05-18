import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

type AdminNotificationRow = {
  id: string
  admin_id: string
  actor_admin_id: string | null
  type: string
  title: string
  body: string
  href: string | null
  metadata: unknown
  read_at: Date | null
  created_at: Date
}

async function getCurrentAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      admin: null,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
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
    return {
      admin: null,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      ),
    }
  }

  return {
    admin: profile,
    response: null,
  }
}

function parseLimit(value: string | null) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return 20
  if (parsed < 1) return 20
  if (parsed > 50) return 50

  return Math.floor(parsed)
}

export async function GET(req: Request) {
  try {
    const auth = await getCurrentAdmin()
    if (auth.response || !auth.admin) return auth.response

    const url = new URL(req.url)
    const limit = parseLimit(url.searchParams.get("limit"))

    const rows = await prisma.$queryRaw<AdminNotificationRow[]>`
      select
        id::text,
        admin_id::text,
        actor_admin_id::text,
        type,
        title,
        body,
        href,
        metadata,
        read_at,
        created_at
      from public.admin_notifications
      where admin_id = ${auth.admin.id}::uuid
      order by created_at desc
      limit ${limit}
    `

    const unreadRows = await prisma.$queryRaw<{ unread_count: number }[]>`
      select count(*)::int as unread_count
      from public.admin_notifications
      where admin_id = ${auth.admin.id}::uuid
        and read_at is null
    `

    return NextResponse.json({
      ok: true,
      unreadCount: unreadRows[0]?.unread_count || 0,
      notifications: rows.map((row) => ({
        id: row.id,
        adminId: row.admin_id,
        actorAdminId: row.actor_admin_id,
        type: row.type,
        title: row.title,
        body: row.body,
        href: row.href,
        metadata: row.metadata,
        readAt: row.read_at ? row.read_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
      })),
    })
  } catch (err: any) {
    console.error("ADMIN NOTIFICATIONS GET ERROR:", err)

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load admin notifications.",
      },
      { status: 500 },
    )
  }
}
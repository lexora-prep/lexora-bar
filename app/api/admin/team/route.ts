import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

async function requireAdminViewer() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      is_blocked: true,
      admin_role: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { userId: user.id, adminRole: profile.admin_role || "admin" }
}

export async function GET() {
  try {
    const auth = await requireAdminViewer()
    if ("error" in auth) return auth.error

    const team = await prisma.profiles.findMany({
      where: {
        deleted_at: null,
        is_blocked: false,
        OR: [{ is_admin: true }, { role: "admin" }],
      },
      orderBy: [
        { admin_role: "asc" },
        { full_name: "asc" },
        { email: "asc" },
      ],
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        admin_role: true,
        is_admin: true,
        is_blocked: true,
        can_manage_questions: true,
        can_manage_rules: true,
        can_manage_users: true,
        can_manage_announcements: true,
        can_view_billing: true,
        can_manage_coupons: true,
        can_manage_settings: true,
        can_view_audit_log: true,
        created_at: true,
      },
    })

    return NextResponse.json({ ok: true, team })
  } catch (err: any) {
    console.error("ADMIN TEAM GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load team." },
      { status: 500 }
    )
  }
}
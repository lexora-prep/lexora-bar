import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_users: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !profile.can_manage_users ||
    profile.admin_role !== "super_admin"
  ) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { currentUserId: user.id }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Missing member id." }, { status: 400 })
    }

    const target = await prisma.profiles.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        admin_role: true,
        is_admin: true,
      },
    })

    if (!target) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 })
    }

    if (target.id === auth.currentUserId && body?.admin_role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot downgrade your own super admin account." },
        { status: 400 }
      )
    }

    const nextAdminRole = String(body?.admin_role || "user")

    const isAdminRole = ["super_admin", "admin", "editor"].includes(nextAdminRole)

    const updated = await prisma.profiles.update({
      where: { id },
      data: {
        role: isAdminRole ? "admin" : "user",
        is_admin: isAdminRole,
        admin_role: nextAdminRole,
        can_manage_questions: !!body?.can_manage_questions,
        can_manage_rules: !!body?.can_manage_rules,
        can_manage_users: !!body?.can_manage_users,
        can_manage_announcements: !!body?.can_manage_announcements,
        can_view_billing: !!body?.can_view_billing,
        can_manage_coupons: !!body?.can_manage_coupons,
        can_manage_settings: !!body?.can_manage_settings,
        can_view_audit_log: !!body?.can_view_audit_log,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        admin_role: true,
      },
    })

    return NextResponse.json({ ok: true, member: updated })
  } catch (err: any) {
    console.error("ADMIN TEAM PATCH ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to update team member." },
      { status: 500 }
    )
  }
}
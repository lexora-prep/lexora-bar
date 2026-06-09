import { prisma } from "@/lib/prisma"
import { logUserActivity } from "@/lib/user-activity"
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
      email: true,
      full_name: true,
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

  return {
    currentUserId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    adminRole: profile.admin_role,
  }
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  )
}

function getUserAgent(req: Request) {
  return req.headers.get("user-agent") || null
}

function displayName(user: {
  email: string | null
  full_name?: string | null
}) {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  if (user.email && user.email.trim()) return user.email.trim()
  return "Unknown team member"
}

const teamAuditSelect = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  admin_role: true,
  is_admin: true,
  can_manage_questions: true,
  can_manage_rules: true,
  can_manage_users: true,
  can_manage_announcements: true,
  can_view_billing: true,
  can_manage_coupons: true,
  can_manage_settings: true,
  can_view_audit_log: true,
}

function auditState(user: {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  admin_role: string | null
  is_admin: boolean | null
  can_manage_questions: boolean | null
  can_manage_rules: boolean | null
  can_manage_users: boolean | null
  can_manage_announcements: boolean | null
  can_view_billing: boolean | null
  can_manage_coupons: boolean | null
  can_manage_settings: boolean | null
  can_view_audit_log: boolean | null
}) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    admin_role: user.admin_role,
    is_admin: user.is_admin,
    permissions: {
      can_manage_questions: user.can_manage_questions,
      can_manage_rules: user.can_manage_rules,
      can_manage_users: user.can_manage_users,
      can_manage_announcements: user.can_manage_announcements,
      can_view_billing: user.can_view_billing,
      can_manage_coupons: user.can_manage_coupons,
      can_manage_settings: user.can_manage_settings,
      can_view_audit_log: user.can_view_audit_log,
    },
  }
}

function changedFields(
  before: ReturnType<typeof auditState>,
  after: ReturnType<typeof auditState>
) {
  const changed: string[] = []

  if (before.role !== after.role) changed.push("role")
  if (before.admin_role !== after.admin_role) changed.push("admin_role")
  if (before.is_admin !== after.is_admin) changed.push("is_admin")

  for (const key of Object.keys(before.permissions) as Array<
    keyof typeof before.permissions
  >) {
    if (before.permissions[key] !== after.permissions[key]) {
      changed.push(key)
    }
  }

  return changed
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
      select: teamAuditSelect,
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
      select: teamAuditSelect,
    })

    const beforeState = auditState(target)
    const afterState = auditState(updated)
    const changed = changedFields(beforeState, afterState)
    const targetName = displayName(updated)

    await logUserActivity({
      userId: updated.id,
      actorUserId: auth.currentUserId,
      action: "admin.team_member_updated",
      entityType: "profile",
      entityId: updated.id,
      title: "Updated team member permissions",
      body: `${targetName}'s admin role or permissions were updated.`,
      metadata: {
        actor: {
          id: auth.currentUserId,
          email: auth.email,
          full_name: auth.fullName,
          admin_role: auth.adminRole,
        },
        target: {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
        },
        changed_fields: changed,
        before: beforeState,
        after: afterState,
      },
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({
      ok: true,
      member: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        admin_role: updated.admin_role,
      },
    })
  } catch (err: any) {
    console.error("ADMIN TEAM PATCH ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to update team member." },
      { status: 500 }
    )
  }
}
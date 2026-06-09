import { prisma } from "@/lib/prisma"
import { logUserActivity } from "@/lib/user-activity"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    }
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

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  if (!profile.can_manage_users && profile.admin_role !== "super_admin") {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    adminRole: profile.admin_role,
  }
}

function daysBetween(from: Date, to: Date) {
  const diff = to.getTime() - from.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function isOnline(lastActiveAt: Date | null) {
  if (!lastActiveAt) return false

  const diffMs = Date.now() - lastActiveAt.getTime()
  return diffMs <= 2 * 60 * 1000
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
  full_name: string | null
}) {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  if (user.email && user.email.trim()) return user.email.trim()
  return "Unknown user"
}

function actionLabel(action: string) {
  if (action === "block") return "Blocked user"
  if (action === "unblock") return "Unblocked user"
  if (action === "make_admin") return "Granted admin access"
  if (action === "remove_admin") return "Removed admin access"
  return "Updated user"
}

function auditActionName(action: string) {
  if (action === "block") return "admin.user_blocked"
  if (action === "unblock") return "admin.user_unblocked"
  if (action === "make_admin") return "admin.user_admin_granted"
  if (action === "remove_admin") return "admin.user_admin_removed"
  return "admin.user_updated"
}

function auditBody(action: string, targetName: string) {
  if (action === "block") return `${targetName} was blocked from accessing the platform.`
  if (action === "unblock") return `${targetName} was unblocked and can access the platform again.`
  if (action === "make_admin") return `${targetName} was granted admin access.`
  if (action === "remove_admin") return `${targetName} had admin access removed.`
  return `${targetName} was updated by an admin.`
}

function auditState(user: {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  admin_role: string | null
  is_admin: boolean | null
  is_blocked: boolean | null
  can_manage_questions: boolean | null
  can_manage_rules: boolean | null
  can_manage_users: boolean | null
  can_manage_announcements: boolean | null
  can_view_billing: boolean | null
  can_manage_coupons: boolean | null
  can_manage_settings: boolean | null
  can_view_audit_log: boolean | null
  can_manage_workspace_members: boolean | null
  can_create_workspace_channels: boolean | null
  can_manage_workspace_channels: boolean | null
  can_manage_hidden_channels: boolean | null
  can_manage_workspace_notes: boolean | null
  can_create_shared_notes: boolean | null
  can_create_workspace_polls: boolean | null
  can_send_workspace_wake_alerts: boolean | null
  can_view_workspace_member_details: boolean | null
  can_manage_all_workspace: boolean | null
}) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    admin_role: user.admin_role,
    is_admin: user.is_admin,
    is_blocked: user.is_blocked,
    permissions: {
      can_manage_questions: user.can_manage_questions,
      can_manage_rules: user.can_manage_rules,
      can_manage_users: user.can_manage_users,
      can_manage_announcements: user.can_manage_announcements,
      can_view_billing: user.can_view_billing,
      can_manage_coupons: user.can_manage_coupons,
      can_manage_settings: user.can_manage_settings,
      can_view_audit_log: user.can_view_audit_log,
      can_manage_workspace_members: user.can_manage_workspace_members,
      can_create_workspace_channels: user.can_create_workspace_channels,
      can_manage_workspace_channels: user.can_manage_workspace_channels,
      can_manage_hidden_channels: user.can_manage_hidden_channels,
      can_manage_workspace_notes: user.can_manage_workspace_notes,
      can_create_shared_notes: user.can_create_shared_notes,
      can_create_workspace_polls: user.can_create_workspace_polls,
      can_send_workspace_wake_alerts: user.can_send_workspace_wake_alerts,
      can_view_workspace_member_details: user.can_view_workspace_member_details,
      can_manage_all_workspace: user.can_manage_all_workspace,
    },
  }
}

const auditSelect = {
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
  can_manage_workspace_members: true,
  can_create_workspace_channels: true,
  can_manage_workspace_channels: true,
  can_manage_hidden_channels: true,
  can_manage_workspace_notes: true,
  can_create_shared_notes: true,
  can_create_workspace_polls: true,
  can_send_workspace_wake_alerts: true,
  can_view_workspace_member_details: true,
  can_manage_all_workspace: true,
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if ("error" in admin) return admin.error

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing user id." },
        { status: 400 }
      )
    }

    const user = await prisma.profiles.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        law_school: true,
        jurisdiction: true,
        exam_month: true,
        exam_year: true,
        phone_number: true,

        subscription_tier: true,
        role: true,
        admin_role: true,
        is_admin: true,
        is_blocked: true,

        paddle_customer_id: true,
        paddle_subscription_id: true,
        paddle_transaction_id: true,
        paddle_price_id: true,
        billing_status: true,
        billing_currency: true,
        billing_amount_cents: true,
        billing_tax_cents: true,
        billing_total_cents: true,
        billing_interval: true,
        billing_started_at: true,
        billing_period_starts_at: true,
        billing_period_ends_at: true,
        billing_cancelled_at: true,
        billing_last_paid_at: true,
        billing_discount_id: true,
        billing_discount_code: true,
        billing_discount_amount: true,
        billing_invoice_url: true,

        email_announcements: true,
        study_reminders: true,
        sound_effects: true,
        compact_mode: true,

        pending_deletion: true,
        deletion_requested_at: true,
        deleted_at: true,

        workspace_status: true,
        last_login_at: true,
        last_active_at: true,
        last_ip_address: true,
        last_country: true,
        last_region: true,
        last_city: true,
        last_timezone: true,
        last_latitude: true,
        last_longitude: true,
        last_user_agent: true,
        last_activity_source: true,

        can_manage_questions: true,
        can_manage_rules: true,
        can_manage_users: true,
        can_manage_announcements: true,
        can_view_billing: true,
        can_manage_coupons: true,
        can_manage_settings: true,
        can_view_audit_log: true,

        can_manage_workspace_members: true,
        can_create_workspace_channels: true,
        can_manage_workspace_channels: true,
        can_manage_hidden_channels: true,
        can_manage_workspace_notes: true,
        can_create_shared_notes: true,
        can_create_workspace_polls: true,
        can_send_workspace_wake_alerts: true,
        can_view_workspace_member_details: true,
        can_manage_all_workspace: true,

        created_at: true,
        updated_at: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 }
      )
    }

    const now = new Date()

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        account_age_days: daysBetween(new Date(user.created_at), now),
        is_online: isOnline(user.last_active_at),
      },
    })
  } catch (err: any) {
    console.error("ADMIN USER GET ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load user." },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if ("error" in admin) return admin.error

    const { id } = await context.params
    const body = await req.json()
    const action = String(body?.action || "")

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing user id." },
        { status: 400 }
      )
    }

    if (id === admin.userId && (action === "block" || action === "remove_admin")) {
      return NextResponse.json(
        {
          ok: false,
          error: "You cannot perform that action on your own admin account.",
        },
        { status: 400 }
      )
    }

    const existing = await prisma.profiles.findUnique({
      where: { id },
      select: auditSelect,
    })

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 }
      )
    }

    let updated

    if (action === "block") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_blocked: true,
          updated_at: new Date(),
        },
        select: auditSelect,
      })
    } else if (action === "unblock") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_blocked: false,
          updated_at: new Date(),
        },
        select: auditSelect,
      })
    } else if (action === "make_admin") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_admin: true,
          role: "admin",
          updated_at: new Date(),
        },
        select: auditSelect,
      })
    } else if (action === "remove_admin") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_admin: false,
          role: "user",
          admin_role: "user",
          can_manage_questions: false,
          can_manage_rules: false,
          can_manage_users: false,
          can_manage_announcements: false,
          can_view_billing: false,
          can_manage_coupons: false,
          can_manage_settings: false,
          can_view_audit_log: false,
          can_manage_workspace_members: false,
          can_create_workspace_channels: false,
          can_manage_workspace_channels: false,
          can_manage_hidden_channels: false,
          can_manage_workspace_notes: false,
          can_create_shared_notes: false,
          can_create_workspace_polls: false,
          can_send_workspace_wake_alerts: false,
          can_view_workspace_member_details: false,
          can_manage_all_workspace: false,
          updated_at: new Date(),
        },
        select: auditSelect,
      })
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid action." },
        { status: 400 }
      )
    }

    const targetName = displayName(updated)

    await logUserActivity({
      userId: updated.id,
      actorUserId: admin.userId,
      action: auditActionName(action),
      entityType: "profile",
      entityId: updated.id,
      title: actionLabel(action),
      body: auditBody(action, targetName),
      metadata: {
        action,
        actor: {
          id: admin.userId,
          email: admin.email,
          full_name: admin.fullName,
          admin_role: admin.adminRole,
        },
        target: {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
        },
        before: auditState(existing),
        after: auditState(updated),
      },
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (err: any) {
    console.error("ADMIN USER PATCH ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update user." },
      { status: 500 }
    )
  }
}
import { prisma } from "@/lib/prisma"
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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

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
    if (admin.error) return admin.error

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
      })
    } else if (action === "unblock") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_blocked: false,
          updated_at: new Date(),
        },
      })
    } else if (action === "make_admin") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_admin: true,
          role: "admin",
          updated_at: new Date(),
        },
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
      })
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid action." },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, user: updated })
  } catch (err: any) {
    console.error("ADMIN USER PATCH ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update user." },
      { status: 500 }
    )
  }
}

import { prisma } from "@/lib/prisma"

export type AdminNotificationSeverity =
  | "normal"
  | "info"
  | "success"
  | "warning"
  | "urgent"

export type AdminNotificationType =
  | "support_assignment"
  | "support_reply"
  | "support_new_ticket"
  | "rule_report"
  | "rule_report_update"
  | "admin_announcement"
  | "team_message"
  | "team_mention"
  | "billing_issue"
  | "system_alert"

export type CreateAdminNotificationInput = {
  adminId: string
  actorAdminId?: string | null
  type: AdminNotificationType | string
  title: string
  body: string
  href?: string | null
  severity?: AdminNotificationSeverity
  metadata?: Record<string, unknown> | null
}

export type CreateManyAdminNotificationsInput = {
  adminIds: string[]
  actorAdminId?: string | null
  type: AdminNotificationType | string
  title: string
  body: string
  href?: string | null
  severity?: AdminNotificationSeverity
  metadata?: Record<string, unknown> | null
  excludeActor?: boolean
}

function cleanText(value: string | null | undefined, fallback: string) {
  const cleaned = String(value || "").trim()
  return cleaned || fallback
}

function normalizeSeverity(
  value: AdminNotificationSeverity | undefined,
): AdminNotificationSeverity {
  if (
    value === "normal" ||
    value === "info" ||
    value === "success" ||
    value === "warning" ||
    value === "urgent"
  ) {
    return value
  }

  return "normal"
}

function uniqueIds(ids: string[]) {
  return Array.from(
    new Set(
      ids
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  )
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput,
) {
  const adminId = String(input.adminId || "").trim()

  if (!adminId) {
    return {
      ok: false,
      skipped: true,
      reason: "Missing adminId",
    }
  }

  const actorAdminId = input.actorAdminId
    ? String(input.actorAdminId).trim()
    : null

  const type = cleanText(input.type, "system_alert")
  const title = cleanText(input.title, "Notification")
  const body = cleanText(input.body, "You have a new admin notification.")
  const href = input.href ? String(input.href).trim() : null
  const severity = normalizeSeverity(input.severity)
  const metadata = input.metadata || {}

  await prisma.$executeRaw`
    insert into public.admin_notifications (
      admin_id,
      actor_admin_id,
      type,
      title,
      body,
      href,
      metadata,
      severity,
      read_at,
      created_at
    )
    values (
      ${adminId}::uuid,
      ${actorAdminId}::uuid,
      ${type},
      ${title},
      ${body},
      ${href},
      ${JSON.stringify(metadata)}::jsonb,
      ${severity},
      null,
      now()
    )
  `

  return {
    ok: true,
    skipped: false,
  }
}

export async function createManyAdminNotifications(
  input: CreateManyAdminNotificationsInput,
) {
  const actorAdminId = input.actorAdminId
    ? String(input.actorAdminId).trim()
    : null

  const targetAdminIds = uniqueIds(input.adminIds).filter((adminId) => {
    if (!input.excludeActor) return true
    return adminId !== actorAdminId
  })

  if (targetAdminIds.length === 0) {
    return {
      ok: true,
      created: 0,
      skipped: true,
      reason: "No target admins",
    }
  }

  const type = cleanText(input.type, "system_alert")
  const title = cleanText(input.title, "Notification")
  const body = cleanText(input.body, "You have a new admin notification.")
  const href = input.href ? String(input.href).trim() : null
  const severity = normalizeSeverity(input.severity)
  const metadata = input.metadata || {}

  await prisma.$executeRaw`
    insert into public.admin_notifications (
      admin_id,
      actor_admin_id,
      type,
      title,
      body,
      href,
      metadata,
      severity,
      read_at,
      created_at
    )
    select
      target_admin_id::uuid,
      ${actorAdminId}::uuid,
      ${type},
      ${title},
      ${body},
      ${href},
      ${JSON.stringify(metadata)}::jsonb,
      ${severity},
      null,
      now()
    from unnest(${targetAdminIds}::uuid[]) as target_admin_id
  `

  return {
    ok: true,
    created: targetAdminIds.length,
    skipped: false,
  }
}

export async function getActiveAdminIds(options?: {
  includeSuperAdminsOnly?: boolean
  excludeAdminId?: string | null
}) {
  const rows = await prisma.profiles.findMany({
    where: {
      deleted_at: null,
      is_blocked: false,
      OR: [{ is_admin: true }, { role: "admin" }],
      ...(options?.includeSuperAdminsOnly
        ? {
            admin_role: "super_admin",
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  return rows
    .map((row) => row.id)
    .filter((id) => id !== options?.excludeAdminId)
}

import { prisma } from "@/lib/prisma"

export type AdminNotificationSeverity = "low" | "normal" | "high" | "critical"

export type AdminNotificationType =
  | "support_assignment"
  | "support_reply"
  | "support_escalation"
  | "rule_report"
  | "question_report"
  | "typo_report"
  | "billing_alert"
  | "payment_failure"
  | "workspace_message"
  | "workspace_mention"
  | "admin_announcement"
  | "team_update"
  | "system_alert"
  | "security_alert"

type AdminNotificationInput = {
  adminId: string
  actorAdminId?: string | null
  type: AdminNotificationType | string
  title: string
  body: string
  href?: string | null
  metadata?: Record<string, unknown>
  severity?: AdminNotificationSeverity
}

type AdminRecipientQueryOptions = {
  canManageQuestions?: boolean
  canManageRules?: boolean
  canManageUsers?: boolean
  canManageAnnouncements?: boolean
  canViewBilling?: boolean
  canManageSettings?: boolean
  canViewAuditLog?: boolean
  includeSuperAdmins?: boolean
}

function normalizeSeverity(value: string | null | undefined): AdminNotificationSeverity {
  if (value === "low") return "low"
  if (value === "high") return "high"
  if (value === "critical") return "critical"

  return "normal"
}

function cleanString(value: string | null | undefined, fallback = "") {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export async function createAdminNotification(input: AdminNotificationInput) {
  const adminId = cleanString(input.adminId)
  const type = cleanString(input.type, "system_alert")
  const title = cleanString(input.title, "Notification")
  const body = cleanString(input.body)
  const href = cleanString(input.href || null, "") || null
  const actorAdminId = cleanString(input.actorAdminId || null, "") || null
  const severity = normalizeSeverity(input.severity)
  const metadata = input.metadata || {}

  if (!adminId || !body) {
    return null
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>`
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
      ${metadata}::jsonb,
      ${severity},
      null,
      now()
    )
    returning id::text
  `

  return rows[0] || null
}

export async function createAdminNotifications(inputs: AdminNotificationInput[]) {
  const validInputs = inputs.filter((input) => cleanString(input.adminId) && cleanString(input.body))

  if (validInputs.length === 0) return []

  const results = []

  for (const input of validInputs) {
    const result = await createAdminNotification(input)
    if (result) results.push(result)
  }

  return results
}

export async function getAdminRecipientIds(options: AdminRecipientQueryOptions) {
  const includeSuperAdmins = options.includeSuperAdmins !== false

  const rows = await prisma.profiles.findMany({
    where: {
      deleted_at: null,
      is_blocked: false,
      OR: [
        ...(includeSuperAdmins ? [{ admin_role: "super_admin" }] : []),
        { is_admin: true },
        { role: "admin" },
      ],
    },
    select: {
      id: true,
      admin_role: true,
      can_manage_questions: true,
      can_manage_rules: true,
      can_manage_users: true,
      can_manage_announcements: true,
      can_view_billing: true,
      can_manage_settings: true,
      can_view_audit_log: true,
    },
  })

  return uniqueStrings(
    rows
      .filter((row) => {
        if (includeSuperAdmins && row.admin_role === "super_admin") return true
        if (options.canManageQuestions && row.can_manage_questions) return true
        if (options.canManageRules && row.can_manage_rules) return true
        if (options.canManageUsers && row.can_manage_users) return true
        if (options.canManageAnnouncements && row.can_manage_announcements) return true
        if (options.canViewBilling && row.can_view_billing) return true
        if (options.canManageSettings && row.can_manage_settings) return true
        if (options.canViewAuditLog && row.can_view_audit_log) return true

        return false
      })
      .map((row) => row.id),
  )
}

export async function notifyAdminsByPermission(
  options: AdminRecipientQueryOptions,
  notification: Omit<AdminNotificationInput, "adminId">,
) {
  const recipientIds = await getAdminRecipientIds(options)

  return createAdminNotifications(
    recipientIds.map((adminId) => ({
      ...notification,
      adminId,
    })),
  )
}

export function buildSupportAssignmentNotification({
  ticketId,
  ticketSubject,
  ticketStatus,
  assignedByAdminId,
  assignedByName,
  assignedToAdminId,
  assignedToName,
}: {
  ticketId: string
  ticketSubject: string
  ticketStatus: string
  assignedByAdminId: string
  assignedByName: string
  assignedToAdminId: string
  assignedToName: string
}): AdminNotificationInput {
  return {
    adminId: assignedToAdminId,
    actorAdminId: assignedByAdminId,
    type: "support_assignment",
    title: "New support ticket assignment",
    body: `${assignedByName} assigned you: ${ticketSubject}`,
    href: `/admin/support?ticket=${ticketId}`,
    severity: "high",
    metadata: {
      ticketId,
      ticketStatus,
      ticketSubject,
      assignedByName,
      assignedToName,
      assignedByAdminId,
      assignedToAdminId,
    },
  }
}

export function buildRuleReportNotification({
  reportId,
  ruleId,
  title,
  reporterEmail,
  issueType,
}: {
  reportId: string
  ruleId: string
  title: string
  reporterEmail: string
  issueType: string
}): Omit<AdminNotificationInput, "adminId"> {
  return {
    actorAdminId: null,
    type: "rule_report",
    title: "New rule report",
    body: `${reporterEmail || "A user"} reported ${issueType || "an issue"}: ${title}`,
    href: `/admin/reported-rules?report=${reportId}`,
    severity: "normal",
    metadata: {
      reportId,
      ruleId,
      title,
      reporterEmail,
      issueType,
    },
  }
}

export function buildQuestionReportNotification({
  reportId,
  questionId,
  title,
  reporterEmail,
  issueType,
}: {
  reportId: string
  questionId: string
  title: string
  reporterEmail: string
  issueType: string
}): Omit<AdminNotificationInput, "adminId"> {
  return {
    actorAdminId: null,
    type: "question_report",
    title: "New question report",
    body: `${reporterEmail || "A user"} reported ${issueType || "an issue"}: ${title}`,
    href: `/admin/reported-questions?report=${reportId}`,
    severity: "normal",
    metadata: {
      reportId,
      questionId,
      title,
      reporterEmail,
      issueType,
    },
  }
}

export function buildAdminAnnouncementNotification({
  announcementId,
  actorAdminId,
  actorName,
  title,
  important = false,
}: {
  announcementId: string
  actorAdminId: string
  actorName: string
  title: string
  important?: boolean
}): Omit<AdminNotificationInput, "adminId"> {
  return {
    actorAdminId,
    type: "admin_announcement",
    title: important ? "Important admin announcement" : "Admin announcement",
    body: `${actorName} posted: ${title}`,
    href: `/admin/announcements?announcement=${announcementId}`,
    severity: important ? "high" : "normal",
    metadata: {
      announcementId,
      actorName,
      title,
      important,
    },
  }
}

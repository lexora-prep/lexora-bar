import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

type AuditCategory =
  | "all"
  | "auth"
  | "admin"
  | "user"
  | "billing"
  | "content"
  | "support"
  | "workspace"
  | "system"

type AuditSeverity = "all" | "low" | "normal" | "high" | "critical"
type ActorType = "all" | "admin" | "user" | "system"
type IpFilter = "all" | "present" | "missing"

const MAX_LOOKBACK_ROWS = 2500
const DEFAULT_LIMIT = 75
const MAX_LIMIT = 250

type ProfileLookup = {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  role: string
  admin_role: string | null
}

type AuditEvent = {
  id: string
  createdAt: string
  createdAtLabel: string
  timeLabel: string
  action: string
  actionLabel: string
  category: Exclude<AuditCategory, "all">
  severity: Exclude<AuditSeverity, "all">
  riskScore: number
  actorId: string | null
  actorName: string
  actorEmail: string
  actorType: Exclude<ActorType, "all">
  userId: string
  userName: string
  userEmail: string
  entityType: string
  entityId: string
  title: string
  detail: string
  ipAddress: string
  userAgent: string
  metadata: unknown
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : fallback
}

function normalizeLower(value: unknown, fallback = "all") {
  const text = String(value ?? "").trim().toLowerCase()
  return text.length > 0 ? text : fallback
}

function parseLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(25, Math.floor(parsed)))
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function getDateWhere(range: string, startDate: string | null, endDate: string | null) {
  const cleanRange = normalizeLower(range, "7d")
  const customStart = parseDate(startDate, false)
  const customEnd = parseDate(endDate, true)

  if (cleanRange === "custom") {
    if (customStart && customEnd) {
      return { gte: customStart, lte: customEnd }
    }

    if (customStart) {
      return { gte: customStart }
    }

    if (customEnd) {
      return { lte: customEnd }
    }

    return undefined
  }

  if (cleanRange === "all") return undefined

  const now = new Date()
  const date = new Date(now)

  if (cleanRange === "24h") date.setHours(date.getHours() - 24)
  else if (cleanRange === "7d") date.setDate(date.getDate() - 7)
  else if (cleanRange === "10d") date.setDate(date.getDate() - 10)
  else if (cleanRange === "30d") date.setDate(date.getDate() - 30)
  else if (cleanRange === "90d") date.setDate(date.getDate() - 90)
  else date.setDate(date.getDate() - 7)

  return { gte: date }
}

function metadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function metadataString(value: unknown, keys: string[]) {
  const metadata = metadataObject(value)

  for (const key of keys) {
    const item = metadata[key]
    if (item !== null && item !== undefined && String(item).trim()) {
      return String(item).trim()
    }
  }

  return ""
}

function metadataIdentity(value: unknown) {
  const email = metadataString(value, [
    "email",
    "userEmail",
    "targetEmail",
    "relatedUserEmail",
    "actorEmail",
    "adminEmail",
    "customerEmail",
  ])

  const name = metadataString(value, [
    "fullName",
    "full_name",
    "userName",
    "targetName",
    "actorName",
    "adminName",
    "customerName",
  ])

  return { email, name }
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

function deriveCategory(action: string, entityType?: string | null): Exclude<AuditCategory, "all"> {
  const value = `${action} ${entityType ?? ""}`.toLowerCase()

  if (value.includes("auth") || value.includes("login") || value.includes("session")) return "auth"

  if (
    value.includes("admin") ||
    value.includes("permission") ||
    value.includes("role") ||
    value.includes("team")
  ) {
    return "admin"
  }

  if (
    value.includes("billing") ||
    value.includes("payment") ||
    value.includes("paddle") ||
    value.includes("subscription") ||
    value.includes("coupon")
  ) {
    return "billing"
  }

  if (
    value.includes("rule") ||
    value.includes("question") ||
    value.includes("announcement") ||
    value.includes("note") ||
    value.includes("content")
  ) {
    return "content"
  }

  if (value.includes("support") || value.includes("ticket")) return "support"

  if (
    value.includes("workspace") ||
    value.includes("channel") ||
    value.includes("message") ||
    value.includes("dm")
  ) {
    return "workspace"
  }

  if (value.includes("system") || value.includes("webhook") || value.includes("background")) {
    return "system"
  }

  return "user"
}

function deriveSeverity(action: string, entityType?: string | null): Exclude<AuditSeverity, "all"> {
  const value = `${action} ${entityType ?? ""}`.toLowerCase()

  if (
    value.includes("delete") ||
    value.includes("remove_admin") ||
    value.includes("downgrade") ||
    value.includes("purge") ||
    value.includes("service_role")
  ) {
    return "critical"
  }

  if (
    value.includes("block") ||
    value.includes("unblock") ||
    value.includes("admin") ||
    value.includes("permission") ||
    value.includes("role") ||
    value.includes("billing") ||
    value.includes("payment") ||
    value.includes("webhook")
  ) {
    return "high"
  }

  if (
    value.includes("create") ||
    value.includes("update") ||
    value.includes("edit") ||
    value.includes("publish") ||
    value.includes("import")
  ) {
    return "normal"
  }

  return "low"
}

function riskScore(severity: Exclude<AuditSeverity, "all">, action: string) {
  let score = 10

  if (severity === "critical") score = 90
  else if (severity === "high") score = 65
  else if (severity === "normal") score = 28

  const lowered = action.toLowerCase()

  if (lowered.includes("delete")) score += 6
  if (lowered.includes("block")) score += 5
  if (lowered.includes("admin")) score += 8
  if (lowered.includes("permission")) score += 8
  if (lowered.includes("billing")) score += 5

  return Math.min(99, Math.max(1, score))
}

function formatAction(action: string) {
  return cleanText(action, "activity.logged")
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
}

function actorTypeFor(profile: ProfileLookup | undefined | null): Exclude<ActorType, "all"> {
  if (!profile) return "system"
  if (profile.is_admin || profile.role === "admin" || profile.admin_role) return "admin"
  return "user"
}

function profileName(profile: ProfileLookup | undefined | null, fallback: string) {
  if (!profile) return fallback
  if (profile.full_name?.trim()) return profile.full_name.trim()
  return profile.email.split("@")[0] || fallback
}

function matchesSearch(row: AuditEvent, search: string) {
  if (!search) return true

  const haystack = [
    row.id,
    row.createdAt,
    row.action,
    row.actionLabel,
    row.category,
    row.severity,
    row.actorId,
    row.actorName,
    row.actorEmail,
    row.actorType,
    row.userId,
    row.userName,
    row.userEmail,
    row.entityType,
    row.entityId,
    row.title,
    row.detail,
    row.ipAddress,
    row.userAgent,
    safeJson(row.metadata),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.toLowerCase())
}

function csvCell(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows: AuditEvent[]) {
  const header = [
    "time",
    "severity",
    "risk_score",
    "category",
    "actor",
    "actor_email",
    "actor_type",
    "related_user",
    "related_user_email",
    "action",
    "entity_type",
    "entity_id",
    "title",
    "detail",
    "ip_address",
    "user_agent",
    "event_id",
    "metadata",
  ]

  const body = rows.map((row) =>
    [
      row.createdAt,
      row.severity,
      row.riskScore,
      row.category,
      row.actorName,
      row.actorEmail,
      row.actorType,
      row.userName,
      row.userEmail,
      row.actionLabel,
      row.entityType,
      row.entityId,
      row.title,
      row.detail,
      row.ipAddress,
      row.userAgent,
      row.id,
      safeJson(row.metadata),
    ]
      .map(csvCell)
      .join(",")
  )

  return [header.join(","), ...body].join("\n")
}

function chartBucketKey(date: Date, range: string) {
  const cleanRange = normalizeLower(range, "7d")

  if (cleanRange === "24h") {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(date)
}

async function requireAuditViewer() {
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
      can_view_audit_log: true,
    },
  })

  const canViewAudit =
    profile?.admin_role === "super_admin" || !!profile?.can_view_audit_log

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canViewAudit
  ) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  return { userId: user.id }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuditViewer()
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(req.url)

    const search = cleanText(searchParams.get("search"))
    const category = normalizeLower(searchParams.get("category"), "all") as AuditCategory
    const severity = normalizeLower(searchParams.get("severity"), "all") as AuditSeverity
    const actorType = normalizeLower(searchParams.get("actorType"), "all") as ActorType
    const actorId = cleanText(searchParams.get("actorId"))
    const ipFilter = normalizeLower(searchParams.get("ip"), "all") as IpFilter
    const entity = cleanText(searchParams.get("entity"))
    const range = normalizeLower(searchParams.get("range"), "7d")
    const startDate = cleanText(searchParams.get("startDate"))
    const endDate = cleanText(searchParams.get("endDate"))
    const limit = parseLimit(searchParams.get("limit"))
    const format = normalizeLower(searchParams.get("format"), "json")
    const dateWhere = getDateWhere(range, startDate, endDate)

    const logs = await prisma.user_activity_logs.findMany({
      where: dateWhere ? { created_at: dateWhere } : {},
      orderBy: { created_at: "desc" },
      take: MAX_LOOKBACK_ROWS,
      select: {
        id: true,
        user_id: true,
        actor_user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        title: true,
        body: true,
        metadata: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    })

    const profileIds = Array.from(
      new Set(
        logs
          .flatMap((log) => [log.user_id, log.actor_user_id])
          .filter((id): id is string => Boolean(id))
      )
    )

    const profiles =
      profileIds.length > 0
        ? await prisma.profiles.findMany({
            where: { id: { in: profileIds } },
            select: {
              id: true,
              email: true,
              full_name: true,
              is_admin: true,
              role: true,
              admin_role: true,
            },
          })
        : []

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

    const rows: AuditEvent[] = logs.map((log) => {
      const relatedProfile = profileMap.get(log.user_id)
      const actorProfile = log.actor_user_id ? profileMap.get(log.actor_user_id) : relatedProfile
      const identity = metadataIdentity(log.metadata)

      const action = cleanText(log.action, "activity.logged")
      const entityType = cleanText(log.entity_type, "activity")
      const categoryValue = deriveCategory(action, entityType)
      const severityValue = deriveSeverity(action, entityType)

      const userEmail = relatedProfile?.email || identity.email || ""
      const userName = profileName(
        relatedProfile,
        identity.name || userEmail || "Unknown user"
      )

      const actorName = profileName(
        actorProfile,
        identity.name || userName || (log.actor_user_id ? "Unknown admin" : "System")
      )

      return {
        id: log.id,
        createdAt: log.created_at.toISOString(),
        createdAtLabel: formatDateTime(log.created_at),
        timeLabel: formatTime(log.created_at),
        action,
        actionLabel: formatAction(action),
        category: categoryValue,
        severity: severityValue,
        riskScore: riskScore(severityValue, action),
        actorId: log.actor_user_id ?? log.user_id ?? null,
        actorName,
        actorEmail: actorProfile?.email || identity.email || "",
        actorType: actorTypeFor(actorProfile),
        userId: log.user_id,
        userName,
        userEmail,
        entityType,
        entityId: cleanText(log.entity_id),
        title: cleanText(log.title),
        detail:
          cleanText(log.body) ||
          cleanText(log.title) ||
          (userEmail ? `Related user: ${userEmail}` : "No additional detail."),
        ipAddress: cleanText(log.ip_address),
        userAgent: cleanText(log.user_agent),
        metadata: log.metadata ?? {},
      }
    })

    const actorOptions = Array.from(
      new Map(
        rows.map((row) => [
          row.actorId || row.actorName,
          {
            id: row.actorId || row.actorName,
            name: row.actorName,
            email: row.actorEmail,
            label: row.actorEmail ? `${row.actorName} · ${row.actorEmail}` : row.actorName,
            actorType: row.actorType,
          },
        ])
      ).values()
    )
      .filter((actor) => actor.name !== "Unknown user")
      .sort((a, b) => a.label.localeCompare(b.label))

    const entityOptions = Array.from(
      new Set(rows.map((row) => row.entityType).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))

    const filteredRows = rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false
      if (severity !== "all" && row.severity !== severity) return false
      if (actorType !== "all" && row.actorType !== actorType) return false
      if (actorId && row.actorId !== actorId && row.actorName !== actorId) return false
      if (ipFilter === "present" && !row.ipAddress) return false
      if (ipFilter === "missing" && row.ipAddress) return false
      if (entity && row.entityType !== entity) return false
      if (!matchesSearch(row, search)) return false
      return true
    })

    const summary = {
      total: filteredRows.length,
      critical: filteredRows.filter((row) => row.severity === "critical").length,
      high: filteredRows.filter((row) => row.severity === "high").length,
      uniqueActors: new Set(filteredRows.map((row) => row.actorId || row.actorName)).size,
      uniqueIps: new Set(filteredRows.map((row) => row.ipAddress).filter(Boolean)).size,
      latestEventAt: filteredRows[0]?.createdAt ?? null,
      averageRisk:
        filteredRows.length === 0
          ? 0
          : Math.round(
              filteredRows.reduce((sum, row) => sum + row.riskScore, 0) /
                filteredRows.length
            ),
    }

    const chartMap = new Map<
      string,
      { label: string; total: number; critical: number; high: number; normal: number; low: number }
    >()

    for (const row of filteredRows) {
      const label = chartBucketKey(new Date(row.createdAt), range)
      const existing =
        chartMap.get(label) ??
        {
          label,
          total: 0,
          critical: 0,
          high: 0,
          normal: 0,
          low: 0,
        }

      existing.total += 1
      existing[row.severity] += 1
      chartMap.set(label, existing)
    }

    const chart = Array.from(chartMap.values()).reverse().slice(-18)

    if (format === "csv") {
      const csv = toCsv(filteredRows)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lexora-audit-log-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      summary,
      chart,
      events: filteredRows.slice(0, limit),
      totalMatched: filteredRows.length,
      returned: Math.min(filteredRows.length, limit),
      maxLookbackRows: MAX_LOOKBACK_ROWS,
      filters: {
        actors: actorOptions,
        entities: entityOptions,
      },
    })
  } catch (error: any) {
    console.error("ADMIN AUDIT LOG ERROR:", error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load audit log.",
      },
      { status: 500 }
    )
  }
}

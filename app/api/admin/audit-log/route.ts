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

const MAX_LOOKBACK_ROWS = 1500
const MAX_RESULT_LIMIT = 250
const DEFAULT_LIMIT = 100

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
  return Math.min(MAX_RESULT_LIMIT, Math.max(25, Math.floor(parsed)))
}

function getDateStart(value: string | null) {
  const range = normalizeLower(value, "7d")
  const now = new Date()

  if (range === "24h") {
    const date = new Date(now)
    date.setHours(date.getHours() - 24)
    return date
  }

  if (range === "7d") {
    const date = new Date(now)
    date.setDate(date.getDate() - 7)
    return date
  }

  if (range === "30d") {
    const date = new Date(now)
    date.setDate(date.getDate() - 30)
    return date
  }

  if (range === "90d") {
    const date = new Date(now)
    date.setDate(date.getDate() - 90)
    return date
  }

  return null
}

function deriveCategory(action: string, entityType?: string | null): AuditCategory {
  const value = `${action} ${entityType ?? ""}`.toLowerCase()

  if (value.includes("auth") || value.includes("login") || value.includes("session")) {
    return "auth"
  }

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

  if (value.includes("support") || value.includes("ticket")) {
    return "support"
  }

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

function deriveSeverity(action: string, entityType?: string | null) {
  const value = `${action} ${entityType ?? ""}`.toLowerCase()

  if (
    value.includes("delete") ||
    value.includes("remove_admin") ||
    value.includes("downgrade") ||
    value.includes("purge") ||
    value.includes("service_role") ||
    value.includes("blocked_admin")
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

function formatAction(action: string) {
  return cleanText(action, "activity.logged")
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows: AuditEvent[]) {
  const header = [
    "time",
    "severity",
    "category",
    "actor",
    "actor_email",
    "actor_type",
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
      row.category,
      row.actorName,
      row.actorEmail,
      row.actorType,
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

  return {
    userId: user.id,
  }
}

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
  action: string
  actionLabel: string
  category: AuditCategory
  severity: Exclude<AuditSeverity, "all">
  actorId: string | null
  actorName: string
  actorEmail: string
  actorType: Exclude<ActorType, "all">
  userId: string
  userEmail: string
  entityType: string
  entityId: string
  title: string
  detail: string
  ipAddress: string
  userAgent: string
  metadata: unknown
}

function actorTypeFor(profile: ProfileLookup | undefined | null): Exclude<ActorType, "all"> {
  if (!profile) return "system"
  if (profile.is_admin || profile.role === "admin" || profile.admin_role) return "admin"
  return "user"
}

function displayName(profile: ProfileLookup | undefined | null, fallback: string) {
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
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
    const ipFilter = normalizeLower(searchParams.get("ip"), "all") as IpFilter
    const dateStart = getDateStart(searchParams.get("range"))
    const limit = parseLimit(searchParams.get("limit"))
    const format = normalizeLower(searchParams.get("format"), "json")

    const logs = await prisma.user_activity_logs.findMany({
      where: dateStart
        ? {
            created_at: {
              gte: dateStart,
            },
          }
        : {},
      orderBy: {
        created_at: "desc",
      },
      take: format === "csv" ? MAX_LOOKBACK_ROWS : MAX_LOOKBACK_ROWS,
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
            where: {
              id: {
                in: profileIds,
              },
            },
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
      const actorId = log.actor_user_id ?? log.user_id ?? null
      const actorProfile = actorId ? profileMap.get(actorId) : null
      const userProfile = profileMap.get(log.user_id)

      const action = cleanText(log.action, "activity.logged")
      const entityType = cleanText(log.entity_type, "activity")
      const categoryValue = deriveCategory(action, entityType)
      const severityValue = deriveSeverity(action, entityType)

      const title = cleanText(log.title)
      const body = cleanText(log.body)
      const metadataText = safeJson(log.metadata)
      const detail =
        body ||
        title ||
        (userProfile?.email ? `Related user: ${userProfile.email}` : "") ||
        metadataText

      return {
        id: log.id,
        createdAt: log.created_at.toISOString(),
        createdAtLabel: formatDateTime(log.created_at),
        action,
        actionLabel: formatAction(action),
        category: categoryValue,
        severity: severityValue,
        actorId,
        actorName: displayName(actorProfile, actorId ? `User ${actorId.slice(0, 8)}` : "System"),
        actorEmail: actorProfile?.email ?? "",
        actorType: actorTypeFor(actorProfile),
        userId: log.user_id,
        userEmail: userProfile?.email ?? "",
        entityType,
        entityId: cleanText(log.entity_id),
        title,
        detail,
        ipAddress: cleanText(log.ip_address),
        userAgent: cleanText(log.user_agent),
        metadata: log.metadata ?? {},
      }
    })

    const filteredRows = rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false
      if (severity !== "all" && row.severity !== severity) return false
      if (actorType !== "all" && row.actorType !== actorType) return false
      if (ipFilter === "present" && !row.ipAddress) return false
      if (ipFilter === "missing" && row.ipAddress) return false
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
    }

    if (format === "csv") {
      const csv = toCsv(filteredRows.slice(0, MAX_LOOKBACK_ROWS))

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
      events: filteredRows.slice(0, limit),
      totalMatched: filteredRows.length,
      returned: Math.min(filteredRows.length, limit),
      maxLookbackRows: MAX_LOOKBACK_ROWS,
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

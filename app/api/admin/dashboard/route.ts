import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

type FeatureFlagRow = {
  key: string
  value: boolean
  description: string | null
}

type CountRow = {
  count: number
}

type PaymentSummaryRow = {
  revenue_cents: number
  failed_count: number
}

type AdminActivityRow = {
  id: string
  title: string
  body: string
  severity: string
  href: string | null
  read_at: Date | null
  created_at: Date
}

const PAID_TIERS = [
  "pro",
  "monthly",
  "annual",
  "pro_monthly",
  "pro_annual",
  "premium",
  "enterprise",
]

const OPTIONAL_TABLES = new Set([
  "support_tickets",
  "reported_rules",
  "admin_notifications",
  "paddle_payment_records",
])

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function startOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day
  now.setDate(diff)
  now.setHours(0, 0, 0, 0)
  return now
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
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_settings: true,
      can_view_billing: true,
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

  const isSuperAdmin = profile.admin_role === "super_admin"

  return {
    admin: {
      id: user.id,
      canManageSettings: isSuperAdmin || !!profile.can_manage_settings,
      canViewBilling: isSuperAdmin || !!profile.can_view_billing,
    },
    response: null,
  }
}

function makeTableExistsChecker() {
  const cache = new Map<string, Promise<boolean>>()

  return async function tableExists(tableName: string) {
    if (!OPTIONAL_TABLES.has(tableName)) return false

    const cached = cache.get(tableName)
    if (cached) return cached

    const promise = prisma
      .$queryRawUnsafe<{ exists: boolean }[]>(
        "SELECT to_regclass($1) IS NOT NULL AS exists",
        `public.${tableName}`,
      )
      .then((rows) => Boolean(rows[0]?.exists))
      .catch(() => false)

    cache.set(tableName, promise)
    return promise
  }
}

async function getFeatureFlags() {
  try {
    const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
      SELECT key, value, description
      FROM public.feature_flags
      WHERE key IN ('mbe_premium_enabled', 'mbe_public_visible')
      ORDER BY key
    `

    const map = new Map(rows.map((row) => [row.key, row]))

    return {
      mbePremiumEnabled: map.get("mbe_premium_enabled")?.value ?? false,
      mbePublicVisible: map.get("mbe_public_visible")?.value ?? false,
    }
  } catch {
    return {
      mbePremiumEnabled: false,
      mbePublicVisible: false,
    }
  }
}

async function optionalCount(
  tableExists: (tableName: string) => Promise<boolean>,
  tableName: string,
  whereSql = "TRUE",
) {
  const exists = await tableExists(tableName)
  if (!exists) return { connected: false, count: 0 }

  try {
    const rows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*)::int AS count FROM public.${tableName} WHERE ${whereSql}`,
    )

    return {
      connected: true,
      count: Number(rows[0]?.count || 0),
    }
  } catch {
    return { connected: false, count: 0 }
  }
}

async function getPaymentSummary(
  tableExists: (tableName: string) => Promise<boolean>,
  canViewBilling: boolean,
) {
  if (!canViewBilling) {
    return {
      connected: false,
      revenueCents: 0,
      failedCount: 0,
    }
  }

  const exists = await tableExists("paddle_payment_records")
  if (!exists) {
    return {
      connected: false,
      revenueCents: 0,
      failedCount: 0,
    }
  }

  try {
    const rows = await prisma.$queryRaw<PaymentSummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('paid', 'completed', 'captured') THEN COALESCE(total_cents, amount_cents, 0) ELSE 0 END), 0)::int AS revenue_cents,
        COUNT(*) FILTER (WHERE status IN ('failed', 'past_due', 'payment_failed'))::int AS failed_count
      FROM public.paddle_payment_records
    `

    return {
      connected: true,
      revenueCents: Number(rows[0]?.revenue_cents || 0),
      failedCount: Number(rows[0]?.failed_count || 0),
    }
  } catch {
    return {
      connected: false,
      revenueCents: 0,
      failedCount: 0,
    }
  }
}

async function getRecentAdminActivity(
  tableExists: (tableName: string) => Promise<boolean>,
  adminId: string,
) {
  const exists = await tableExists("admin_notifications")
  if (!exists) return []

  try {
    const rows = await prisma.$queryRaw<AdminActivityRow[]>`
      SELECT
        id::text,
        title,
        body,
        COALESCE(severity, 'normal') AS severity,
        href,
        read_at,
        created_at
      FROM public.admin_notifications
      WHERE admin_id = ${adminId}::uuid
      ORDER BY created_at DESC
      LIMIT 6
    `

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity,
      href: row.href,
      readAt: row.read_at ? row.read_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    }))
  } catch {
    return []
  }
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback
}

export async function GET() {
  try {
    const auth = await getCurrentAdmin()
    if (auth.response || !auth.admin) return auth.response

    const todayStart = startOfToday()
    const weekStart = startOfWeek()
    const tableExists = makeTableExistsChecker()

    const [
      flagsResult,
      totalUsersResult,
      paidSubscribersResult,
      trialUsersResult,
      blockedUsersResult,
      pendingPrivacyRequestsResult,
      newUsersThisWeekResult,
      recentSignupsResult,
      mbeAttemptsTodayResult,
      mbeAttemptsAllTimeResult,
      bllAttemptsTodayResult,
      bllAttemptsAllTimeResult,
      activeTodayRowsResult,
      lastActivityRowsResult,
      paymentSummaryResult,
      supportTicketsResult,
      reportedRulesResult,
      unreadNotificationsResult,
      recentAdminActivityResult,
    ] = await Promise.allSettled([
      getFeatureFlags(),

      prisma.profiles.count({
        where: { deleted_at: null },
      }),

      prisma.profiles.count({
        where: {
          deleted_at: null,
          is_blocked: false,
          subscription_tier: { in: PAID_TIERS },
        },
      }),

      prisma.profiles.count({
        where: {
          deleted_at: null,
          is_blocked: false,
          subscription_tier: "trial",
        },
      }),

      prisma.profiles.count({
        where: {
          deleted_at: null,
          is_blocked: true,
        },
      }),

      prisma.profiles.count({
        where: {
          deleted_at: null,
          pending_deletion: true,
        },
      }),

      prisma.profiles.count({
        where: {
          deleted_at: null,
          created_at: { gte: weekStart },
        },
      }),

      prisma.profiles.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          full_name: true,
          email: true,
          subscription_tier: true,
          exam_month: true,
          exam_year: true,
          is_blocked: true,
          pending_deletion: true,
          created_at: true,
        },
      }),

      prisma.user_mbe_attempts.count({
        where: { created_at: { gte: todayStart } },
      }),

      prisma.user_mbe_attempts.count(),

      prisma.user_rule_attempts.count({
        where: { created_at: { gte: todayStart } },
      }),

      prisma.user_rule_attempts.count(),

      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT user_id
          FROM public."user_mbe_attempts"
          WHERE created_at >= ${todayStart}

          UNION

          SELECT DISTINCT user_id
          FROM public."user_rule_attempts"
          WHERE created_at >= ${todayStart}
        ) AS active_users
      `,

      prisma.$queryRaw<{ last_seen: Date | null }[]>`
        SELECT MAX(created_at) AS last_seen
        FROM (
          SELECT created_at FROM public."user_mbe_attempts"
          UNION ALL
          SELECT created_at FROM public."user_rule_attempts"
        ) AS activity
      `,

      getPaymentSummary(tableExists, auth.admin.canViewBilling),

      optionalCount(
        tableExists,
        "support_tickets",
        "status NOT IN ('closed', 'resolved')",
      ),

      optionalCount(
        tableExists,
        "reported_rules",
        "status NOT IN ('closed', 'resolved', 'dismissed')",
      ),

      optionalCount(
        tableExists,
        "admin_notifications",
        `admin_id = '${auth.admin.id}'::uuid AND read_at IS NULL`,
      ),

      getRecentAdminActivity(tableExists, auth.admin.id),
    ])

    const flags = settledValue(flagsResult, {
      mbePremiumEnabled: false,
      mbePublicVisible: false,
    })

    const recentSignupsRaw = settledValue(recentSignupsResult, [])
    const activeTodayRows = settledValue(activeTodayRowsResult, [])
    const lastActivityRows = settledValue(lastActivityRowsResult, [])

    return NextResponse.json({
      ok: true,
      permissions: {
        canManageSettings: auth.admin.canManageSettings,
        canViewBilling: auth.admin.canViewBilling,
      },
      flags,
      metrics: {
        totalUsers: settledValue(totalUsersResult, 0),
        paidSubscribers: settledValue(paidSubscribersResult, 0),
        trialUsers: settledValue(trialUsersResult, 0),
        blockedUsers: settledValue(blockedUsersResult, 0),
        pendingPrivacyRequests: settledValue(pendingPrivacyRequestsResult, 0),
        newUsersThisWeek: settledValue(newUsersThisWeekResult, 0),
        mbeAttemptsToday: settledValue(mbeAttemptsTodayResult, 0),
        mbeAttemptsAllTime: settledValue(mbeAttemptsAllTimeResult, 0),
        bllAttemptsToday: settledValue(bllAttemptsTodayResult, 0),
        bllAttemptsAllTime: settledValue(bllAttemptsAllTimeResult, 0),
        activeToday: Number(activeTodayRows[0]?.count || 0),
        lastActivityAt: lastActivityRows[0]?.last_seen
          ? lastActivityRows[0].last_seen.toISOString()
          : null,
      },
      paymentSummary: settledValue(paymentSummaryResult, {
        connected: false,
        revenueCents: 0,
        failedCount: 0,
      }),
      queues: {
        supportTickets: settledValue(supportTicketsResult, {
          connected: false,
          count: 0,
        }),
        reportedRules: settledValue(reportedRulesResult, {
          connected: false,
          count: 0,
        }),
        unreadNotifications: settledValue(unreadNotificationsResult, {
          connected: false,
          count: 0,
        }),
      },
      recentSignups: recentSignupsRaw.map((signup) => ({
        ...signup,
        created_at: signup.created_at.toISOString(),
      })),
      recentAdminActivity: settledValue(recentAdminActivityResult, []),
      loadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("ADMIN DASHBOARD GET ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Failed to load admin dashboard." },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getCurrentAdmin()
    if (auth.response || !auth.admin) return auth.response

    if (!auth.admin.canManageSettings) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => null)
    const key = String(body?.key || "")
    const value = Boolean(body?.value)

    const allowedKeys = ["mbe_premium_enabled", "mbe_public_visible"] as const

    if (!allowedKeys.includes(key as (typeof allowedKeys)[number])) {
      return NextResponse.json(
        { ok: false, error: "Invalid feature flag." },
        { status: 400 },
      )
    }

    const descriptions: Record<string, string> = {
      mbe_premium_enabled: "Controls whether MBE premium features are enabled",
      mbe_public_visible: "Controls whether MBE premium offering is publicly visible",
    }

    await prisma.$executeRaw`
      INSERT INTO public.feature_flags ("key", "value", "description", "created_at", "updated_at")
      VALUES (${key}, ${value}, ${descriptions[key]}, NOW(), NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "description" = EXCLUDED."description",
        "updated_at" = NOW()
    `

    revalidatePath("/admin")
    revalidatePath("/subscription")
    revalidatePath("/")

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("ADMIN DASHBOARD POST ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Failed to update feature flag." },
      { status: 500 },
    )
  }
}
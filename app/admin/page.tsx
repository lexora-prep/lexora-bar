import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

type FeatureFlagRow = {
  key: string
  value: boolean
  description: string | null
}

type OptionalCountRow = {
  count: number
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

type PaymentSummaryRow = {
  revenue_cents: number
  failed_count: number
}

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

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100)
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  })
}

function formatRelative(value?: Date | string | null) {
  if (!value) return "No activity"

  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName.trim()
  return email.split("@")[0] || "User"
}

function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U"
  )
}

function normalizePlan(value?: string | null) {
  if (!value || !value.trim()) return "Free"
  return value.replace(/_/g, " ")
}

function isPaidTier(value?: string | null) {
  return [
    "pro",
    "monthly",
    "annual",
    "pro_monthly",
    "pro_annual",
    "premium",
    "enterprise",
  ].includes(String(value || "").toLowerCase())
}

async function ensureAdminAccess(userId: string) {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
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
    redirect("/dashboard")
  }

  return {
    profile,
    isSuperAdmin: profile.admin_role === "super_admin",
    canManageSettings:
      profile.admin_role === "super_admin" || !!profile.can_manage_settings,
    canViewBilling: profile.admin_role === "super_admin" || !!profile.can_view_billing,
  }
}

async function getFeatureFlags() {
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
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    `public.${tableName}`,
  )

  return Boolean(rows[0]?.exists)
}

async function optionalTableCount(tableName: string, whereSql = "TRUE") {
  const exists = await tableExists(tableName)
  if (!exists) return { connected: false, count: 0 }

  const rows = await prisma.$queryRawUnsafe<OptionalCountRow[]>(
    `SELECT COUNT(*)::int AS count FROM public.${tableName} WHERE ${whereSql}`,
  )

  return {
    connected: true,
    count: Number(rows[0]?.count || 0),
  }
}

async function getPaymentSummary() {
  const exists = await tableExists("paddle_payment_records")
  if (!exists) {
    return {
      connected: false,
      revenueCents: 0,
      failedCount: 0,
    }
  }

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
}

async function getRecentAdminActivity(adminId: string) {
  const exists = await tableExists("admin_notifications")
  if (!exists) return []

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

  return rows
}

function MetricCard({
  label,
  value,
  caption,
  badge,
  tone,
}: {
  label: string
  value: string
  caption: string
  badge?: string
  tone: "blue" | "green" | "teal" | "violet" | "amber" | "red" | "pink"
}) {
  const toneMap = {
    blue: "after:bg-blue-600",
    green: "after:bg-emerald-600",
    teal: "after:bg-cyan-700",
    violet: "after:bg-violet-600",
    amber: "after:bg-amber-700",
    red: "after:bg-red-600",
    pink: "after:bg-pink-700",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 ${toneMap[tone]}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold leading-none tracking-[-0.04em] text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400">{caption}</div>
      {badge ? (
        <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {badge}
        </div>
      ) : null}
    </div>
  )
}

function SnapshotCell({
  label,
  value,
  note,
  danger,
}: {
  label: string
  value: string
  note: string
  danger?: boolean
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-between bg-white px-4 py-3">
      <div className="text-sm font-medium leading-tight text-slate-700">{label}</div>
      <div className="text-right">
        <div className={`text-sm font-bold ${danger ? "text-red-600" : "text-slate-950"}`}>
          {value}
        </div>
        <div className="text-[11px] text-slate-400">{note}</div>
      </div>
    </div>
  )
}

function FlagToggle({
  title,
  description,
  flagKey,
  enabled,
  disabled,
  action,
}: {
  title: string
  description: string
  flagKey?: string
  enabled: boolean
  disabled?: boolean
  action?: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
      </div>

      {disabled || !flagKey || !action ? (
        <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          Not connected
        </div>
      ) : (
        <form action={action} className="shrink-0">
          <input type="hidden" name="key" value={flagKey} />
          <input type="hidden" name="value" value={String(!enabled)} />
          <button
            type="submit"
            aria-label={`Toggle ${title}`}
            className={`relative h-6 w-11 rounded-full border transition ${
              enabled
                ? "border-blue-600 bg-blue-600"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                enabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </form>
      )}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const updateFeatureFlag = async (formData: FormData) => {
    "use server"

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/login")
    }

    const { canManageSettings } = await ensureAdminAccess(user.id)

    if (!canManageSettings) {
      redirect("/admin")
    }

    const key = String(formData.get("key") || "")
    const nextValue = String(formData.get("value") || "") === "true"

    const allowedKeys = ["mbe_premium_enabled", "mbe_public_visible"] as const

    if (!allowedKeys.includes(key as (typeof allowedKeys)[number])) {
      redirect("/admin")
    }

    const descriptions: Record<string, string> = {
      mbe_premium_enabled: "Controls whether MBE premium features are enabled",
      mbe_public_visible:
        "Controls whether MBE premium offering is publicly visible",
    }

    await prisma.$executeRaw`
      INSERT INTO public.feature_flags ("key", "value", "description", "created_at", "updated_at")
      VALUES (${key}, ${nextValue}, ${descriptions[key]}, NOW(), NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "description" = EXCLUDED."description",
        "updated_at" = NOW()
    `

    revalidatePath("/admin")
    revalidatePath("/subscription")
    revalidatePath("/")
  }

  const todayStart = startOfToday()
  const weekStart = startOfWeek()

  const access = await ensureAdminAccess(user.id)
  const { canManageSettings, canViewBilling } = access

  const flags = await getFeatureFlags()

  const totalUsers = await prisma.profiles.count({
    where: {
      deleted_at: null,
    },
  })

  const paidSubscribers = await prisma.profiles.count({
    where: {
      deleted_at: null,
      is_blocked: false,
      subscription_tier: {
        in: [
          "pro",
          "monthly",
          "annual",
          "pro_monthly",
          "pro_annual",
          "premium",
          "enterprise",
        ],
      },
    },
  })

  const trialUsers = await prisma.profiles.count({
    where: {
      deleted_at: null,
      is_blocked: false,
      subscription_tier: "trial",
    },
  })

  const blockedUsers = await prisma.profiles.count({
    where: {
      deleted_at: null,
      is_blocked: true,
    },
  })

  const pendingPrivacyRequests = await prisma.profiles.count({
    where: {
      deleted_at: null,
      pending_deletion: true,
    },
  })

  const newUsersThisWeek = await prisma.profiles.count({
    where: {
      deleted_at: null,
      created_at: {
        gte: weekStart,
      },
    },
  })

  const recentSignups = await prisma.profiles.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
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
  })

  const mbeAttemptsToday = await prisma.user_mbe_attempts.count({
    where: {
      created_at: {
        gte: todayStart,
      },
    },
  })

  const mbeAttemptsAllTime = await prisma.user_mbe_attempts.count()

  const bllAttemptsToday = await prisma.user_rule_attempts.count({
    where: {
      created_at: {
        gte: todayStart,
      },
    },
  })

  const bllAttemptsAllTime = await prisma.user_rule_attempts.count()

  const activeTodayRows = await prisma.$queryRaw<{ count: number }[]>`
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
  `

  const lastActivityRows = await prisma.$queryRaw<{ last_seen: Date | null }[]>`
    SELECT MAX(created_at) AS last_seen
    FROM (
      SELECT created_at FROM public."user_mbe_attempts"
      UNION ALL
      SELECT created_at FROM public."user_rule_attempts"
    ) AS activity
  `

  const paymentSummary = canViewBilling
    ? await getPaymentSummary()
    : {
        connected: false,
        revenueCents: 0,
        failedCount: 0,
      }

  const supportTickets = await optionalTableCount(
    "support_tickets",
    "status NOT IN ('closed', 'resolved')",
  )

  const reportedRules = await optionalTableCount(
    "reported_rules",
    "status NOT IN ('closed', 'resolved', 'dismissed')",
  )

  const unreadNotifications = await optionalTableCount(
    "admin_notifications",
    `user_id = '${user.id}'::uuid AND is_read = false`,
  )

  const recentAdminActivity = await getRecentAdminActivity(user.id)

  const activeToday = Number(activeTodayRows[0]?.count || 0)
  const lastActivityAt = lastActivityRows[0]?.last_seen || null

  const openTicketsLabel = supportTickets.connected ? String(supportTickets.count) : "—"
  const reportedRulesLabel = reportedRules.connected ? String(reportedRules.count) : "—"

  const activityFallback = recentSignups.slice(0, 5).map((signup) => ({
    id: signup.id,
    title: "New user registered",
    body: `${safeName(signup.full_name, signup.email)} · ${signup.email}`,
    severity: "normal",
    href: `/admin/users/${signup.id}`,
    read_at: null,
    created_at: signup.created_at,
  }))

  const activityRows = recentAdminActivity.length > 0 ? recentAdminActivity : activityFallback

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-5 px-5 pb-8 pt-2">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
            Dashboard
          </h1>
          <div className="mt-1 text-sm text-slate-500">
            Platform overview — {formatDate(new Date())}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </Link>
          <Link
            href="/admin/users"
            className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add User
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard
          label="Total Users"
          value={totalUsers.toLocaleString()}
          caption={`${trialUsers.toLocaleString()} trial · ${blockedUsers.toLocaleString()} blocked`}
          badge={`↑ +${newUsersThisWeek.toLocaleString()} this week`}
          tone="blue"
        />
        <MetricCard
          label="Paid"
          value={paidSubscribers.toLocaleString()}
          caption="BLL+MBE plan"
          badge={`MRR: ${paymentSummary.connected ? formatCurrencyFromCents(paymentSummary.revenueCents) : "$0"}`}
          tone="green"
        />
        <MetricCard
          label="Active Today"
          value={activeToday.toLocaleString()}
          caption={`last: ${formatRelative(lastActivityAt)}`}
          tone="teal"
        />
        <MetricCard
          label="BLL Attempts"
          value={bllAttemptsAllTime.toLocaleString()}
          caption={`${bllAttemptsToday.toLocaleString()} today`}
          tone="violet"
        />
        <MetricCard
          label="MBE Attempts"
          value={mbeAttemptsAllTime.toLocaleString()}
          caption={`${mbeAttemptsToday.toLocaleString()} today`}
          tone="amber"
        />
        <MetricCard
          label="Open Tickets"
          value={openTicketsLabel}
          caption={supportTickets.connected ? "action queue" : "not connected"}
          badge={supportTickets.connected && supportTickets.count > 0 ? "Needs review" : undefined}
          tone="red"
        />
        <MetricCard
          label="Privacy Requests"
          value={pendingPrivacyRequests.toLocaleString()}
          caption="pending deletion"
          badge={pendingPrivacyRequests > 0 ? "Action needed" : undefined}
          tone="pink"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {canManageSettings ? (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                    Feature Flags
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Control live access and public visibility without redeploying.
                  </div>
                </div>
                <Link
                  href="/admin/settings"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage →
                </Link>
              </div>

              <div className="grid border-t border-slate-100 md:grid-cols-2 md:divide-x md:divide-slate-100">
                <div>
                  <FlagToggle
                    title="MBE Premium"
                    description="Controls MBE access"
                    flagKey="mbe_premium_enabled"
                    enabled={flags.mbePremiumEnabled}
                    action={updateFeatureFlag}
                  />
                  <FlagToggle
                    title="Study Streaks"
                    description="Enable streak tracking"
                    enabled={false}
                    disabled
                  />
                </div>

                <div>
                  <FlagToggle
                    title="MBE Visibility"
                    description="Public vs Coming Soon"
                    flagKey="mbe_public_visible"
                    enabled={flags.mbePublicVisible}
                    action={updateFeatureFlag}
                  />
                  <FlagToggle
                    title="Beta Features"
                    description="Selected users only"
                    enabled={false}
                    disabled
                  />
                </div>
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                System Health
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Operational
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Database</span>
                  <span className="font-semibold text-emerald-600">OK</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[96%] rounded-full bg-emerald-600" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Auth Service</span>
                  <span className="font-semibold text-emerald-600">OK</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[92%] rounded-full bg-emerald-600" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Billing / Paddle</span>
                  <span className={paymentSummary.connected ? "font-semibold text-emerald-600" : "font-semibold text-amber-700"}>
                    {paymentSummary.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${paymentSummary.connected ? "w-[82%] bg-emerald-600" : "w-[35%] bg-amber-500"}`} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Email Delivery</span>
                  <span className="font-semibold text-amber-700">Not connected</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[25%] rounded-full bg-amber-500" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
              Live Snapshot
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
              • Live
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200">
            <SnapshotCell label="Paid subscribers" value={paidSubscribers.toLocaleString()} note="Live" />
            <SnapshotCell label="Trial users" value={trialUsers.toLocaleString()} note="Live" />
            <SnapshotCell label="Blocked" value={blockedUsers.toLocaleString()} note="Live" />
            <SnapshotCell
              label="MBE attempts"
              value={mbeAttemptsToday.toLocaleString()}
              note={flags.mbePremiumEnabled ? "Enabled" : "Disabled"}
              danger={!flags.mbePremiumEnabled}
            />
            <SnapshotCell label="BLL attempts" value={bllAttemptsAllTime.toLocaleString()} note="All-time" />
            <SnapshotCell
              label="Revenue"
              value={paymentSummary.connected ? formatCurrencyFromCents(paymentSummary.revenueCents) : "$0"}
              note={paymentSummary.connected ? "Recorded" : "No billing"}
              danger={!paymentSummary.connected}
            />
            <SnapshotCell
              label="Unread admin alerts"
              value={unreadNotifications.connected ? unreadNotifications.count.toLocaleString() : "—"}
              note={unreadNotifications.connected ? "Live" : "Not connected"}
            />
            <SnapshotCell
              label="Failed payments"
              value={paymentSummary.connected ? paymentSummary.failedCount.toLocaleString() : "0"}
              note={paymentSummary.connected ? "Live" : "No billing"}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
              Recent Signups
            </div>
            <Link
              href="/admin/users"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>

              <tbody>
                {recentSignups.map((signup) => {
                  const name = safeName(signup.full_name, signup.email)
                  const plan = normalizePlan(signup.subscription_tier)

                  return (
                    <tr key={signup.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <Link href={`/admin/users/${signup.id}`} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                            {initialsFromName(name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950">
                              {name}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {signup.email}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isPaidTier(signup.subscription_tier) ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {signup.is_blocked ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                            • Blocked
                          </span>
                        ) : signup.pending_deletion ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            • Pending deletion
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            • Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {formatDate(signup.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
              Recent Admin Activity
            </div>
            <Link
              href="/admin/audit-log"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Full log →
            </Link>
          </div>

          <div className="p-5">
            <div className="space-y-5">
              {activityRows.map((activity, index) => {
                const dot =
                  activity.severity === "error" || activity.severity === "critical"
                    ? "bg-red-600"
                    : activity.severity === "warning"
                      ? "bg-amber-600"
                      : index % 3 === 0
                        ? "bg-blue-600"
                        : index % 3 === 1
                          ? "bg-emerald-600"
                          : "bg-slate-400"

                const content = (
                  <div className="flex gap-3">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">
                        {activity.title}
                      </div>
                      <div className="mt-0.5 text-sm text-slate-400">
                        {activity.body} · {formatRelative(activity.created_at)}
                      </div>
                    </div>
                  </div>
                )

                return activity.href ? (
                  <Link key={activity.id} href={activity.href}>
                    {content}
                  </Link>
                ) : (
                  <div key={activity.id}>{content}</div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Link
          href="/admin/support"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-bold text-slate-950">Support Queue</div>
          <div className="mt-1 text-sm text-slate-400">
            {supportTickets.connected
              ? `${supportTickets.count.toLocaleString()} open tickets`
              : "Support ticket table not connected"}
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-bold text-slate-950">User Management</div>
          <div className="mt-1 text-sm text-slate-400">
            Review users, plans, blocked accounts, and deletion requests.
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-bold text-slate-950">Platform Settings</div>
          <div className="mt-1 text-sm text-slate-400">
            Manage feature flags and operational settings.
          </div>
        </Link>
      </div>
    </div>
  )
}
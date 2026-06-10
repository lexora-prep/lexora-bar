"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type RecentSignup = {
  id: string
  full_name: string | null
  email: string
  subscription_tier: string | null
  exam_month: string | null
  exam_year: string | null
  is_blocked: boolean
  pending_deletion: boolean
  created_at: string
}

type ActivityRow = {
  id: string
  title: string
  body: string
  severity: string
  href: string | null
  readAt: string | null
  createdAt: string
}

type ConnectedCount = {
  connected: boolean
  count: number
}

type DashboardData = {
  ok: boolean
  permissions: {
    canManageSettings: boolean
    canViewBilling: boolean
  }
  flags: {
    mbePremiumEnabled: boolean
    mbePublicVisible: boolean
  }
  metrics: {
    totalUsers: number
    paidSubscribers: number
    trialUsers: number
    blockedUsers: number
    pendingPrivacyRequests: number
    newUsersThisWeek: number
    mbeAttemptsToday: number
    mbeAttemptsAllTime: number
    bllAttemptsToday: number
    bllAttemptsAllTime: number
    activeToday: number
    lastActivityAt: string | null
  }
  paymentSummary: {
    connected: boolean
    revenueCents: number
    failedCount: number
  }
  queues: {
    supportTickets: ConnectedCount
    reportedRules: ConnectedCount
    unreadNotifications: ConnectedCount
  }
  recentSignups: RecentSignup[]
  recentAdminActivity: ActivityRow[]
  loadedAt: string
  error?: string
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100)
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  })
}

function formatRelative(value?: string | Date | null) {
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

function MetricCard({
  label,
  value,
  caption,
  badge,
  tone,
  loading,
}: {
  label: string
  value: string
  caption: string
  badge?: string
  tone: "blue" | "green" | "teal" | "violet" | "amber" | "red" | "pink"
  loading?: boolean
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

      {loading ? (
        <>
          <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-slate-100" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded-md bg-slate-100" />
        </>
      ) : (
        <>
          <div className="mt-1 text-2xl font-bold leading-none tracking-[-0.04em] text-slate-950">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-400">{caption}</div>
          {badge ? (
            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {badge}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function SnapshotCell({
  label,
  value,
  note,
  danger,
  loading,
}: {
  label: string
  value: string
  note: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-between bg-white px-4 py-3">
      <div className="text-sm font-medium leading-tight text-slate-700">{label}</div>
      <div className="text-right">
        {loading ? (
          <>
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-100" />
            <div className="ml-auto mt-2 h-3 w-10 animate-pulse rounded bg-slate-100" />
          </>
        ) : (
          <>
            <div className={`text-sm font-bold ${danger ? "text-red-600" : "text-slate-950"}`}>
              {value}
            </div>
            <div className="text-[11px] text-slate-400">{note}</div>
          </>
        )}
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
  onToggle,
}: {
  title: string
  description: string
  flagKey?: string
  enabled: boolean
  disabled?: boolean
  onToggle?: (key: string, value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
      </div>

      {disabled || !flagKey || !onToggle ? (
        <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          Not connected
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(flagKey, !enabled)}
          aria-label={`Toggle ${title}`}
          className={`relative h-6 w-11 rounded-full border transition ${
            enabled ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      )}
    </div>
  )
}

export default function AdminDashboardClient({
  canManageSettings,
  canViewBilling,
}: {
  canManageSettings: boolean
  canViewBilling: boolean
}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activityRows = useMemo(() => {
    if (!data) return []

    if (data.recentAdminActivity.length > 0) return data.recentAdminActivity

    return data.recentSignups.slice(0, 5).map((signup) => ({
      id: signup.id,
      title: "New user registered",
      body: `${safeName(signup.full_name, signup.email)} · ${signup.email}`,
      severity: "normal",
      href: `/admin/users/${signup.id}`,
      readAt: null,
      createdAt: signup.created_at,
    }))
  }, [data])

  async function loadDashboard(showRefreshing = false) {
    try {
      setError(null)

      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const res = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      })

      const nextData = (await res.json().catch(() => null)) as DashboardData | null

      if (!res.ok || !nextData?.ok) {
        throw new Error(nextData?.error || "Failed to load admin dashboard.")
      }

      setData(nextData)
    } catch (err: any) {
      setError(err?.message || "Failed to load admin dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function updateFeatureFlag(key: string, value: boolean) {
    const previous = data

    if (previous) {
      setData({
        ...previous,
        flags: {
          ...previous.flags,
          ...(key === "mbe_premium_enabled" ? { mbePremiumEnabled: value } : {}),
          ...(key === "mbe_public_visible" ? { mbePublicVisible: value } : {}),
        },
      })
    }

    try {
      const res = await fetch("/api/admin/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ key, value }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to update feature flag.")
      }

      await loadDashboard(true)
    } catch (err) {
      if (previous) setData(previous)
      console.error("ADMIN FEATURE FLAG UPDATE ERROR:", err)
    }
  }

  useEffect(() => {
    void loadDashboard(false)
  }, [])

  const metrics = data?.metrics
  const flags = data?.flags

  const paymentSummary =
    data?.paymentSummary ||
    {
      connected: false,
      revenueCents: 0,
      failedCount: 0,
    }

  const supportTickets =
    data?.queues.supportTickets ||
    {
      connected: false,
      count: 0,
    }

  const unreadNotifications =
    data?.queues.unreadNotifications ||
    {
      connected: false,
      count: 0,
    }

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
          {error ? (
            <div className="mt-2 text-sm font-medium text-red-600">{error}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
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
          value={(metrics?.totalUsers || 0).toLocaleString()}
          caption={`${(metrics?.trialUsers || 0).toLocaleString()} trial · ${(metrics?.blockedUsers || 0).toLocaleString()} blocked`}
          badge={`↑ +${(metrics?.newUsersThisWeek || 0).toLocaleString()} this week`}
          tone="blue"
          loading={loading}
        />
        <MetricCard
          label="Paid"
          value={(metrics?.paidSubscribers || 0).toLocaleString()}
          caption="BLL+MBE plan"
          badge={`MRR: ${
            canViewBilling && paymentSummary.connected
              ? formatCurrencyFromCents(paymentSummary.revenueCents)
              : "$0"
          }`}
          tone="green"
          loading={loading}
        />
        <MetricCard
          label="Active Today"
          value={(metrics?.activeToday || 0).toLocaleString()}
          caption={`last: ${formatRelative(metrics?.lastActivityAt)}`}
          tone="teal"
          loading={loading}
        />
        <MetricCard
          label="BLL Attempts"
          value={(metrics?.bllAttemptsAllTime || 0).toLocaleString()}
          caption={`${(metrics?.bllAttemptsToday || 0).toLocaleString()} today`}
          tone="violet"
          loading={loading}
        />
        <MetricCard
          label="MBE Attempts"
          value={(metrics?.mbeAttemptsAllTime || 0).toLocaleString()}
          caption={`${(metrics?.mbeAttemptsToday || 0).toLocaleString()} today`}
          tone="amber"
          loading={loading}
        />
        <MetricCard
          label="Open Tickets"
          value={supportTickets.connected ? String(supportTickets.count) : "—"}
          caption={supportTickets.connected ? "action queue" : "not connected"}
          badge={supportTickets.connected && supportTickets.count > 0 ? "Needs review" : undefined}
          tone="red"
          loading={loading}
        />
        <MetricCard
          label="Privacy Requests"
          value={(metrics?.pendingPrivacyRequests || 0).toLocaleString()}
          caption="pending deletion"
          badge={(metrics?.pendingPrivacyRequests || 0) > 0 ? "Action needed" : undefined}
          tone="pink"
          loading={loading}
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
                    enabled={!!flags?.mbePremiumEnabled}
                    onToggle={updateFeatureFlag}
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
                    enabled={!!flags?.mbePublicVisible}
                    onToggle={updateFeatureFlag}
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
                  <span
                    className={
                      paymentSummary.connected
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-amber-700"
                    }
                  >
                    {paymentSummary.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      paymentSummary.connected
                        ? "w-[82%] bg-emerald-600"
                        : "w-[35%] bg-amber-500"
                    }`}
                  />
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
            <SnapshotCell
              label="Paid subscribers"
              value={(metrics?.paidSubscribers || 0).toLocaleString()}
              note="Live"
              loading={loading}
            />
            <SnapshotCell
              label="Trial users"
              value={(metrics?.trialUsers || 0).toLocaleString()}
              note="Live"
              loading={loading}
            />
            <SnapshotCell
              label="Blocked"
              value={(metrics?.blockedUsers || 0).toLocaleString()}
              note="Live"
              loading={loading}
            />
            <SnapshotCell
              label="MBE attempts"
              value={(metrics?.mbeAttemptsToday || 0).toLocaleString()}
              note={flags?.mbePremiumEnabled ? "Enabled" : "Disabled"}
              danger={!flags?.mbePremiumEnabled}
              loading={loading}
            />
            <SnapshotCell
              label="BLL attempts"
              value={(metrics?.bllAttemptsAllTime || 0).toLocaleString()}
              note="All-time"
              loading={loading}
            />
            <SnapshotCell
              label="Revenue"
              value={paymentSummary.connected ? formatCurrencyFromCents(paymentSummary.revenueCents) : "$0"}
              note={paymentSummary.connected ? "Recorded" : "No billing"}
              danger={!paymentSummary.connected}
              loading={loading}
            />
            <SnapshotCell
              label="Unread admin alerts"
              value={unreadNotifications.connected ? unreadNotifications.count.toLocaleString() : "—"}
              note={unreadNotifications.connected ? "Live" : "Not connected"}
              loading={loading}
            />
            <SnapshotCell
              label="Failed payments"
              value={paymentSummary.connected ? paymentSummary.failedCount.toLocaleString() : "0"}
              note={paymentSummary.connected ? "Live" : "No billing"}
              loading={loading}
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
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="h-9 w-48 animate-pulse rounded bg-slate-100" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : (
                  data?.recentSignups.map((signup) => {
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
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isPaidTier(signup.subscription_tier)
                                ? "bg-blue-50 text-blue-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
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
                  })
                )}
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
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
                ))
              ) : (
                activityRows.map((activity, index) => {
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
                          {activity.body} · {formatRelative(activity.createdAt)}
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
                })
              )}
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
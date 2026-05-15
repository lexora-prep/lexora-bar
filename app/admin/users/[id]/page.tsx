"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Globe2,
  Laptop,
  MapPin,
  Shield,
  Tag,
  UserCog,
  Wallet,
} from "lucide-react"

type AdminUserDetail = {
  id: string
  email: string
  full_name: string | null
  law_school: string | null
  jurisdiction: string | null
  exam_month: number | null
  exam_year: number | null
  phone_number: string | null

  mbe_access: boolean
  subscription_tier: string | null
  role: string
  admin_role: string | null
  is_admin: boolean
  is_blocked: boolean

  email_announcements: boolean
  study_reminders: boolean
  sound_effects: boolean
  compact_mode: boolean

  pending_deletion: boolean
  deletion_requested_at: string | null
  deleted_at: string | null

  workspace_status: string | null
  last_login_at: string | null
  last_active_at: string | null
  last_ip_address: string | null
  last_country: string | null
  last_region: string | null
  last_city: string | null
  last_timezone: string | null
  last_latitude: number | null
  last_longitude: number | null
  last_user_agent: string | null
  last_activity_source: string | null

  can_manage_questions: boolean
  can_manage_rules: boolean
  can_manage_users: boolean
  can_manage_announcements: boolean
  can_view_billing: boolean
  can_manage_coupons: boolean
  can_manage_settings: boolean
  can_view_audit_log: boolean

  can_manage_workspace_members: boolean
  can_create_workspace_channels: boolean
  can_manage_workspace_channels: boolean
  can_manage_hidden_channels: boolean
  can_manage_workspace_notes: boolean
  can_create_shared_notes: boolean
  can_create_workspace_polls: boolean
  can_send_workspace_wake_alerts: boolean
  can_view_workspace_member_details: boolean
  can_manage_all_workspace: boolean

  created_at: string
  updated_at: string
  account_age_days: number
  is_online: boolean
}

type TabKey = "overview" | "billing" | "activity" | "permissions"

function safeName(user: AdminUserDetail) {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  return user.email.split("@")[0]
}

function initials(user: AdminUserDetail) {
  return (
    safeName(user)
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  )
}

function formatRelative(dateString?: string | null) {
  if (!dateString) return "—"

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"

  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`

  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? "s" : ""} ago`
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function normalizeSource(value?: string | null) {
  if (!value) return "—"

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function locationLabel(user: AdminUserDetail) {
  const parts = [user.last_city, user.last_region, user.last_country]
    .filter(Boolean)
    .map((part) => String(part))

  if (parts.length === 0) return "—"
  return parts.join(", ")
}

function statusLabel(user: AdminUserDetail) {
  if (user.deleted_at) return "Deleted"
  if (user.is_blocked) return "Blocked"
  if (user.pending_deletion) return "Pending deletion"
  return "Active"
}

function planLabel(user: AdminUserDetail) {
  return user.subscription_tier?.trim() || "free"
}

function planTone(user: AdminUserDetail): BadgeTone {
  const plan = planLabel(user).toLowerCase()

  if (["premium", "pro", "monthly", "annual", "pro_monthly", "pro_annual"].includes(plan)) {
    return "blue"
  }

  if (plan === "enterprise") return "purple"
  if (plan === "trial") return "yellow"

  return "neutral"
}

type BadgeTone = "neutral" | "green" | "red" | "blue" | "yellow" | "purple"

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: BadgeTone
}) {
  const styles: Record<BadgeTone, React.CSSProperties> = {
    neutral: {
      background: "#F4F6FA",
      color: "#667085",
      border: "1px solid #E6EAF2",
    },
    green: {
      background: "#ECFDF3",
      color: "#027A48",
      border: "1px solid #ABEFC6",
    },
    red: {
      background: "#FEF3F2",
      color: "#B42318",
      border: "1px solid #FECDCA",
    },
    blue: {
      background: "#EEF4FF",
      color: "#3538CD",
      border: "1px solid #C7D7FE",
    },
    yellow: {
      background: "#FFFAEB",
      color: "#B54708",
      border: "1px solid #FEDF89",
    },
    purple: {
      background: "#F4F3FF",
      color: "#5925DC",
      border: "1px solid #D9D6FE",
    },
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={styles[tone]}
    >
      {children}
    </span>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4"
      style={{
        border: "1px solid #EAECF0",
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium" style={{ color: "#667085" }}>
          {label}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{
            background: "#F8FAFC",
            color: "#475467",
            border: "1px solid #EAECF0",
          }}
        >
          {icon}
        </div>
      </div>

      <div className="text-[20px] font-semibold tracking-[-0.03em]" style={{ color: "#101828" }}>
        {value}
      </div>

      {sub ? (
        <div className="mt-1 text-[12px] leading-5" style={{ color: "#98A2B3" }}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl bg-white"
      style={{
        border: "1px solid #EAECF0",
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: "#101828" }}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[12px] leading-5" style={{ color: "#667085" }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #EAECF0" }}>{children}</div>
    </section>
  )
}

function InfoGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode
  columns?: 2 | 3
}) {
  return (
    <div className={`grid gap-px bg-[#EAECF0] ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {children}
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "#98A2B3" }}>
        {label}
      </div>
      <div className="break-words text-[13px] font-medium leading-6" style={{ color: "#101828" }}>
        {value || "—"}
      </div>
    </div>
  )
}

function EmptyBillingState() {
  return (
    <div className="px-5 py-10 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          background: "#F8FAFC",
          border: "1px solid #EAECF0",
          color: "#667085",
        }}
      >
        <CreditCard className="h-5 w-5" />
      </div>

      <h3 className="text-[14px] font-semibold" style={{ color: "#101828" }}>
        Paddle billing history is not connected yet
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6" style={{ color: "#667085" }}>
        This page is ready for Paddle subscription, transaction, discount, and invoice data.
        Right now your database only has the current subscription tier, so paid months,
        total paid, coupon usage, refunds, and transaction history should remain empty
        until Paddle webhook tables are added.
      </p>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingAction, setSavingAction] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  const userId = params?.id

  const permissionItems = useMemo(() => {
    if (!user) return []

    return [
      ["Questions", user.can_manage_questions],
      ["Rules", user.can_manage_rules],
      ["Users", user.can_manage_users],
      ["Announcements", user.can_manage_announcements],
      ["Billing", user.can_view_billing],
      ["Coupons", user.can_manage_coupons],
      ["Settings", user.can_manage_settings],
      ["Audit log", user.can_view_audit_log],
      ["Workspace members", user.can_manage_workspace_members],
      ["Create channels", user.can_create_workspace_channels],
      ["Manage channels", user.can_manage_workspace_channels],
      ["Hidden channels", user.can_manage_hidden_channels],
      ["Workspace notes", user.can_manage_workspace_notes],
      ["Shared notes", user.can_create_shared_notes],
      ["Polls", user.can_create_workspace_polls],
      ["Wake alerts", user.can_send_workspace_wake_alerts],
      ["Member details", user.can_view_workspace_member_details],
      ["Full workspace", user.can_manage_all_workspace],
    ]
  }, [user])

  useEffect(() => {
    void loadUser()
  }, [userId])

  async function loadUser() {
    if (!userId) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load user.")
        setUser(null)
        return
      }

      setUser(data.user)
    } catch (err) {
      console.error("LOAD ADMIN USER DETAIL ERROR:", err)
      setError("Something went wrong while loading this user.")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function runAction(action: string) {
    if (!userId) return

    const confirmed = window.confirm("Are you sure you want to update this user?")
    if (!confirmed) return

    try {
      setSavingAction(action)
      setError("")

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update user.")
        return
      }

      await loadUser()
    } catch (err) {
      console.error("ADMIN USER ACTION ERROR:", err)
      setError("Something went wrong while updating this user.")
    } finally {
      setSavingAction("")
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] p-6">
        <div
          className="rounded-2xl bg-white p-6 text-[13px]"
          style={{
            border: "1px solid #EAECF0",
            color: "#667085",
          }}
        >
          Loading user record...
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] p-6">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium"
          style={{ color: "#344054" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>

        <div
          className="rounded-2xl bg-white p-5 text-[13px]"
          style={{
            border: "1px solid #FECDCA",
            color: "#B42318",
          }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (!user) return null

  const accountTone: BadgeTone =
    user.is_blocked || user.pending_deletion || user.deleted_at ? "red" : "green"

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "billing", label: "Billing" },
    { key: "activity", label: "Activity" },
    { key: "permissions", label: "Permissions" },
  ]

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] text-[#101828]">
      <div
        className="sticky top-0 z-20 bg-[#F8FAFC]/95 px-6 py-4 backdrop-blur"
        style={{ borderBottom: "1px solid #EAECF0" }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Link
            href="/admin/users"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[12.5px] font-medium"
            style={{
              border: "1px solid #D0D5DD",
              color: "#344054",
              boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "#101828" }}>
              User record
            </div>
            <div className="truncate text-[12px]" style={{ color: "#667085" }}>
              {user.email}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone={accountTone}>{statusLabel(user)}</Badge>
            <Badge tone={user.is_online ? "green" : "neutral"}>
              {user.is_online ? "Online" : "Offline"}
            </Badge>
            <Badge tone={planTone(user)}>{planLabel(user)}</Badge>
            {user.is_admin ? <Badge tone="purple">Admin</Badge> : null}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-6">
        {error ? (
          <div
            className="rounded-2xl bg-white px-4 py-3 text-[13px]"
            style={{
              border: "1px solid #FECDCA",
              color: "#B42318",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="overflow-hidden rounded-3xl bg-white"
          style={{
            border: "1px solid #EAECF0",
            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
          }}
        >
          <div className="p-6">
            <div className="flex flex-wrap items-start gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #344054, #667085)" }}
              >
                {initials(user)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[26px] font-semibold tracking-[-0.04em]" style={{ color: "#101828" }}>
                    {safeName(user)}
                  </h1>
                  {user.mbe_access ? <Badge tone="green">MBE access</Badge> : <Badge>No MBE access</Badge>}
                </div>

                <div className="mt-2 grid gap-2 text-[13px] md:grid-cols-3" style={{ color: "#667085" }}>
                  <div className="truncate">{user.email}</div>
                  <div>{user.jurisdiction || "No jurisdiction"} · {user.law_school || "No law school"}</div>
                  <div>Account age: {user.account_age_days} days</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {user.is_blocked ? (
                  <button
                    type="button"
                    onClick={() => runAction("unblock")}
                    disabled={savingAction === "unblock"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-60"
                    style={{ background: "#039855" }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Unblock
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => runAction("block")}
                    disabled={savingAction === "block"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-60"
                    style={{ background: "#D92D20" }}
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                )}

                {user.is_admin ? (
                  <button
                    type="button"
                    onClick={() => runAction("remove_admin")}
                    disabled={savingAction === "remove_admin"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[12.5px] font-semibold disabled:opacity-60"
                    style={{
                      border: "1px solid #D0D5DD",
                      color: "#344054",
                    }}
                  >
                    <UserCog className="h-4 w-4" />
                    Remove admin
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => runAction("make_admin")}
                    disabled={savingAction === "make_admin"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[12.5px] font-semibold disabled:opacity-60"
                    style={{
                      border: "1px solid #D0D5DD",
                      color: "#344054",
                    }}
                  >
                    <UserCog className="h-4 w-4" />
                    Make admin
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-[#EAECF0] md:grid-cols-4">
            <MetricCard
              label="Current plan"
              value={planLabel(user)}
              sub="From profile subscription tier"
              icon={<Wallet className="h-4 w-4" />}
            />
            <MetricCard
              label="Last active"
              value={formatRelative(user.last_active_at)}
              sub={normalizeSource(user.last_activity_source)}
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              label="Last login"
              value={formatRelative(user.last_login_at)}
              sub={formatDateTime(user.last_login_at)}
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              label="Location"
              value={user.last_country || "—"}
              sub={user.last_ip_address || "No IP captured"}
              icon={<Globe2 className="h-4 w-4" />}
            />
          </div>
        </section>

        <div
          className="inline-flex rounded-2xl bg-white p-1"
          style={{
            border: "1px solid #EAECF0",
            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="rounded-xl px-4 py-2 text-[13px] font-medium transition"
              style={
                activeTab === tab.key
                  ? {
                      background: "#101828",
                      color: "#ffffff",
                    }
                  : {
                      background: "transparent",
                      color: "#667085",
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Profile" description="Basic account and bar preparation information.">
              <InfoGrid>
                <InfoItem label="Full name" value={user.full_name || "—"} />
                <InfoItem label="Email" value={user.email} />
                <InfoItem label="Phone" value={user.phone_number || "—"} />
                <InfoItem label="Law school" value={user.law_school || "—"} />
                <InfoItem label="Jurisdiction" value={user.jurisdiction || "—"} />
                <InfoItem
                  label="Exam date"
                  value={
                    user.exam_month || user.exam_year
                      ? `${user.exam_month || "—"} / ${user.exam_year || "—"}`
                      : "—"
                  }
                />
              </InfoGrid>
            </Panel>

            <Panel title="Account" description="Access status and account configuration.">
              <InfoGrid>
                <InfoItem label="Status" value={statusLabel(user)} />
                <InfoItem label="Role" value={`${user.role || "user"} · ${user.admin_role || "user"}`} />
                <InfoItem label="MBE access" value={user.mbe_access ? "Enabled" : "Disabled"} />
                <InfoItem label="Workspace status" value={user.workspace_status || "—"} />
                <InfoItem label="Created" value={formatDateTime(user.created_at)} />
                <InfoItem label="Updated" value={formatDateTime(user.updated_at)} />
              </InfoGrid>
            </Panel>
          </div>
        ) : null}

        {activeTab === "billing" ? (
          <div className="space-y-5">
            <Panel
              title="Billing & Subscription"
              description="Paddle-ready billing overview. Full values require Paddle webhook storage tables."
            >
              <InfoGrid columns={3}>
                <InfoItem label="Current plan" value={planLabel(user)} />
                <InfoItem label="Billing provider" value="Paddle" />
                <InfoItem label="Subscription status" value="Not connected" />
                <InfoItem label="Paddle customer ID" value="—" />
                <InfoItem label="Paddle subscription ID" value="—" />
                <InfoItem label="Billing interval" value="—" />
                <InfoItem label="Paid months" value="—" />
                <InfoItem label="Total paid" value="—" />
                <InfoItem label="MRR" value="—" />
                <InfoItem label="First payment" value="—" />
                <InfoItem label="Last payment" value="—" />
                <InfoItem label="Next billing date" value="—" />
              </InfoGrid>
            </Panel>

            <div className="grid gap-5 xl:grid-cols-2">
              <Panel title="Discounts & Coupons" description="Coupon and discount history from Paddle transactions.">
                <InfoGrid>
                  <InfoItem label="Discount used" value="—" />
                  <InfoItem label="Coupon code" value="—" />
                  <InfoItem label="Discount type" value="—" />
                  <InfoItem label="Discount amount" value="—" />
                </InfoGrid>
              </Panel>

              <Panel title="Cancellation & Access" description="Subscription cancellation and access-end information.">
                <InfoGrid>
                  <InfoItem label="Cancel at period end" value="—" />
                  <InfoItem label="Cancelled at" value="—" />
                  <InfoItem label="Access ends" value="—" />
                  <InfoItem label="Churned after" value="—" />
                </InfoGrid>
              </Panel>
            </div>

            <Panel title="Payment History" description="Future Paddle transaction history will appear here.">
              <EmptyBillingState />
            </Panel>
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Login & Activity" description="Recent app activity captured by login and heartbeat tracking.">
              <InfoGrid>
                <InfoItem label="Online status" value={user.is_online ? "Online now" : "Offline"} />
                <InfoItem label="Activity source" value={normalizeSource(user.last_activity_source)} />
                <InfoItem
                  label="Last login"
                  value={`${formatRelative(user.last_login_at)} · ${formatDateTime(user.last_login_at)}`}
                />
                <InfoItem
                  label="Last active"
                  value={`${formatRelative(user.last_active_at)} · ${formatDateTime(user.last_active_at)}`}
                />
              </InfoGrid>
            </Panel>

            <Panel title="Location & Device" description="IP, region, device, and browser information from the latest activity.">
              <InfoGrid>
                <InfoItem label="Location" value={locationLabel(user)} />
                <InfoItem label="IP address" value={user.last_ip_address || "—"} />
                <InfoItem label="Country" value={user.last_country || "—"} />
                <InfoItem label="Region" value={user.last_region || "—"} />
                <InfoItem label="City" value={user.last_city || "—"} />
                <InfoItem label="Timezone" value={user.last_timezone || "—"} />
                <InfoItem
                  label="Coordinates"
                  value={
                    user.last_latitude || user.last_longitude
                      ? `${user.last_latitude || "—"}, ${user.last_longitude || "—"}`
                      : "—"
                  }
                />
                <InfoItem label="User agent" value={user.last_user_agent || "—"} />
              </InfoGrid>
            </Panel>
          </div>
        ) : null}

        {activeTab === "permissions" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Admin Permissions" description="Permission flags currently stored on the user profile.">
              <div className="grid gap-px bg-[#EAECF0] md:grid-cols-3">
                {permissionItems.map(([label, enabled]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3 bg-white px-5 py-4">
                    <span className="text-[13px] font-medium" style={{ color: "#344054" }}>
                      {label}
                    </span>
                    <Badge tone={enabled ? "green" : "neutral"}>{enabled ? "Yes" : "No"}</Badge>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="User Preferences" description="Personal app settings configured by the user.">
              <InfoGrid>
                <InfoItem label="Email announcements" value={user.email_announcements ? "Enabled" : "Disabled"} />
                <InfoItem label="Study reminders" value={user.study_reminders ? "Enabled" : "Disabled"} />
                <InfoItem label="Sound effects" value={user.sound_effects ? "Enabled" : "Disabled"} />
                <InfoItem label="Compact mode" value={user.compact_mode ? "Enabled" : "Disabled"} />
              </InfoGrid>
            </Panel>
          </div>
        ) : null}

        <div
          className="rounded-2xl bg-white px-5 py-4 text-[12px] leading-5"
          style={{
            border: "1px solid #EAECF0",
            color: "#667085",
          }}
        >
          Paddle billing data is intentionally shown as unavailable until Paddle customer,
          subscription, transaction, discount, and webhook event tables are added to the database.
          This avoids showing fake revenue or fake paid-month calculations.
        </div>
      </main>
    </div>
  )
}

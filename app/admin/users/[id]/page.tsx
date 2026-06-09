"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
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
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Database,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  MonitorSmartphone,
  MousePointerClick,
  Network,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
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

type BadgeTone = "neutral" | "green" | "red" | "blue" | "yellow" | "purple" | "orange" | "cyan"

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

function accountRisk(user: AdminUserDetail) {
  if (user.deleted_at) {
    return {
      label: "Deleted",
      tone: "red" as BadgeTone,
      title: "Account deleted",
      description: "This user has a deletion timestamp.",
      icon: <XCircle className="h-5 w-5" />,
    }
  }

  if (user.is_blocked) {
    return {
      label: "Blocked",
      tone: "red" as BadgeTone,
      title: "Access blocked",
      description: "This user cannot access the platform.",
      icon: <ShieldAlert className="h-5 w-5" />,
    }
  }

  if (user.pending_deletion) {
    return {
      label: "Deletion pending",
      tone: "orange" as BadgeTone,
      title: "Deletion pending",
      description: "The user requested account deletion.",
      icon: <AlertTriangle className="h-5 w-5" />,
    }
  }

  if (user.is_admin) {
    return {
      label: "Privileged",
      tone: "purple" as BadgeTone,
      title: "Admin account",
      description: "This account has elevated permissions.",
      icon: <Shield className="h-5 w-5" />,
    }
  }

  return {
    label: "Normal",
    tone: "green" as BadgeTone,
    title: "No account restriction",
    description: "The account is active and not blocked.",
    icon: <ShieldCheck className="h-5 w-5" />,
  }
}

function toneStyle(tone: BadgeTone): CSSProperties {
  const styles: Record<BadgeTone, CSSProperties> = {
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
    orange: {
      background: "#FFF7ED",
      color: "#C2410C",
      border: "1px solid #FED7AA",
    },
    cyan: {
      background: "#ECFEFF",
      color: "#0E7490",
      border: "1px solid #A5F3FC",
    },
  }

  return styles[tone]
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: BadgeTone
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={toneStyle(tone)}
    >
      {children}
    </span>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: "neutral" | "danger" | "success" | "primary"
}) {
  const styles: Record<string, CSSProperties> = {
    neutral: {
      background: "#FFFFFF",
      color: "#344054",
      border: "1px solid #D0D5DD",
    },
    danger: {
      background: "#D92D20",
      color: "#FFFFFF",
      border: "1px solid #D92D20",
    },
    success: {
      background: "#039855",
      color: "#FFFFFF",
      border: "1px solid #039855",
    },
    primary: {
      background: "#2563EB",
      color: "#FFFFFF",
      border: "1px solid #2563EB",
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[12.5px] font-semibold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={styles[tone]}
    >
      {children}
    </button>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: ReactNode
  tone: BadgeTone
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-4"
      style={{
        border: "1px solid #EAECF0",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        className="absolute right-0 top-0 h-20 w-20 rounded-bl-[40px] opacity-60"
        style={{ background: toneStyle(tone).background }}
      />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#667085" }}>
          {label}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={toneStyle(tone)}
        >
          {icon}
        </div>
      </div>

      <div className="relative text-[24px] font-bold tracking-[-0.04em]" style={{ color: "#101828" }}>
        {value}
      </div>

      {sub ? (
        <div className="relative mt-1 text-[12px] leading-5" style={{ color: "#667085" }}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        border: "1px solid #EAECF0",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: "#101828" }}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[12px] leading-5" style={{ color: "#667085" }}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>

      <div style={{ borderTop: "1px solid #EAECF0" }}>{children}</div>
    </section>
  )
}

function InfoGrid({
  children,
  columns = 2,
}: {
  children: ReactNode
  columns?: 2 | 3
}) {
  return (
    <div
      className="grid gap-px bg-[#EAECF0]"
      style={{ gridTemplateColumns: columns === 3 ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))" }}
    >
      {children}
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#98A2B3" }}>
        {label}
      </div>
      <div className="break-words text-[13px] font-semibold leading-6" style={{ color: "#101828" }}>
        {value || "—"}
      </div>
    </div>
  )
}

function PermissionTile({
  label,
  enabled,
  icon,
}: {
  label: string
  enabled: boolean
  icon: ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4"
      style={{
        border: "1px solid #EAECF0",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={toneStyle(enabled ? "green" : "neutral")}
        >
          {icon}
        </div>
        <span className="text-[13px] font-semibold" style={{ color: "#344054" }}>
          {label}
        </span>
      </div>
      <Badge tone={enabled ? "green" : "neutral"}>{enabled ? "Enabled" : "Off"}</Badge>
    </div>
  )
}

function TimelineItem({
  icon,
  title,
  description,
  time,
  tone,
}: {
  icon: ReactNode
  title: string
  description: string
  time: string
  tone: BadgeTone
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={toneStyle(tone)}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[13px] font-semibold text-slate-950">{title}</div>
            <div className="mt-1 text-[12px] leading-5 text-slate-500">{description}</div>
          </div>
          <div className="shrink-0 text-[12px] font-medium text-slate-400">{time}</div>
        </div>
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
        This page will show real Paddle customer, subscription, transaction, discount,
        and invoice data after those records are stored in the database.
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
  const [copied, setCopied] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  const userId = params?.id

  const risk = useMemo(() => (user ? accountRisk(user) : null), [user])

  const adminPermissionItems = useMemo(() => {
    if (!user) return []

    return [
      { label: "Questions", enabled: user.can_manage_questions, icon: <FileText className="h-4 w-4" /> },
      { label: "Rules", enabled: user.can_manage_rules, icon: <Database className="h-4 w-4" /> },
      { label: "Users", enabled: user.can_manage_users, icon: <UserCog className="h-4 w-4" /> },
      { label: "Announcements", enabled: user.can_manage_announcements, icon: <Bell className="h-4 w-4" /> },
      { label: "Billing", enabled: user.can_view_billing, icon: <CreditCard className="h-4 w-4" /> },
      { label: "Coupons", enabled: user.can_manage_coupons, icon: <Tag className="h-4 w-4" /> },
      { label: "Settings", enabled: user.can_manage_settings, icon: <KeyRound className="h-4 w-4" /> },
      { label: "Audit Log", enabled: user.can_view_audit_log, icon: <Shield className="h-4 w-4" /> },
    ]
  }, [user])

  const workspacePermissionItems = useMemo(() => {
    if (!user) return []

    return [
      { label: "Members", enabled: user.can_manage_workspace_members, icon: <User className="h-4 w-4" /> },
      { label: "Create Channels", enabled: user.can_create_workspace_channels, icon: <MousePointerClick className="h-4 w-4" /> },
      { label: "Manage Channels", enabled: user.can_manage_workspace_channels, icon: <UserCog className="h-4 w-4" /> },
      { label: "Hidden Channels", enabled: user.can_manage_hidden_channels, icon: <Lock className="h-4 w-4" /> },
      { label: "Workspace Notes", enabled: user.can_manage_workspace_notes, icon: <FileText className="h-4 w-4" /> },
      { label: "Shared Notes", enabled: user.can_create_shared_notes, icon: <FileText className="h-4 w-4" /> },
      { label: "Polls", enabled: user.can_create_workspace_polls, icon: <Activity className="h-4 w-4" /> },
      { label: "Wake Alerts", enabled: user.can_send_workspace_wake_alerts, icon: <Bell className="h-4 w-4" /> },
      { label: "Member Details", enabled: user.can_view_workspace_member_details, icon: <Fingerprint className="h-4 w-4" /> },
      { label: "Full Workspace", enabled: user.can_manage_all_workspace, icon: <ShieldCheck className="h-4 w-4" /> },
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

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(""), 1600)
    } catch {
      setCopied("")
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

  if (!user || !risk) return null

  const accountTone: BadgeTone =
    user.is_blocked || user.pending_deletion || user.deleted_at ? "red" : "green"

  const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: "overview", label: "Overview", icon: <User className="h-4 w-4" /> },
    { key: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
    { key: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    { key: "permissions", label: "Permissions", icon: <Shield className="h-4 w-4" /> },
  ]

  const examDate =
    user.exam_month || user.exam_year
      ? `${user.exam_month || "—"} / ${user.exam_year || "—"}`
      : "—"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] text-[#101828]">
      <div
        className="sticky top-0 z-20 bg-[#F8FAFC]/95 px-6 py-4 backdrop-blur"
        style={{ borderBottom: "1px solid #EAECF0" }}
      >
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3">
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-[12.5px] font-semibold"
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
            <div className="text-[13px] font-semibold" style={{ color: "#101828" }}>
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

      <main className="mx-auto max-w-[1440px] space-y-6 p-5 md:p-6">
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

        {copied ? (
          <div
            className="rounded-2xl bg-white px-4 py-3 text-[13px]"
            style={{
              border: "1px solid #ABEFC6",
              color: "#027A48",
            }}
          >
            Copied {copied}.
          </div>
        ) : null}

        <section
          className="overflow-hidden rounded-[28px] bg-white"
          style={{
            border: "1px solid #EAECF0",
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div className="relative overflow-hidden p-6">
            <div
              className="absolute right-0 top-0 h-full w-[380px] opacity-80"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 50%), radial-gradient(circle at bottom right, rgba(16,185,129,0.10), transparent 45%)",
              }}
            />

            <div className="relative flex flex-wrap items-start gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] text-[28px] font-bold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #1D2939, #475467)" }}
              >
                {initials(user)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[34px] font-bold tracking-[-0.055em]" style={{ color: "#101828" }}>
                    {safeName(user)}
                  </h1>
                  {user.mbe_access ? <Badge tone="green">MBE access</Badge> : <Badge>No MBE access</Badge>}
                  <Badge tone={risk.tone}>{risk.label}</Badge>
                </div>

                <div className="mt-3 grid gap-2 text-[13px] md:grid-cols-4" style={{ color: "#667085" }}>
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{user.jurisdiction || "No jurisdiction"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{user.law_school || "No law school"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Exam {examDate}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText("email", user.email)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-50 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copy email
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadUser()}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-50 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="relative flex flex-wrap justify-end gap-2">
                {user.is_blocked ? (
                  <ActionButton
                    tone="success"
                    onClick={() => void runAction("unblock")}
                    disabled={savingAction === "unblock"}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Unblock
                  </ActionButton>
                ) : (
                  <ActionButton
                    tone="danger"
                    onClick={() => void runAction("block")}
                    disabled={savingAction === "block"}
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </ActionButton>
                )}

                {user.is_admin ? (
                  <ActionButton
                    onClick={() => void runAction("remove_admin")}
                    disabled={savingAction === "remove_admin"}
                  >
                    <UserCog className="h-4 w-4" />
                    Remove admin
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={() => void runAction("make_admin")}
                    disabled={savingAction === "make_admin"}
                  >
                    <UserCog className="h-4 w-4" />
                    Make admin
                  </ActionButton>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-[#EAECF0]" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <MetricCard
              label="Current plan"
              value={planLabel(user)}
              sub="Profile subscription tier"
              tone={planTone(user)}
              icon={<Wallet className="h-4 w-4" />}
            />
            <MetricCard
              label="Last active"
              value={formatRelative(user.last_active_at)}
              sub={normalizeSource(user.last_activity_source)}
              tone={user.is_online ? "green" : "blue"}
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              label="Last login"
              value={formatRelative(user.last_login_at)}
              sub={formatDateTime(user.last_login_at)}
              tone="purple"
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              label="Location"
              value={user.last_country || "—"}
              sub={user.last_ip_address || "No IP captured"}
              tone="cyan"
              icon={<Globe2 className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="grid gap-6" style={{ gridTemplateColumns: "360px minmax(0, 1fr)" }}>
          <aside className="space-y-5">
            <Panel title="Account risk" description="Restriction and privilege status.">
              <div className="p-5">
                <div
                  className="flex items-start gap-4 rounded-2xl p-4"
                  style={toneStyle(risk.tone)}
                >
                  <div className="mt-0.5">{risk.icon}</div>
                  <div>
                    <div className="text-[14px] font-bold">{risk.title}</div>
                    <div className="mt-1 text-[12px] leading-5">{risk.description}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Role</span>
                    <span className="font-semibold text-slate-950">{user.role || "user"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Admin role</span>
                    <span className="font-semibold text-slate-950">{user.admin_role || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Account age</span>
                    <span className="font-semibold text-slate-950">{user.account_age_days} days</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Workspace</span>
                    <span className="font-semibold text-slate-950">{user.workspace_status || "—"}</span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Device snapshot" description="Latest captured access data.">
              <div className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <MonitorSmartphone className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-950">User agent</div>
                    <div className="mt-1 break-words text-[12px] leading-5 text-slate-500">
                      {user.last_user_agent || "No user agent captured"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Network className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-[13px] font-semibold text-slate-950">IP address</div>
                    <div className="mt-1 text-[12px] text-slate-500">{user.last_ip_address || "—"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe2 className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-[13px] font-semibold text-slate-950">Location</div>
                    <div className="mt-1 text-[12px] text-slate-500">{locationLabel(user)}</div>
                  </div>
                </div>
              </div>
            </Panel>
          </aside>

          <section className="min-w-0 space-y-5">
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
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition"
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
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="space-y-5">
                <Panel title="Profile" description="Basic account and bar preparation information.">
                  <InfoGrid columns={3}>
                    <InfoItem label="Full name" value={user.full_name || "—"} />
                    <InfoItem label="Email" value={user.email} />
                    <InfoItem label="Phone" value={user.phone_number || "—"} />
                    <InfoItem label="Law school" value={user.law_school || "—"} />
                    <InfoItem label="Jurisdiction" value={user.jurisdiction || "—"} />
                    <InfoItem label="Exam date" value={examDate} />
                  </InfoGrid>
                </Panel>

                <Panel title="Access configuration" description="Platform access, subscriptions, and stored preferences.">
                  <InfoGrid columns={3}>
                    <InfoItem label="Status" value={statusLabel(user)} />
                    <InfoItem label="Plan" value={planLabel(user)} />
                    <InfoItem label="MBE access" value={user.mbe_access ? "Enabled" : "Disabled"} />
                    <InfoItem label="Created" value={formatDateTime(user.created_at)} />
                    <InfoItem label="Updated" value={formatDateTime(user.updated_at)} />
                    <InfoItem label="Deletion requested" value={formatDateTime(user.deletion_requested_at)} />
                  </InfoGrid>
                </Panel>

                <Panel title="Recent user journey" description="Real timestamps from profile activity fields.">
                  <div className="space-y-4 p-5">
                    <TimelineItem
                      tone="blue"
                      icon={<Activity className="h-4 w-4" />}
                      title="Last activity"
                      description={normalizeSource(user.last_activity_source)}
                      time={formatRelative(user.last_active_at)}
                    />
                    <TimelineItem
                      tone="purple"
                      icon={<Clock className="h-4 w-4" />}
                      title="Last login"
                      description={formatDateTime(user.last_login_at)}
                      time={formatRelative(user.last_login_at)}
                    />
                    <TimelineItem
                      tone="green"
                      icon={<Check className="h-4 w-4" />}
                      title="Account created"
                      description={formatDateTime(user.created_at)}
                      time={`${user.account_age_days} days ago`}
                    />
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeTab === "billing" ? (
              <div className="space-y-5">
                <Panel
                  title="Billing & Subscription"
                  description="Only real stored billing values are shown. Paddle transaction data needs database tables."
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
                  </InfoGrid>
                </Panel>

                <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <Panel title="Discounts & coupons" description="Requires real Paddle discount records.">
                    <InfoGrid>
                      <InfoItem label="Discount used" value="—" />
                      <InfoItem label="Coupon code" value="—" />
                      <InfoItem label="Discount type" value="—" />
                      <InfoItem label="Discount amount" value="—" />
                    </InfoGrid>
                  </Panel>

                  <Panel title="Payment status" description="Requires real Paddle transaction records.">
                    <InfoGrid>
                      <InfoItem label="First payment" value="—" />
                      <InfoItem label="Last payment" value="—" />
                      <InfoItem label="Next billing date" value="—" />
                      <InfoItem label="Refunds" value="—" />
                    </InfoGrid>
                  </Panel>
                </div>

                <Panel title="Payment history" description="Future Paddle transactions will appear here.">
                  <EmptyBillingState />
                </Panel>
              </div>
            ) : null}

            {activeTab === "activity" ? (
              <div className="space-y-5">
                <Panel title="Login & activity" description="Recent app activity captured by login and heartbeat tracking.">
                  <InfoGrid columns={3}>
                    <InfoItem label="Online status" value={user.is_online ? "Online now" : "Offline"} />
                    <InfoItem label="Activity source" value={normalizeSource(user.last_activity_source)} />
                    <InfoItem label="Workspace status" value={user.workspace_status || "—"} />
                    <InfoItem label="Last login" value={`${formatRelative(user.last_login_at)} · ${formatDateTime(user.last_login_at)}`} />
                    <InfoItem label="Last active" value={`${formatRelative(user.last_active_at)} · ${formatDateTime(user.last_active_at)}`} />
                    <InfoItem label="Timezone" value={user.last_timezone || "—"} />
                  </InfoGrid>
                </Panel>

                <Panel title="Location & device" description="Latest IP, region, device, and browser information.">
                  <InfoGrid columns={3}>
                    <InfoItem label="Location" value={locationLabel(user)} />
                    <InfoItem label="IP address" value={user.last_ip_address || "—"} />
                    <InfoItem label="Country" value={user.last_country || "—"} />
                    <InfoItem label="Region" value={user.last_region || "—"} />
                    <InfoItem label="City" value={user.last_city || "—"} />
                    <InfoItem
                      label="Coordinates"
                      value={
                        user.last_latitude || user.last_longitude
                          ? `${user.last_latitude || "—"}, ${user.last_longitude || "—"}`
                          : "—"
                      }
                    />
                  </InfoGrid>
                </Panel>

                <Panel title="Raw device string" description="Stored user agent from the latest activity.">
                  <div className="p-5">
                    <pre className="max-h-[180px] overflow-auto rounded-2xl bg-slate-50 p-4 text-[12px] leading-6 text-slate-600">
                      {user.last_user_agent || "No user agent captured"}
                    </pre>
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeTab === "permissions" ? (
              <div className="space-y-5">
                <Panel title="Admin permissions" description="Permission flags currently stored on the user profile.">
                  <div className="grid gap-3 p-5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    {adminPermissionItems.map((item) => (
                      <PermissionTile
                        key={item.label}
                        label={item.label}
                        enabled={item.enabled}
                        icon={item.icon}
                      />
                    ))}
                  </div>
                </Panel>

                <Panel title="Workspace permissions" description="Workspace-specific permissions for internal collaboration tools.">
                  <div className="grid gap-3 p-5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    {workspacePermissionItems.map((item) => (
                      <PermissionTile
                        key={item.label}
                        label={item.label}
                        enabled={item.enabled}
                        icon={item.icon}
                      />
                    ))}
                  </div>
                </Panel>

                <Panel title="User preferences" description="Personal app settings configured by the user.">
                  <InfoGrid columns={2}>
                    <InfoItem label="Email announcements" value={user.email_announcements ? "Enabled" : "Disabled"} />
                    <InfoItem label="Study reminders" value={user.study_reminders ? "Enabled" : "Disabled"} />
                    <InfoItem label="Sound effects" value={user.sound_effects ? "Enabled" : "Disabled"} />
                    <InfoItem label="Compact mode" value={user.compact_mode ? "Enabled" : "Disabled"} />
                  </InfoGrid>
                </Panel>
              </div>
            ) : null}
          </section>
        </section>

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
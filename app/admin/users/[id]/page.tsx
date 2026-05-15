"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Globe2,
  Laptop,
  Mail,
  MapPin,
  Shield,
  UserCog,
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

function safeName(user: AdminUserDetail) {
  if (user.full_name && user.full_name.trim()) return user.full_name
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
  if (user.is_blocked) return "Blocked"
  if (user.pending_deletion) return "Pending deletion"
  if (user.deleted_at) return "Deleted"
  return "Active"
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "green" | "red" | "blue" | "yellow" | "purple"
}) {
  const styles: Record<string, React.CSSProperties> = {
    neutral: {
      background: "#f3f4f6",
      color: "#64748b",
      border: "1px solid rgba(15,23,42,0.08)",
    },
    green: {
      background: "rgba(34,197,94,0.10)",
      color: "#16a34a",
      border: "1px solid rgba(34,197,94,0.18)",
    },
    red: {
      background: "rgba(239,68,68,0.10)",
      color: "#dc2626",
      border: "1px solid rgba(239,68,68,0.18)",
    },
    blue: {
      background: "rgba(79,70,229,0.10)",
      color: "#4f46e5",
      border: "1px solid rgba(79,70,229,0.18)",
    },
    yellow: {
      background: "rgba(234,179,8,0.12)",
      color: "#ca8a04",
      border: "1px solid rgba(234,179,8,0.22)",
    },
    purple: {
      background: "rgba(168,85,247,0.10)",
      color: "#9333ea",
      border: "1px solid rgba(168,85,247,0.20)",
    },
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
      style={styles[tone]}
    >
      {children}
    </span>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl bg-white"
      style={{
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="px-5 py-4 text-[13px] font-semibold"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
      >
        {title}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <div
        className="mb-1 text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </div>
      <div className="break-words text-[13px] font-medium" style={{ color: "#111827" }}>
        {value || "—"}
      </div>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingAction, setSavingAction] = useState("")
  const [error, setError] = useState("")

  const userId = params?.id

  const permissionItems = useMemo(() => {
    if (!user) return []

    return [
      ["Manage questions", user.can_manage_questions],
      ["Manage rules", user.can_manage_rules],
      ["Manage users", user.can_manage_users],
      ["Manage announcements", user.can_manage_announcements],
      ["View billing", user.can_view_billing],
      ["Manage coupons", user.can_manage_coupons],
      ["Manage settings", user.can_manage_settings],
      ["View audit log", user.can_view_audit_log],
      ["Manage workspace members", user.can_manage_workspace_members],
      ["Create workspace channels", user.can_create_workspace_channels],
      ["Manage workspace channels", user.can_manage_workspace_channels],
      ["Manage hidden channels", user.can_manage_hidden_channels],
      ["Manage workspace notes", user.can_manage_workspace_notes],
      ["Create shared notes", user.can_create_shared_notes],
      ["Create workspace polls", user.can_create_workspace_polls],
      ["Send workspace wake alerts", user.can_send_workspace_wake_alerts],
      ["View workspace member details", user.can_view_workspace_member_details],
      ["Manage all workspace", user.can_manage_all_workspace],
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
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f7f5] p-6">
        <div className="text-[13px]" style={{ color: "#64748b" }}>
          Loading user record...
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f7f5] p-6">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium"
          style={{ color: "#4f46e5" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>

        <div
          className="rounded-xl bg-white p-5 text-[13px]"
          style={{
            border: "1px solid rgba(239,68,68,0.18)",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (!user) return null

  const onlineTone = user.is_online ? "green" : "neutral"
  const accountTone = user.is_blocked || user.pending_deletion ? "red" : "green"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f7f5] text-[#111827]">
      <div
        className="flex flex-wrap items-center gap-3 px-6 py-4"
        style={{
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          background: "#f7f7f5",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-[12.5px] font-medium"
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#374151",
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="ml-0 md:ml-2">
          <div className="text-[15px] font-semibold">User Record</div>
          <div className="mt-px text-[12px]" style={{ color: "#64748b" }}>
            {user.email}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone={accountTone}>{statusLabel(user)}</Badge>
          <Badge tone={onlineTone}>{user.is_online ? "Online" : "Offline"}</Badge>
          {user.is_admin ? <Badge tone="purple">Admin</Badge> : <Badge>Standard user</Badge>}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {error ? (
          <div
            className="rounded-xl bg-white px-4 py-3 text-[13px]"
            style={{
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="rounded-2xl bg-white p-5"
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
          }}
        >
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #6c72ff, #818cf8)",
              }}
            >
              {initials(user)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  {safeName(user)}
                </h1>
                <Badge tone={user.subscription_tier === "free" ? "neutral" : "blue"}>
                  {user.subscription_tier || "free"}
                </Badge>
                {user.mbe_access ? (
                  <Badge tone="green">MBE access</Badge>
                ) : (
                  <Badge>No MBE access</Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                <span className="inline-flex items-center gap-2" style={{ color: "#64748b" }}>
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-2" style={{ color: "#64748b" }}>
                  <Shield className="h-4 w-4" />
                  {user.role || "user"} · {user.admin_role || "user"}
                </span>
                <span className="inline-flex items-center gap-2" style={{ color: "#64748b" }}>
                  <Clock className="h-4 w-4" />
                  Account age: {user.account_age_days} days
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user.is_blocked ? (
                <button
                  type="button"
                  onClick={() => runAction("unblock")}
                  disabled={savingAction === "unblock"}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-semibold text-white disabled:opacity-60"
                  style={{ background: "#16a34a" }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Unblock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runAction("block")}
                  disabled={savingAction === "block"}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-semibold text-white disabled:opacity-60"
                  style={{ background: "#dc2626" }}
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
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[12.5px] font-semibold disabled:opacity-60"
                  style={{
                    border: "1px solid rgba(15,23,42,0.10)",
                    color: "#374151",
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
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[12.5px] font-semibold disabled:opacity-60"
                  style={{
                    border: "1px solid rgba(15,23,42,0.10)",
                    color: "#374151",
                  }}
                >
                  <UserCog className="h-4 w-4" />
                  Make admin
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Card title="Profile Information">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full name" value={user.full_name || "—"} />
                <Field label="Email" value={user.email} />
                <Field label="Phone number" value={user.phone_number || "—"} />
                <Field label="Law school" value={user.law_school || "—"} />
                <Field label="Jurisdiction" value={user.jurisdiction || "—"} />
                <Field
                  label="Exam date"
                  value={
                    user.exam_month || user.exam_year
                      ? `${user.exam_month || "—"} / ${user.exam_year || "—"}`
                      : "—"
                  }
                />
              </div>
            </Card>

            <Card title="Account and Subscription">
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Subscription tier" value={user.subscription_tier || "free"} />
                <Field label="MBE access" value={user.mbe_access ? "Enabled" : "Disabled"} />
                <Field label="Account status" value={statusLabel(user)} />
                <Field label="Role" value={user.role || "user"} />
                <Field label="Admin role" value={user.admin_role || "user"} />
                <Field label="Workspace status" value={user.workspace_status || "—"} />
                <Field label="Created at" value={formatDateTime(user.created_at)} />
                <Field label="Updated at" value={formatDateTime(user.updated_at)} />
                <Field
                  label="Deletion requested"
                  value={formatDateTime(user.deletion_requested_at)}
                />
              </div>
            </Card>

            <Card title="Admin Permissions">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {permissionItems.map(([label, enabled]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: enabled ? "rgba(34,197,94,0.06)" : "#f8fafc",
                    }}
                  >
                    <span className="text-[12px]" style={{ color: "#374151" }}>
                      {label}
                    </span>
                    <Badge tone={enabled ? "green" : "neutral"}>
                      {enabled ? "Yes" : "No"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Login and Activity">
              <div className="space-y-5">
                <Field
                  label="Online status"
                  value={user.is_online ? "Online now" : "Offline"}
                />
                <Field
                  label="Last login"
                  value={`${formatRelative(user.last_login_at)} · ${formatDateTime(
                    user.last_login_at
                  )}`}
                />
                <Field
                  label="Last active"
                  value={`${formatRelative(user.last_active_at)} · ${formatDateTime(
                    user.last_active_at
                  )}`}
                />
                <Field
                  label="Activity source"
                  value={normalizeSource(user.last_activity_source)}
                />
              </div>
            </Card>

            <Card title="Location and Device">
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
                  <Field label="Location" value={locationLabel(user)} />
                </div>

                <div className="flex items-start gap-3">
                  <Globe2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
                  <Field label="IP address" value={user.last_ip_address || "—"} />
                </div>

                <Field label="Country" value={user.last_country || "—"} />
                <Field label="Region" value={user.last_region || "—"} />
                <Field label="City" value={user.last_city || "—"} />
                <Field label="Timezone" value={user.last_timezone || "—"} />
                <Field
                  label="Coordinates"
                  value={
                    user.last_latitude || user.last_longitude
                      ? `${user.last_latitude || "—"}, ${user.last_longitude || "—"}`
                      : "—"
                  }
                />

                <div className="flex items-start gap-3">
                  <Laptop className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
                  <Field label="User agent" value={user.last_user_agent || "—"} />
                </div>
              </div>
            </Card>

            <Card title="User Preferences">
              <div className="grid gap-3">
                <Field
                  label="Email announcements"
                  value={user.email_announcements ? "Enabled" : "Disabled"}
                />
                <Field
                  label="Study reminders"
                  value={user.study_reminders ? "Enabled" : "Disabled"}
                />
                <Field
                  label="Sound effects"
                  value={user.sound_effects ? "Enabled" : "Disabled"}
                />
                <Field
                  label="Compact mode"
                  value={user.compact_mode ? "Enabled" : "Disabled"}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

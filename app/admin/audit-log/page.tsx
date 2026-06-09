"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Globe2,
  Layers,
  Loader2,
  Lock,
  MoreHorizontal,
  Network,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  X,
} from "lucide-react"

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
type DateRange = "24h" | "7d" | "10d" | "30d" | "90d" | "all" | "custom"

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

type ActorOption = {
  id: string
  name: string
  email: string
  label: string
  actorType: string
}

type ChartPoint = {
  label: string
  total: number
  critical: number
  high: number
  normal: number
  low: number
}

type AuditSummary = {
  total: number
  critical: number
  high: number
  uniqueActors: number
  uniqueIps: number
  latestEventAt: string | null
  averageRisk: number
}

type AuditResponse = {
  ok: boolean
  summary: AuditSummary
  chart?: ChartPoint[]
  events: AuditEvent[]
  totalMatched: number
  returned: number
  maxLookbackRows: number
  filters?: {
    actors?: ActorOption[]
    entities?: string[]
  }
  error?: string
}

type AdminUserPreview = {
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
  pending_deletion: boolean
  deleted_at: string | null
  workspace_status: string | null
  last_login_at: string | null
  last_active_at: string | null
  last_ip_address: string | null
  last_country: string | null
  last_region: string | null
  last_city: string | null
  last_timezone: string | null
  last_user_agent: string | null
  last_activity_source: string | null
  created_at: string
  updated_at: string
  account_age_days: number
  is_online: boolean
}

type UserPreviewResponse = {
  ok: boolean
  user?: AdminUserPreview
  error?: string
}

type BadgeTone = "slate" | "green" | "blue" | "red" | "orange" | "purple" | "cyan"

const defaultSummary: AuditSummary = {
  total: 0,
  critical: 0,
  high: 0,
  uniqueActors: 0,
  uniqueIps: 0,
  latestEventAt: null,
  averageRisk: 0,
}

const categoryOptions: { label: string; value: AuditCategory }[] = [
  { label: "All Categories", value: "all" },
  { label: "Auth", value: "auth" },
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
  { label: "Billing", value: "billing" },
  { label: "Content", value: "content" },
  { label: "Support", value: "support" },
  { label: "Workspace", value: "workspace" },
  { label: "System", value: "system" },
]

const severityOptions: { label: string; value: AuditSeverity }[] = [
  { label: "All Severity", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High Risk", value: "high" },
  { label: "Normal", value: "normal" },
  { label: "Low", value: "low" },
]

const actorTypeOptions: { label: string; value: ActorType }[] = [
  { label: "All Actors", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Users", value: "user" },
  { label: "System", value: "system" },
]

const ipOptions: { label: string; value: IpFilter }[] = [
  { label: "Any IP", value: "all" },
  { label: "Has IP", value: "present" },
  { label: "Missing IP", value: "missing" },
]

const rangeOptions: { label: string; value: DateRange }[] = [
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "10 Days", value: "10d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all" },
  { label: "Custom", value: "custom" },
]

const SAVED_VIEW_KEY = "lexora-admin-audit-log-view"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value)
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

function safeName(value?: string | null, fallback = "Unknown user") {
  if (value && value.trim()) return value.trim()
  return fallback
}

function userDisplayName(user: AdminUserPreview) {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  return user.email.split("@")[0]
}

function initials(value?: string | null) {
  const clean = safeName(value, "User")
  const parts = clean.split(" ").filter(Boolean)

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()

  return clean.slice(0, 2).toUpperCase()
}

function shortId(value: string | null | undefined) {
  if (!value) return "—"
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not recorded"

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatRelative(dateString?: string | null) {
  if (!dateString) return "No activity"

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "No activity"

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

function simpleDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function groupDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const label = simpleDate(value)

  if (sameDay(date, today)) return `Today · ${label}`
  if (sameDay(date, yesterday)) return `Yesterday · ${label}`

  return label
}

function cleanLawSchool(value?: string | null) {
  if (!value) return "No law school"

  const normalized = value.trim().toUpperCase()

  if (normalized === "HILS") return "Handong International Law School"
  if (normalized === "HLS") return "Harvard Law School"

  return value.trim()
}

function locationLabel(user: AdminUserPreview) {
  const parts = [user.last_city, user.last_region, user.last_country]
    .filter(Boolean)
    .map((part) => String(part))

  if (parts.length === 0) return "No location captured"
  return parts.join(", ")
}

function normalizeSource(value?: string | null) {
  if (!value) return "No source captured"

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function planLabel(user: AdminUserPreview) {
  return user.subscription_tier?.trim() || "Free"
}

function userStatus(user: AdminUserPreview) {
  if (user.deleted_at) return "Deleted"
  if (user.is_blocked) return "Blocked"
  if (user.pending_deletion) return "Pending deletion"
  return "Active"
}

function toneStyle(tone: BadgeTone): CSSProperties {
  const styles: Record<BadgeTone, CSSProperties> = {
    slate: {
      background: "#F8FAFC",
      color: "#475467",
      border: "1px solid #E2E8F0",
    },
    green: {
      background: "#ECFDF3",
      color: "#027A48",
      border: "1px solid #ABEFC6",
    },
    blue: {
      background: "#EEF4FF",
      color: "#3538CD",
      border: "1px solid #C7D7FE",
    },
    red: {
      background: "#FEF3F2",
      color: "#B42318",
      border: "1px solid #FECDCA",
    },
    orange: {
      background: "#FFF7ED",
      color: "#C2410C",
      border: "1px solid #FED7AA",
    },
    purple: {
      background: "#F4F3FF",
      color: "#5925DC",
      border: "1px solid #D9D6FE",
    },
    cyan: {
      background: "#ECFEFF",
      color: "#0E7490",
      border: "1px solid #A5F3FC",
    },
  }

  return styles[tone]
}

function severityTone(value: string): BadgeTone {
  if (value === "critical") return "red"
  if (value === "high") return "orange"
  if (value === "normal") return "blue"
  return "slate"
}

function riskTone(value: number): BadgeTone {
  if (value >= 80) return "red"
  if (value >= 55) return "orange"
  if (value >= 25) return "blue"
  return "slate"
}

function categoryTone(value: string): BadgeTone {
  if (value === "admin") return "purple"
  if (value === "billing") return "green"
  if (value === "auth") return "orange"
  if (value === "support") return "cyan"
  if (value === "workspace") return "blue"
  if (value === "system") return "slate"
  return "blue"
}

function actionDot(value: string) {
  if (value === "critical") return "#E11D48"
  if (value === "high") return "#F97316"
  if (value === "normal") return "#2563EB"
  return "#10B981"
}

function buildQuery(params: {
  search: string
  category: AuditCategory
  severity: AuditSeverity
  actorType: ActorType
  actorId: string
  ip: IpFilter
  entity: string
  range: DateRange
  startDate: string
  endDate: string
  limit: number
  format?: "json" | "csv"
}) {
  const query = new URLSearchParams()

  query.set("search", params.search)
  query.set("category", params.category)
  query.set("severity", params.severity)
  query.set("actorType", params.actorType)
  query.set("actorId", params.actorId)
  query.set("ip", params.ip)
  query.set("entity", params.entity)
  query.set("range", params.range)
  query.set("startDate", params.startDate)
  query.set("endDate", params.endDate)
  query.set("limit", String(params.limit))

  if (params.format) query.set("format", params.format)

  return query.toString()
}

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode
  tone?: BadgeTone
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
      style={toneStyle(tone)}
    >
      {children}
    </span>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { label: string; value: T }[]
  onChange: (value: T) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-1.5 text-[12px]">
      <div className="text-slate-500">{label}</div>
      <div className="break-words font-semibold text-slate-800">{value || "—"}</div>
    </div>
  )
}

function MiniLineChart({
  values,
  tone,
}: {
  values: number[]
  tone: BadgeTone
}) {
  const colorMap: Record<BadgeTone, string> = {
    slate: "#64748B",
    green: "#16A34A",
    blue: "#2563EB",
    red: "#E11D48",
    orange: "#F97316",
    purple: "#7C3AED",
    cyan: "#06B6D4",
  }

  const points = values.length > 1 ? values : [0, 0, 0, 0, 0, 0]
  const max = Math.max(...points, 1)
  const width = 112
  const height = 54
  const step = width / Math.max(points.length - 1, 1)

  const polyline = points
    .map((value, index) => {
      const x = index * step
      const y = height - (value / max) * 42 - 6
      return `${x},${y}`
    })
    .join(" ")

  const area = `0,${height} ${polyline} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`audit-gradient-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colorMap[tone]} stopOpacity="0.24" />
          <stop offset="100%" stopColor={colorMap[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#audit-gradient-${tone})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={colorMap[tone]}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StatCard({
  title,
  value,
  sub,
  tone,
  icon,
  values,
}: {
  title: string
  value: string
  sub: string
  tone: BadgeTone
  icon: ReactNode
  values: number[]
}) {
  return (
    <section
      className="h-[126px] overflow-hidden rounded-[22px] bg-white p-4"
      style={{
        border: "1px solid #E5E7EB",
        boxShadow: "0 14px 36px rgba(15, 23, 42, 0.055)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={toneStyle(tone)}
        >
          {icon}
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
          {title}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[27px] font-bold leading-none tracking-[-0.04em] text-slate-950">
            {value}
          </div>
          <div className="mt-2 truncate text-[12px] font-medium text-slate-500">
            {sub}
          </div>
        </div>

        <MiniLineChart values={values} tone={tone} />
      </div>
    </section>
  )
}

function UserDrawer({
  open,
  loading,
  error,
  user,
  onClose,
  onCopy,
}: {
  open: boolean
  loading: boolean
  error: string
  user: AdminUserPreview | null
  onClose: () => void
  onCopy: (label: string, value: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close user preview"
        className="absolute inset-0 cursor-default bg-slate-950/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="absolute right-0 top-0 h-full w-[480px] overflow-hidden bg-white"
        style={{
          boxShadow: "-24px 0 60px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[15px] font-bold text-slate-950">User Preview</div>
            <div className="text-[12px] text-slate-500">Quick record without leaving audit log</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[calc(100vh-73px)] overflow-auto p-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[13px] font-semibold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading user record...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && user ? (
            <div className="space-y-5">
              <section
                className="relative overflow-hidden rounded-[24px] p-5 text-white"
                style={{
                  background:
                    "radial-gradient(circle at 90% 10%, rgba(255,255,255,0.30), transparent 25%), linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/18 text-[22px] font-bold text-white ring-1 ring-white/25">
                    {initials(userDisplayName(user))}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[24px] font-bold tracking-[-0.04em]">
                      {userDisplayName(user)}
                    </div>
                    <div className="mt-1 truncate text-[13px] text-white/78">{user.email}</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20">
                        {userStatus(user)}
                      </span>
                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20">
                        {user.is_online ? "Online" : "Offline"}
                      </span>
                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20">
                        {planLabel(user)}
                      </span>
                      {user.is_admin ? (
                        <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20">
                          {user.admin_role || "Admin"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    <Activity className="h-4 w-4" />
                    Last active
                  </div>
                  <div className="mt-3 text-[20px] font-bold tracking-[-0.04em] text-slate-950">
                    {formatRelative(user.last_active_at)}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {formatDateTime(user.last_active_at)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    <Globe2 className="h-4 w-4" />
                    Location
                  </div>
                  <div className="mt-3 text-[20px] font-bold tracking-[-0.04em] text-slate-950">
                    {user.last_country || "—"}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {user.last_ip_address || "No IP captured"}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3 text-[13px] font-bold text-slate-950">
                  Account details
                </div>
                <div className="p-4">
                  <DetailRow label="Email" value={user.email} />
                  <DetailRow label="Role" value={`${user.role || "user"} · ${user.admin_role || "standard"}`} />
                  <DetailRow label="Plan" value={planLabel(user)} />
                  <DetailRow label="MBE access" value={user.mbe_access ? "Enabled" : "Disabled"} />
                  <DetailRow label="Jurisdiction" value={user.jurisdiction || "—"} />
                  <DetailRow label="Law school" value={cleanLawSchool(user.law_school)} />
                  <DetailRow label="Created" value={formatDateTime(user.created_at)} />
                  <DetailRow label="Updated" value={formatDateTime(user.updated_at)} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3 text-[13px] font-bold text-slate-950">
                  Activity and device
                </div>
                <div className="p-4">
                  <DetailRow label="Last login" value={formatDateTime(user.last_login_at)} />
                  <DetailRow label="Last active" value={formatDateTime(user.last_active_at)} />
                  <DetailRow label="Source" value={normalizeSource(user.last_activity_source)} />
                  <DetailRow label="IP" value={user.last_ip_address || "—"} />
                  <DetailRow label="Location" value={locationLabel(user)} />
                  <DetailRow label="Timezone" value={user.last_timezone || "—"} />
                  <DetailRow label="User agent" value={user.last_user_agent || "—"} />
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCopy("email", user.email)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy email
                </button>

                <button
                  type="button"
                  onClick={() => onCopy("user ID", user.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Clipboard className="h-4 w-4" />
                  Copy ID
                </button>
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

export default function AdminAuditLogPage() {
  const todayIso = new Date().toISOString().slice(0, 10)

  const [draftSearch, setDraftSearch] = useState("")
  const [draftCategory, setDraftCategory] = useState<AuditCategory>("all")
  const [draftSeverity, setDraftSeverity] = useState<AuditSeverity>("all")
  const [draftActorType, setDraftActorType] = useState<ActorType>("all")
  const [draftActorId, setDraftActorId] = useState("")
  const [draftActorSearch, setDraftActorSearch] = useState("")
  const [draftIp, setDraftIp] = useState<IpFilter>("all")
  const [draftEntity, setDraftEntity] = useState("")
  const [draftRange, setDraftRange] = useState<DateRange>("7d")
  const [draftStartDate, setDraftStartDate] = useState("")
  const [draftEndDate, setDraftEndDate] = useState(todayIso)
  const [draftLimit, setDraftLimit] = useState(50)

  const [appliedSearch, setAppliedSearch] = useState("")
  const [appliedCategory, setAppliedCategory] = useState<AuditCategory>("all")
  const [appliedSeverity, setAppliedSeverity] = useState<AuditSeverity>("all")
  const [appliedActorType, setAppliedActorType] = useState<ActorType>("all")
  const [appliedActorId, setAppliedActorId] = useState("")
  const [appliedIp, setAppliedIp] = useState<IpFilter>("all")
  const [appliedEntity, setAppliedEntity] = useState("")
  const [appliedRange, setAppliedRange] = useState<DateRange>("7d")
  const [appliedStartDate, setAppliedStartDate] = useState("")
  const [appliedEndDate, setAppliedEndDate] = useState(todayIso)
  const [appliedLimit, setAppliedLimit] = useState(50)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [summary, setSummary] = useState<AuditSummary>(defaultSummary)
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [totalMatched, setTotalMatched] = useState(0)
  const [actors, setActors] = useState<ActorOption[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState("")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [page, setPage] = useState(1)

  const [userDrawerOpen, setUserDrawerOpen] = useState(false)
  const [userPreviewLoading, setUserPreviewLoading] = useState(false)
  const [userPreviewError, setUserPreviewError] = useState("")
  const [userPreview, setUserPreview] = useState<AdminUserPreview | null>(null)

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0] ?? null,
    [events, selectedId]
  )

  const filteredActorOptions = useMemo(() => {
    const search = draftActorSearch.trim().toLowerCase()

    if (!search) return actors.slice(0, 25)

    return actors
      .filter((actor) =>
        [actor.name, actor.email, actor.label, actor.actorType]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 25)
  }, [actors, draftActorSearch])

  const pageSize = Math.max(10, Math.min(50, appliedLimit))
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize))
  const normalizedPage = Math.min(page, pageCount)
  const pageEvents = events.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)

  const groupedPageEvents = useMemo(() => {
    const groups = new Map<string, AuditEvent[]>()

    for (const event of pageEvents) {
      const label = groupDateLabel(event.createdAt)
      const current = groups.get(label) ?? []
      current.push(event)
      groups.set(label, current)
    }

    return Array.from(groups.entries())
  }, [pageEvents])

  const activeAdvancedCount = [
    draftActorId,
    draftEntity,
    draftRange === "custom" && (draftStartDate || draftEndDate),
  ].filter(Boolean).length

  const chartTotals = chart.map((item) => item.total)
  const chartCritical = chart.map((item) => item.critical)
  const chartHigh = chart.map((item) => item.high)
  const chartIps = chart.map((item) => Math.max(item.total - item.critical - item.high, 0))
  const securityValues = chart.map((item) => Math.max(item.critical + item.high, 0))

  useEffect(() => {
    void loadAuditLog()
  }, [
    appliedSearch,
    appliedCategory,
    appliedSeverity,
    appliedActorType,
    appliedActorId,
    appliedIp,
    appliedEntity,
    appliedRange,
    appliedStartDate,
    appliedEndDate,
    appliedLimit,
  ])

  async function loadAuditLog() {
    try {
      setLoading(true)
      setError("")

      const query = buildQuery({
        search: appliedSearch,
        category: appliedCategory,
        severity: appliedSeverity,
        actorType: appliedActorType,
        actorId: appliedActorId,
        ip: appliedIp,
        entity: appliedEntity,
        range: appliedRange,
        startDate: appliedStartDate,
        endDate: appliedEndDate,
        limit: appliedLimit,
      })

      const res = await fetch(`/api/admin/audit-log?${query}`, { cache: "no-store" })
      const data = (await res.json().catch(() => null)) as AuditResponse | null

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load audit log.")
        setEvents([])
        setSummary(defaultSummary)
        setChart([])
        setTotalMatched(0)
        return
      }

      const nextEvents = Array.isArray(data.events) ? data.events : []

      setEvents(nextEvents)
      setSummary(data.summary || defaultSummary)
      setChart(Array.isArray(data.chart) ? data.chart : [])
      setTotalMatched(Number(data.totalMatched || 0))
      setActors(Array.isArray(data.filters?.actors) ? data.filters.actors : [])
      setEntities(Array.isArray(data.filters?.entities) ? data.filters.entities : [])
      setPage(1)

      if (nextEvents.length) {
        const stillExists = nextEvents.some((event) => event.id === selectedId)
        setSelectedId(stillExists ? selectedId : nextEvents[0].id)
      } else {
        setSelectedId(null)
      }
    } catch (err) {
      console.error("LOAD AUDIT LOG ERROR:", err)
      setError("Something went wrong while loading the audit log.")
      setEvents([])
      setSummary(defaultSummary)
      setChart([])
      setTotalMatched(0)
    } finally {
      setLoading(false)
    }
  }

  async function openUserPreview(userId: string) {
    if (!userId) {
      setUserPreviewError("No user ID is available for this event.")
      setUserDrawerOpen(true)
      return
    }

    try {
      setUserDrawerOpen(true)
      setUserPreviewLoading(true)
      setUserPreviewError("")
      setUserPreview(null)

      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" })
      const data = (await res.json().catch(() => null)) as UserPreviewResponse | null

      if (!res.ok || !data?.ok || !data.user) {
        setUserPreviewError(data?.error || "Failed to load user preview.")
        return
      }

      setUserPreview(data.user)
    } catch (err) {
      console.error("LOAD USER PREVIEW ERROR:", err)
      setUserPreviewError("Something went wrong while loading this user.")
    } finally {
      setUserPreviewLoading(false)
    }
  }

  function applyFilters() {
    setAppliedSearch(draftSearch)
    setAppliedCategory(draftCategory)
    setAppliedSeverity(draftSeverity)
    setAppliedActorType(draftActorType)
    setAppliedActorId(draftActorId)
    setAppliedIp(draftIp)
    setAppliedEntity(draftEntity)
    setAppliedRange(draftRange)
    setAppliedStartDate(draftStartDate)
    setAppliedEndDate(draftEndDate)
    setAppliedLimit(draftLimit)
  }

  function resetFilters() {
    setDraftSearch("")
    setDraftCategory("all")
    setDraftSeverity("all")
    setDraftActorType("all")
    setDraftActorId("")
    setDraftActorSearch("")
    setDraftIp("all")
    setDraftEntity("")
    setDraftRange("7d")
    setDraftStartDate("")
    setDraftEndDate(todayIso)
    setDraftLimit(50)

    setAppliedSearch("")
    setAppliedCategory("all")
    setAppliedSeverity("all")
    setAppliedActorType("all")
    setAppliedActorId("")
    setAppliedIp("all")
    setAppliedEntity("")
    setAppliedRange("7d")
    setAppliedStartDate("")
    setAppliedEndDate(todayIso)
    setAppliedLimit(50)
  }

  function quickFilter(next: {
    category?: AuditCategory
    severity?: AuditSeverity
    actorType?: ActorType
  }) {
    const category = next.category ?? "all"
    const severity = next.severity ?? "all"
    const actorType = next.actorType ?? "all"

    setDraftCategory(category)
    setDraftSeverity(severity)
    setDraftActorType(actorType)
    setAppliedCategory(category)
    setAppliedSeverity(severity)
    setAppliedActorType(actorType)
  }

  function exportCsv() {
    const query = buildQuery({
      search: appliedSearch,
      category: appliedCategory,
      severity: appliedSeverity,
      actorType: appliedActorType,
      actorId: appliedActorId,
      ip: appliedIp,
      entity: appliedEntity,
      range: appliedRange,
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      limit: appliedLimit,
      format: "csv",
    })

    window.location.href = `/api/admin/audit-log?${query}`
  }

  function saveView() {
    const view = {
      search: draftSearch,
      category: draftCategory,
      severity: draftSeverity,
      actorType: draftActorType,
      actorId: draftActorId,
      actorSearch: draftActorSearch,
      ip: draftIp,
      entity: draftEntity,
      range: draftRange,
      startDate: draftStartDate,
      endDate: draftEndDate,
      limit: draftLimit,
    }

    window.localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(view))
    setCopied("saved view")
    window.setTimeout(() => setCopied(""), 1600)
  }

  function loadSavedView() {
    const raw = window.localStorage.getItem(SAVED_VIEW_KEY)
    if (!raw) return

    try {
      const view = JSON.parse(raw)

      setDraftSearch(view.search || "")
      setDraftCategory(view.category || "all")
      setDraftSeverity(view.severity || "all")
      setDraftActorType(view.actorType || "all")
      setDraftActorId(view.actorId || "")
      setDraftActorSearch(view.actorSearch || "")
      setDraftIp(view.ip || "all")
      setDraftEntity(view.entity || "")
      setDraftRange(view.range || "7d")
      setDraftStartDate(view.startDate || "")
      setDraftEndDate(view.endDate || todayIso)
      setDraftLimit(Number(view.limit || 50))
      setMoreOpen(false)
    } catch {
      window.localStorage.removeItem(SAVED_VIEW_KEY)
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

  function filterByActor(event: AuditEvent) {
    if (event.actorId) {
      setDraftActorId(event.actorId)
      setAppliedActorId(event.actorId)
      return
    }

    if (event.actorName) {
      setDraftSearch(event.actorName)
      setAppliedSearch(event.actorName)
    }
  }

  return (
    <>
      <div className="min-w-0 overflow-x-auto bg-[#F6F8FB]">
        <div className="min-w-[1380px] px-6 py-6">
          <section className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-slate-950">
                  Audit Log
                </h1>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <p className="mt-2 text-[14px] text-slate-500">
                Monitor and investigate security relevant activities across the platform.
              </p>
            </div>

            <div className="flex h-11 w-[360px] items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters()
                }}
                placeholder="Search anything..."
                className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-slate-400"
              />
              <span className="ml-2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                ⌘K
              </span>
            </div>
          </section>

          <section
            className="mb-6 grid gap-4"
            style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
          >
            <StatCard
              title="Security Status"
              value={summary.critical > 0 ? "Review" : "Stable"}
              sub={summary.critical > 0 ? "Critical events detected" : "No critical threats detected"}
              tone={summary.critical > 0 ? "orange" : "green"}
              icon={summary.critical > 0 ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              values={securityValues}
            />
            <StatCard
              title="Matched Events"
              value={loading ? "..." : formatNumber(summary.total)}
              sub="Current filtered events"
              tone="blue"
              icon={<Activity className="h-4 w-4" />}
              values={chartTotals}
            />
            <StatCard
              title="Critical Events"
              value={loading ? "..." : formatNumber(summary.critical)}
              sub="Highest risk actions"
              tone="red"
              icon={<AlertTriangle className="h-4 w-4" />}
              values={chartCritical}
            />
            <StatCard
              title="High Risk Events"
              value={loading ? "..." : formatNumber(summary.high)}
              sub="Admin, billing, access"
              tone="orange"
              icon={<ShieldAlert className="h-4 w-4" />}
              values={chartHigh}
            />
            <StatCard
              title="Unique IPs"
              value={loading ? "..." : formatNumber(summary.uniqueIps)}
              sub={`${formatNumber(summary.uniqueActors)} actors`}
              tone="purple"
              icon={<Globe2 className="h-4 w-4" />}
              values={chartIps}
            />
            <StatCard
              title="Activity Spike"
              value={summary.averageRisk >= 70 ? "High" : summary.averageRisk >= 35 ? "Medium" : "Low"}
              sub={`Average risk ${summary.averageRisk}`}
              tone="cyan"
              icon={<Sparkles className="h-4 w-4" />}
              values={chartTotals}
            />
          </section>

          <section className="mb-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.055)]">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 112px 124px 124px 44px" }}
            >
              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-3">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters()
                  }}
                  placeholder="Search actor, email, action, entity, IP, event ID, metadata..."
                  className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() => void loadAuditLog()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4 text-blue-600" />
                Refresh
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-blue-600" />
                CSV
              </button>

              <button
                type="button"
                onClick={saveView}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Save className="h-4 w-4 text-blue-600" />
                Save
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((value) => !value)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {moreOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={loadSavedView}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Load saved view
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.localStorage.removeItem(SAVED_VIEW_KEY)
                        setMoreOpen(false)
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear saved view
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className="mt-4 grid gap-3"
              style={{ gridTemplateColumns: "150px 170px 160px 150px 150px 120px 1fr" }}
            >
              <SelectField label="Date Range" value={draftRange} options={rangeOptions} onChange={setDraftRange} />
              <SelectField label="Category" value={draftCategory} options={categoryOptions} onChange={setDraftCategory} />
              <SelectField label="Severity" value={draftSeverity} options={severityOptions} onChange={setDraftSeverity} />
              <SelectField label="Actor Type" value={draftActorType} options={actorTypeOptions} onChange={setDraftActorType} />
              <SelectField label="IP" value={draftIp} options={ipOptions} onChange={setDraftIp} />

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Rows
                </span>
                <select
                  value={draftLimit}
                  onChange={(event) => setDraftLimit(Number(event.target.value))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value={50}>50</option>
                  <option value={75}>75</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={250}>250</option>
                </select>
              </label>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Filter className="h-4 w-4 text-blue-600" />
                  Advanced Filters
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                    {activeAdvancedCount}
                  </span>
                </button>
              </div>
            </div>

            {advancedOpen ? (
              <div
                className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                style={{ gridTemplateColumns: "160px 160px 220px 1fr" }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    From
                  </span>
                  <input
                    type="date"
                    value={draftStartDate}
                    disabled={draftRange !== "custom"}
                    onChange={(event) => setDraftStartDate(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    To
                  </span>
                  <input
                    type="date"
                    value={draftEndDate}
                    disabled={draftRange !== "custom"}
                    onChange={(event) => setDraftEndDate(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Entity
                  </span>
                  <select
                    value={draftEntity}
                    onChange={(event) => setDraftEntity(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="">All Entities</option>
                    {entities.map((entity) => (
                      <option key={entity} value={entity}>
                        {entity}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Search Person
                  </div>
                  <input
                    value={draftActorSearch}
                    onChange={(event) => setDraftActorSearch(event.target.value)}
                    placeholder="Type name or email..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500"
                  />
                  <div className="mt-2 max-h-[126px] overflow-auto rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setDraftActorId("")}
                      className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-slate-50 ${
                        !draftActorId ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700"
                      }`}
                    >
                      All People
                    </button>

                    {filteredActorOptions.map((actor) => (
                      <button
                        key={actor.id}
                        type="button"
                        onClick={() => setDraftActorId(actor.id)}
                        className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-slate-50 ${
                          draftActorId === actor.id
                            ? "bg-blue-50 font-bold text-blue-700"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="block truncate font-bold">{actor.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {actor.email || actor.actorType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => quickFilter({})}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm"
              >
                All
              </button>

              <button
                type="button"
                onClick={() => quickFilter({ severity: "critical" })}
                className="rounded-xl bg-rose-50 px-4 py-2 text-[13px] font-bold text-rose-700"
              >
                Critical
              </button>

              <button
                type="button"
                onClick={() => quickFilter({ severity: "high" })}
                className="rounded-xl bg-orange-50 px-4 py-2 text-[13px] font-bold text-orange-700"
              >
                High Risk
              </button>

              {categoryOptions
                .filter((item) => item.value !== "all")
                .map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => quickFilter({ category: item.value })}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {item.label}
                  </button>
                ))}

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Apply Filters
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            {copied ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700">
                Copied {copied}.
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
          </section>

          <div
            className="grid items-start gap-4"
            style={{ gridTemplateColumns: "minmax(0, 1fr) 430px" }}
          >
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.055)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <div className="text-[15px] font-bold text-slate-950">
                  {loading ? "Loading events..." : `${formatNumber(totalMatched)} events found`}
                </div>
                <div className="text-[12px] font-semibold text-slate-500">
                  Showing {formatNumber(pageEvents.length)} rows
                </div>
              </div>

              <div className="max-h-[690px] overflow-auto">
                <table className="w-full min-w-[930px] text-left">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-[#FBF8F2]">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Risk Score</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-[13px] text-slate-500">
                          Loading audit events...
                        </td>
                      </tr>
                    ) : groupedPageEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-[13px] text-slate-500">
                          No audit events matched the current filters.
                        </td>
                      </tr>
                    ) : (
                      groupedPageEvents.flatMap(([group, groupEvents]) => [
                        <tr key={group} className="bg-slate-50">
                          <td colSpan={8} className="border-b border-slate-200 px-4 py-2 text-[12px] font-bold text-slate-800">
                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                            {group}
                          </td>
                        </tr>,
                        ...groupEvents.map((event) => {
                          const active = selectedEvent?.id === event.id

                          return (
                            <tr
                              key={event.id}
                              onClick={() => setSelectedId(event.id)}
                              className={`cursor-pointer border-b border-slate-100 text-[13px] hover:bg-slate-50 ${
                                active ? "bg-slate-50" : "bg-white"
                              }`}
                            >
                              <td className="whitespace-nowrap px-4 py-4">
                                <div className="font-semibold text-slate-800">{event.timeLabel}</div>
                                <div className="text-[12px] text-slate-500">{simpleDate(event.createdAt)}</div>
                              </td>

                              <td className="px-4 py-4">
                                <Badge tone={severityTone(event.severity)}>{event.severity}</Badge>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                                    {initials(event.actorName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="max-w-[180px] truncate font-bold text-slate-950">
                                      {event.actorName}
                                    </div>
                                    <div className="max-w-[180px] truncate text-[12px] text-slate-500">
                                      {event.actorEmail || event.actorType}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: actionDot(event.severity) }}
                                  />
                                  <span className="font-bold text-blue-700">{event.actionLabel}</span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Badge tone={categoryTone(event.category)}>{event.entityType}</Badge>
                                </div>
                                <div className="mt-1 text-[12px] text-slate-400">{shortId(event.entityId)}</div>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                                {event.ipAddress || "—"}
                              </td>

                              <td className="px-4 py-4">
                                <Badge tone={riskTone(event.riskScore)}>{event.riskScore}</Badge>
                              </td>

                              <td className="px-4 py-4 text-slate-400">
                                <ChevronRight className="h-4 w-4" />
                              </td>
                            </tr>
                          )
                        }),
                      ])
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4">
                <div className="text-[13px] text-slate-500">
                  Showing {events.length === 0 ? 0 : (normalizedPage - 1) * pageSize + 1} to{" "}
                  {Math.min(normalizedPage * pageSize, events.length)} of {formatNumber(events.length)} events
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={normalizedPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: Math.min(4, pageCount) }).map((_, index) => {
                    const pageNumber = index + 1

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 w-9 rounded-lg border text-[13px] font-bold ${
                          normalizedPage === pageNumber
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    disabled={normalizedPage >= pageCount}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <aside className="sticky top-5 max-h-[calc(100vh-40px)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.055)]">
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="text-[15px] font-bold text-slate-950">Event Details</div>
                  <div className="mt-1 text-[12px] text-slate-500">Selected activity record</div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEvent ? (
                    <Badge tone={severityTone(selectedEvent.severity)}>{selectedEvent.severity}</Badge>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[calc(100vh-118px)] overflow-auto p-5">
                {!selectedEvent ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-[13px] text-slate-500">
                    Select an event to inspect details.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <section>
                      <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-700">
                        Event Summary
                      </div>
                      <DetailRow label="Time" value={selectedEvent.createdAtLabel} />
                      <DetailRow label="Event ID" value={selectedEvent.id} />
                      <DetailRow label="Action" value={selectedEvent.actionLabel} />
                      <DetailRow label="Entity" value={selectedEvent.entityType} />
                      <DetailRow label="Actor" value={`${selectedEvent.actorName}${selectedEvent.actorEmail ? ` (${selectedEvent.actorEmail})` : ""}`} />
                      <DetailRow label="Related User" value={selectedEvent.userEmail || selectedEvent.userName || "Unknown user"} />
                    </section>

                    <section className="border-t border-slate-200 pt-4">
                      <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-700">
                        Network
                      </div>
                      <DetailRow label="IP Address" value={selectedEvent.ipAddress || "—"} />
                      <DetailRow label="User Agent" value={selectedEvent.userAgent || "—"} />
                    </section>

                    <section className="border-t border-slate-200 pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-700">
                          Metadata
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyText("metadata JSON", safeJson(selectedEvent.metadata))}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                        >
                          Raw JSON
                        </button>
                      </div>

                      <pre className="max-h-[260px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-700">
                        {safeJson(selectedEvent.metadata)}
                      </pre>
                    </section>

                    <section className="border-t border-slate-200 pt-4">
                      <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-700">
                        Admin Actions
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => void copyText("event ID", selectedEvent.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                          <Copy className="h-4 w-4" />
                          Copy Event ID
                        </button>

                        <button type="button" onClick={() => void copyText("metadata", safeJson(selectedEvent.metadata))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                          <Clipboard className="h-4 w-4" />
                          Copy Metadata
                        </button>

                        <button type="button" onClick={() => void openUserPreview(selectedEvent.userId)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                          <Eye className="h-4 w-4" />
                          View User
                        </button>

                        <button type="button" onClick={() => filterByActor(selectedEvent)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                          <User className="h-4 w-4" />
                          Filter Actor
                        </button>

                        <button type="button" onClick={() => {
                          setDraftEntity(selectedEvent.entityType)
                          setAppliedEntity(selectedEvent.entityType)
                        }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                          <Layers className="h-4 w-4" />
                          Filter Entity
                        </button>

                        <button type="button" disabled={!selectedEvent.ipAddress} onClick={() => {
                          setDraftSearch(selectedEvent.ipAddress)
                          setAppliedSearch(selectedEvent.ipAddress)
                        }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                          <Network className="h-4 w-4" />
                          Filter IP
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <UserDrawer
        open={userDrawerOpen}
        loading={userPreviewLoading}
        error={userPreviewError}
        user={userPreview}
        onClose={() => setUserDrawerOpen(false)}
        onCopy={copyText}
      />
    </>
  )
}
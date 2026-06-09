"use client"

import { useEffect, useMemo, useState } from "react"

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
  chart: ChartPoint[]
  events: AuditEvent[]
  totalMatched: number
  returned: number
  maxLookbackRows: number
  filters: {
    actors: ActorOption[]
    entities: string[]
  }
  error?: string
}

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

function initials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  )
}

function shortId(value: string | null | undefined) {
  if (!value) return "—"
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function severityTone(value: string) {
  if (value === "critical") return "bg-[#FEE4E2] text-[#B42318]"
  if (value === "high") return "bg-[#FFF3E0] text-[#B54708]"
  if (value === "normal") return "bg-[#EAF1FF] text-[#2563EB]"
  return "bg-[#F4F6FA] text-[#667085]"
}

function riskTone(value: number) {
  if (value >= 80) return "border-[#F04438] text-[#B42318] bg-[#FEF3F2]"
  if (value >= 55) return "border-[#F79009] text-[#B54708] bg-[#FFFAEB]"
  if (value >= 25) return "border-[#528BFF] text-[#2563EB] bg-[#EFF6FF]"
  return "border-[#D0D5DD] text-[#475467] bg-white"
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

function dateGroupLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const dateLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date)

  if (sameDay(date, today)) return `Today · ${dateLabel}`
  if (sameDay(date, yesterday)) return `Yesterday · ${dateLabel}`
  return dateLabel
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string
  value: string
  sub: string
}) {
  return (
    <section className="rounded-[20px] border border-[#E6EAF0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
        {title}
      </div>
      <div className="mt-3 text-[30px] font-semibold leading-none text-[#111827]">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-[#667085]">{sub}</div>
    </section>
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
    <label className="flex min-w-[150px] flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#2563EB]"
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
      <div className="text-[#667085]">{label}</div>
      <div className="break-words font-medium text-[#344054]">{value || "—"}</div>
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
  const [draftLimit, setDraftLimit] = useState(75)

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
  const [appliedLimit, setAppliedLimit] = useState(75)

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

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0] ?? null,
    [events, selectedId]
  )

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, AuditEvent[]>()

    for (const event of events) {
      const label = dateGroupLabel(event.createdAt)
      const current = groups.get(label) ?? []
      current.push(event)
      groups.set(label, current)
    }

    return Array.from(groups.entries())
  }, [events])

  const filteredActorOptions = useMemo(() => {
    const search = draftActorSearch.trim().toLowerCase()

    if (!search) return actors.slice(0, 30)

    return actors
      .filter((actor) =>
        [actor.name, actor.email, actor.label, actor.actorType]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 30)
  }, [actors, draftActorSearch])

  const maxChartTotal = Math.max(...chart.map((item) => item.total), 1)

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

      setEvents(Array.isArray(data.events) ? data.events : [])
      setSummary(data.summary || defaultSummary)
      setChart(Array.isArray(data.chart) ? data.chart : [])
      setTotalMatched(Number(data.totalMatched || 0))
      setActors(Array.isArray(data.filters?.actors) ? data.filters.actors : [])
      setEntities(Array.isArray(data.filters?.entities) ? data.filters.entities : [])

      if (data.events?.length) {
        const stillExists = data.events.some((event) => event.id === selectedId)
        setSelectedId(stillExists ? selectedId : data.events[0].id)
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
    setDraftLimit(75)

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
    setAppliedLimit(75)
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

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(""), 1600)
    } catch {
      setCopied("")
    }
  }

  return (
    <div className="min-w-0 bg-[#F8FAFC] px-6 py-6">
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold text-[#101828]">Audit Log</h1>
              <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-[12px] font-medium text-[#039855]">
                Live
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#667085]">
              Monitor user, admin, billing, content, support, workspace, and system activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadAuditLog()} className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2 text-[13px] font-medium text-[#344054] shadow-sm hover:bg-[#F9FAFB]">
              Refresh
            </button>

            <button type="button" onClick={exportCsv} className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2 text-[13px] font-medium text-[#344054] shadow-sm hover:bg-[#F9FAFB]">
              Export CSV
            </button>
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-6">
          <StatCard title="Security Status" value={summary.critical > 0 ? "Review" : "Stable"} sub={summary.critical > 0 ? "Critical events detected" : "No critical threats detected"} />
          <StatCard title="Matched Events" value={loading ? "..." : formatNumber(summary.total)} sub={`${formatNumber(events.length)} currently shown`} />
          <StatCard title="Critical Events" value={loading ? "..." : formatNumber(summary.critical)} sub="Highest risk actions" />
          <StatCard title="High Risk Events" value={loading ? "..." : formatNumber(summary.high)} sub="Admin, billing, access" />
          <StatCard title="Unique IPs" value={loading ? "..." : formatNumber(summary.uniqueIps)} sub={`${formatNumber(summary.uniqueActors)} actors`} />
          <StatCard title="Activity Risk" value={summary.averageRisk >= 70 ? "High" : summary.averageRisk >= 35 ? "Medium" : "Low"} sub={`Average risk ${summary.averageRisk}`} />
        </section>

        <section className="mb-5 rounded-[24px] border border-[#E6EAF0] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[#111827]">Real Time Activity</div>
              <div className="mt-0.5 text-[12px] text-[#667085]">
                Graph updates when you press Apply Filters.
              </div>
            </div>
            <div className="text-[12px] text-[#667085]">{chart.length} points</div>
          </div>

          <div className="flex h-[180px] items-end gap-2 overflow-x-auto rounded-2xl border border-[#E6EAF0] bg-[#FBFCFE] px-4 py-4">
            {chart.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-[13px] text-[#667085]">
                No graph data for the current filters.
              </div>
            ) : (
              chart.map((point) => {
                const height = Math.max(8, Math.round((point.total / maxChartTotal) * 130))

                return (
                  <div key={point.label} className="flex min-w-[44px] flex-col items-center justify-end gap-2">
                    <div className="text-[11px] font-medium text-[#344054]">{point.total}</div>
                    <div
                      className="w-8 rounded-t-xl bg-gradient-to-t from-[#2563EB] to-[#93C5FD]"
                      style={{ height }}
                      title={`${point.label}: ${point.total} events`}
                    />
                    <div className="w-[52px] truncate text-center text-[10px] text-[#667085]">
                      {point.label}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="mb-4 rounded-[24px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters()
              }}
              placeholder="Search name, email, action, entity, IP, event ID, metadata..."
              className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-4 text-[14px] text-[#111827] outline-none placeholder:text-[#98A2B3] focus:border-[#2563EB]"
            />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={applyFilters} className="h-11 rounded-xl bg-[#2563EB] px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#1D4ED8]">
                Apply Filters
              </button>

              <button type="button" onClick={resetFilters} className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-4 text-[13px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <SelectField label="Date Range" value={draftRange} options={rangeOptions} onChange={setDraftRange} />

            <label className="flex min-w-[145px] flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                From
              </span>
              <input
                type="date"
                value={draftStartDate}
                disabled={draftRange !== "custom"}
                onChange={(event) => setDraftStartDate(event.target.value)}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none disabled:bg-[#F2F4F7] disabled:text-[#98A2B3]"
              />
            </label>

            <label className="flex min-w-[145px] flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                To
              </span>
              <input
                type="date"
                value={draftEndDate}
                disabled={draftRange !== "custom"}
                onChange={(event) => setDraftEndDate(event.target.value)}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none disabled:bg-[#F2F4F7] disabled:text-[#98A2B3]"
              />
            </label>

            <SelectField label="Category" value={draftCategory} options={categoryOptions} onChange={setDraftCategory} />
            <SelectField label="Severity" value={draftSeverity} options={severityOptions} onChange={setDraftSeverity} />
            <SelectField label="Actor Type" value={draftActorType} options={actorTypeOptions} onChange={setDraftActorType} />
            <SelectField label="IP" value={draftIp} options={ipOptions} onChange={setDraftIp} />

            <label className="flex min-w-[170px] flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                Entity
              </span>
              <select
                value={draftEntity}
                onChange={(event) => setDraftEntity(event.target.value)}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#2563EB]"
              >
                <option value="">All Entities</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[110px] flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                Rows
              </span>
              <select
                value={draftLimit}
                onChange={(event) => setDraftLimit(Number(event.target.value))}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#2563EB]"
              >
                <option value={50}>50</option>
                <option value={75}>75</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={250}>250</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                Search Person
              </div>
              <input
                value={draftActorSearch}
                onChange={(event) => setDraftActorSearch(event.target.value)}
                placeholder="Type name or email..."
                className="h-10 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#111827] outline-none placeholder:text-[#98A2B3] focus:border-[#2563EB]"
              />
              <div className="mt-2 max-h-[170px] overflow-auto rounded-xl border border-[#E6EAF0] bg-[#FBFCFE]">
                <button
                  type="button"
                  onClick={() => setDraftActorId("")}
                  className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-white ${
                    !draftActorId ? "bg-white font-semibold text-[#2563EB]" : "text-[#344054]"
                  }`}
                >
                  All People
                </button>
                {filteredActorOptions.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => setDraftActorId(actor.id)}
                    className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-white ${
                      draftActorId === actor.id ? "bg-white font-semibold text-[#2563EB]" : "text-[#344054]"
                    }`}
                  >
                    <span className="block truncate">{actor.name}</span>
                    <span className="block truncate text-[11px] text-[#667085]">
                      {actor.email || actor.actorType}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap content-start gap-2 pt-5">
              <button type="button" onClick={() => { setDraftSeverity("critical"); setDraftCategory("all") }} className="rounded-xl bg-[#FEF3F2] px-4 py-2 text-[12px] font-medium text-[#B42318]">Critical</button>
              <button type="button" onClick={() => { setDraftSeverity("high"); setDraftCategory("all") }} className="rounded-xl bg-[#FFF7ED] px-4 py-2 text-[12px] font-medium text-[#B54708]">High Risk</button>
              {categoryOptions.filter((item) => item.value !== "all").map((item) => (
                <button key={item.value} type="button" onClick={() => { setDraftCategory(item.value); setDraftSeverity("all") }} className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-2 text-[12px] font-medium text-[#344054]">
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {copied ? (
            <div className="mt-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-[13px] text-[#15803D]">
              Copied {copied}.
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[13px] text-[#B91C1C]">
              {error}
            </div>
          ) : null}
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="overflow-hidden rounded-[24px] border border-[#E6EAF0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between border-b border-[#E6EAF0] px-5 py-4">
              <div className="text-[14px] font-semibold text-[#111827]">
                {loading ? "Loading events..." : `${formatNumber(totalMatched)} events found`}
              </div>
              <div className="text-[12px] text-[#667085]">
                Showing {formatNumber(events.length)} rows
              </div>
            </div>

            <div className="max-h-[680px] overflow-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="sticky top-0 z-10 border-b border-[#E6EAF0] bg-[#FBF8F2]">
                  <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#98A2B3]">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-[13px] text-[#667085]">
                        Loading audit events...
                      </td>
                    </tr>
                  ) : groupedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-[13px] text-[#667085]">
                        No audit events matched the current filters. Adjust filters and press Apply Filters.
                      </td>
                    </tr>
                  ) : (
                    groupedEvents.flatMap(([group, groupEvents]) => [
                      <tr key={group} className="bg-[#F8FAFC]">
                        <td colSpan={8} className="border-b border-[#E6EAF0] px-4 py-2 text-[12px] font-semibold text-[#344054]">
                          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                          {group}
                        </td>
                      </tr>,
                      ...groupEvents.map((event) => {
                        const active = selectedEvent?.id === event.id

                        return (
                          <tr
                            key={event.id}
                            onClick={() => setSelectedId(event.id)}
                            className={`cursor-pointer border-b border-[#F2F4F7] text-[13px] hover:bg-[#F8FAFC] ${
                              active ? "bg-[#F8FAFC]" : "bg-white"
                            }`}
                          >
                            <td className="whitespace-nowrap px-4 py-4">
                              <div className="font-medium text-[#344054]">{event.timeLabel}</div>
                              <div className="text-[11px] text-[#98A2B3]">{event.createdAtLabel}</div>
                            </td>

                            <td className="px-4 py-4">
                              <span className={`rounded-lg px-2.5 py-1 text-[12px] font-medium capitalize ${severityTone(event.severity)}`}>
                                {event.severity}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[11px] font-semibold text-[#475467]">
                                  {initials(event.actorName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="max-w-[180px] truncate font-semibold text-[#111827]">
                                    {event.actorName}
                                  </div>
                                  <div className="max-w-[180px] truncate text-[11px] text-[#667085]">
                                    {event.actorEmail || event.actorType}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span className="font-semibold text-[#2563EB]">{event.actionLabel}</span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-medium text-[#111827]">{event.entityType}</div>
                              <div className="text-[11px] text-[#98A2B3]">{shortId(event.entityId)}</div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-[#667085]">
                              {event.ipAddress || "—"}
                            </td>

                            <td className="px-4 py-4">
                              <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-[12px] font-semibold ${riskTone(event.riskScore)}`}>
                                {event.riskScore}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-[#98A2B3]">›</td>
                          </tr>
                        )
                      }),
                    ])
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="sticky top-4 rounded-[24px] border border-[#E6EAF0] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between border-b border-[#E6EAF0] px-5 py-4">
              <div>
                <div className="text-[15px] font-semibold text-[#111827]">Event Details</div>
                <div className="mt-0.5 text-[12px] text-[#667085]">
                  Full context for the selected event.
                </div>
              </div>

              {selectedEvent ? (
                <span className={`rounded-lg px-2.5 py-1 text-[12px] font-medium capitalize ${severityTone(selectedEvent.severity)}`}>
                  {selectedEvent.severity}
                </span>
              ) : null}
            </div>

            <div className="max-h-[680px] overflow-auto p-5">
              {!selectedEvent ? (
                <div className="rounded-2xl border border-dashed border-[#D0D5DD] px-4 py-8 text-[13px] text-[#667085]">
                  Select an event to inspect details.
                </div>
              ) : (
                <div className="space-y-5">
                  <section>
                    <div className="mb-2 text-[12px] font-semibold text-[#111827]">Event Summary</div>
                    <DetailRow label="Time" value={selectedEvent.createdAtLabel} />
                    <DetailRow label="Event ID" value={selectedEvent.id} />
                    <DetailRow label="Action" value={selectedEvent.actionLabel} />
                    <DetailRow label="Entity" value={selectedEvent.entityType} />
                    <DetailRow label="Entity ID" value={selectedEvent.entityId || "—"} />
                    <DetailRow label="Actor" value={selectedEvent.actorName} />
                    <DetailRow label="Actor Email" value={selectedEvent.actorEmail || "—"} />
                    <DetailRow label="Related User" value={selectedEvent.userEmail || selectedEvent.userName || "Unknown user"} />
                    <DetailRow label="Risk Score" value={String(selectedEvent.riskScore)} />
                  </section>

                  <section className="border-t border-[#E6EAF0] pt-4">
                    <div className="mb-2 text-[12px] font-semibold text-[#111827]">Network</div>
                    <DetailRow label="IP Address" value={selectedEvent.ipAddress || "—"} />
                    <DetailRow label="User Agent" value={selectedEvent.userAgent || "—"} />
                  </section>

                  <section className="border-t border-[#E6EAF0] pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[12px] font-semibold text-[#111827]">Metadata</div>
                      <button
                        type="button"
                        onClick={() => void copyText("metadata JSON", safeJson(selectedEvent.metadata))}
                        className="rounded-lg bg-[#EFF6FF] px-2 py-1 text-[11px] font-medium text-[#2563EB]"
                      >
                        Copy JSON
                      </button>
                    </div>

                    <pre className="max-h-[260px] overflow-auto rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-4 text-[11px] leading-5 text-[#344054]">
                      {safeJson(selectedEvent.metadata)}
                    </pre>
                  </section>

                  <section className="border-t border-[#E6EAF0] pt-4">
                    <div className="mb-3 text-[12px] font-semibold text-[#111827]">Admin Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void copyText("event ID", selectedEvent.id)} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                        Copy Event ID
                      </button>

                      <button type="button" onClick={() => void copyText("metadata", safeJson(selectedEvent.metadata))} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                        Copy Metadata
                      </button>

                      <button type="button" onClick={() => {
                        setDraftActorId(selectedEvent.actorId || selectedEvent.actorName)
                        setAppliedActorId(selectedEvent.actorId || selectedEvent.actorName)
                      }} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                        Filter by Actor
                      </button>

                      <button type="button" onClick={() => {
                        setDraftEntity(selectedEvent.entityType)
                        setAppliedEntity(selectedEvent.entityType)
                      }} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                        Filter by Entity
                      </button>

                      <button type="button" disabled={!selectedEvent.ipAddress} onClick={() => {
                        setDraftSearch(selectedEvent.ipAddress)
                        setAppliedSearch(selectedEvent.ipAddress)
                      }} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:text-[#98A2B3]">
                        Filter by IP
                      </button>

                      <button type="button" onClick={() => {
                        if (selectedEvent.userId) window.location.href = `/admin/users/${selectedEvent.userId}`
                      }} className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
                        View User
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
  )
}

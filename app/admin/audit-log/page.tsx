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

function dateGroupLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date)
}

function severityClass(value: string) {
  if (value === "critical") return "bg-red-50 text-red-700"
  if (value === "high") return "bg-orange-50 text-orange-700"
  if (value === "normal") return "bg-blue-50 text-blue-700"
  return "bg-slate-100 text-slate-600"
}

function riskClass(value: number) {
  if (value >= 80) return "border-red-300 bg-red-50 text-red-700"
  if (value >= 55) return "border-orange-300 bg-orange-50 text-orange-700"
  return "border-slate-200 bg-white text-slate-900"
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
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500"
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
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-1.5 text-[12px]">
      <div className="text-slate-500">{label}</div>
      <div className="break-words font-semibold text-slate-800">{value || "—"}</div>
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

    if (!search) return actors.slice(0, 20)

    return actors
      .filter((actor) =>
        [actor.name, actor.email, actor.label, actor.actorType]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 20)
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

      const res = await fetch(`/api/admin/audit-log?${query}`, {
        cache: "no-store",
      })

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
    <div className="min-w-0 bg-slate-50 px-5 py-5">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-950">Audit Log</h1>
              <span className="rounded-full bg-green-50 px-3 py-1 text-[12px] font-semibold text-green-700">
                Live
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Monitor user, admin, billing, content, support, workspace, and system activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAuditLog()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="min-w-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_110px_90px]">
                <input
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters()
                  }}
                  placeholder="Search anything..."
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={applyFilters}
                  className="h-11 rounded-xl bg-blue-600 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[150px_120px_120px_150px_150px_150px_150px_120px]">
                <SelectField label="Date Range" value={draftRange} options={rangeOptions} onChange={setDraftRange} />

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    From
                  </span>
                  <input
                    type="date"
                    value={draftStartDate}
                    disabled={draftRange !== "custom"}
                    onChange={(event) => setDraftStartDate(event.target.value)}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-300"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    To
                  </span>
                  <input
                    type="date"
                    value={draftEndDate}
                    disabled={draftRange !== "custom"}
                    onChange={(event) => setDraftEndDate(event.target.value)}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-300"
                  />
                </label>

                <SelectField label="Category" value={draftCategory} options={categoryOptions} onChange={setDraftCategory} />
                <SelectField label="Severity" value={draftSeverity} options={severityOptions} onChange={setDraftSeverity} />
                <SelectField label="Actor Type" value={draftActorType} options={actorTypeOptions} onChange={setDraftActorType} />
                <SelectField label="IP" value={draftIp} options={ipOptions} onChange={setDraftIp} />

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Rows
                  </span>
                  <select
                    value={draftLimit}
                    onChange={(event) => setDraftLimit(Number(event.target.value))}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                    <option value={150}>150</option>
                    <option value={250}>250</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Search Person
                  </div>

                  <input
                    value={draftActorSearch}
                    onChange={(event) => setDraftActorSearch(event.target.value)}
                    placeholder="Type name or email..."
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
                  />

                  <div className="mt-2 max-h-[86px] overflow-auto rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setDraftActorId("")}
                      className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-white ${
                        !draftActorId ? "bg-white font-bold text-slate-950" : "text-slate-700"
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
                          draftActorId === actor.id
                            ? "bg-white font-bold text-blue-700"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="block truncate">{actor.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {actor.email || actor.actorType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Entity
                  </span>
                  <select
                    value={draftEntity}
                    onChange={(event) => setDraftEntity(event.target.value)}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="">All Entities</option>
                    {entities.map((entity) => (
                      <option key={entity} value={entity}>
                        {entity}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 flex h-[86px] items-end gap-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                    {chart.length === 0 ? (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                        No graph
                      </div>
                    ) : (
                      chart.map((point) => {
                        const height = Math.max(
                          6,
                          Math.round((point.total / Math.max(maxChartTotal, 1)) * 58)
                        )

                        return (
                          <div key={point.label} className="flex min-w-[8px] flex-1 items-end justify-center">
                            <div
                              className="w-full rounded-t bg-blue-500"
                              style={{ height }}
                              title={`${point.label}: ${point.total}`}
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraftSeverity("critical")}
                  className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-bold text-red-700"
                >
                  Critical
                </button>
                <button
                  type="button"
                  onClick={() => setDraftSeverity("high")}
                  className="rounded-xl bg-orange-50 px-4 py-2 text-[12px] font-bold text-orange-700"
                >
                  High Risk
                </button>
                {categoryOptions
                  .filter((item) => item.value !== "all")
                  .map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDraftCategory(item.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {item.label}
                    </button>
                  ))}
              </div>

              {copied ? (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-[13px] text-green-700">
                  Copied {copied}.
                </div>
              ) : null}

              {error ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">
                  {error}
                </div>
              ) : null}
            </section>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="text-[15px] font-bold text-slate-950">
                  {loading ? "Loading events..." : `${formatNumber(totalMatched)} events found`}
                </div>
                <div className="text-[12px] font-medium text-slate-500">
                  Showing {formatNumber(events.length)} rows
                </div>
              </div>

              <div className="max-h-[720px] overflow-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-[#FBF8F2]">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-[13px] text-slate-500">
                          Loading audit events...
                        </td>
                      </tr>
                    ) : groupedEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-[13px] text-slate-500">
                          No audit events matched the current filters.
                        </td>
                      </tr>
                    ) : (
                      groupedEvents.flatMap(([group, groupEvents]) => [
                        <tr key={group} className="bg-slate-50">
                          <td colSpan={8} className="border-b border-slate-200 px-4 py-2 text-[12px] font-bold text-slate-700">
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
                                <div className="font-bold text-slate-700">{event.timeLabel}</div>
                                <div className="text-[12px] text-slate-400">{event.createdAtLabel}</div>
                              </td>

                              <td className="px-4 py-4">
                                <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold capitalize ${severityClass(event.severity)}`}>
                                  {event.severity}
                                </span>
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
                                <span className="font-bold text-slate-950">{event.actionLabel}</span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-bold text-slate-800">{event.entityType}</div>
                                <div className="text-[12px] text-slate-400">{shortId(event.entityId)}</div>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                                {event.ipAddress || "—"}
                              </td>

                              <td className="px-4 py-4">
                                <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-[12px] font-bold ${riskClass(event.riskScore)}`}>
                                  {event.riskScore}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-slate-400">›</td>
                            </tr>
                          )
                        }),
                      ])
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>

          <aside className="sticky top-5 max-h-[calc(100vh-40px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-bold text-slate-950">Event Details</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">Selected activity record</div>
                </div>

                {selectedEvent ? (
                  <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold capitalize ${severityClass(selectedEvent.severity)}`}>
                    {selectedEvent.severity}
                  </span>
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
                    <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Event Summary
                    </div>
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

                  <section className="border-t border-slate-200 pt-4">
                    <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Network
                    </div>
                    <DetailRow label="IP Address" value={selectedEvent.ipAddress || "—"} />
                    <DetailRow label="User Agent" value={selectedEvent.userAgent || "—"} />
                  </section>

                  <section className="border-t border-slate-200 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        Metadata
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyText("metadata JSON", safeJson(selectedEvent.metadata))}
                        className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"
                      >
                        Copy JSON
                      </button>
                    </div>

                    <pre className="max-h-[260px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-700">
                      {safeJson(selectedEvent.metadata)}
                    </pre>
                  </section>

                  <section className="border-t border-slate-200 pt-4">
                    <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Actions
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void copyText("event ID", selectedEvent.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                        Copy Event ID
                      </button>

                      <button type="button" onClick={() => void copyText("metadata", safeJson(selectedEvent.metadata))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                        Copy Metadata
                      </button>

                      <button type="button" onClick={() => {
                        setDraftActorId(selectedEvent.actorId || selectedEvent.actorName)
                        setAppliedActorId(selectedEvent.actorId || selectedEvent.actorName)
                      }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                        Filter Actor
                      </button>

                      <button type="button" onClick={() => {
                        setDraftEntity(selectedEvent.entityType)
                        setAppliedEntity(selectedEvent.entityType)
                      }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                        Filter Entity
                      </button>

                      <button type="button" disabled={!selectedEvent.ipAddress} onClick={() => {
                        setDraftSearch(selectedEvent.ipAddress)
                        setAppliedSearch(selectedEvent.ipAddress)
                      }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                        Filter IP
                      </button>

                      <button type="button" onClick={() => {
                        if (selectedEvent.userId) window.location.href = `/admin/users/${selectedEvent.userId}`
                      }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
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

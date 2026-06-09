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
type DateRange = "24h" | "7d" | "30d" | "90d" | "all"

type AuditEvent = {
  id: string
  createdAt: string
  createdAtLabel: string
  action: string
  actionLabel: string
  category: Exclude<AuditCategory, "all">
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

type AuditSummary = {
  total: number
  critical: number
  high: number
  uniqueActors: number
  uniqueIps: number
  latestEventAt: string | null
}

type AuditResponse = {
  ok: boolean
  summary: AuditSummary
  events: AuditEvent[]
  totalMatched: number
  returned: number
  maxLookbackRows: number
  error?: string
}

const categoryOptions: { label: string; value: AuditCategory }[] = [
  { label: "All categories", value: "all" },
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
  { label: "All severity", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Normal", value: "normal" },
  { label: "Low", value: "low" },
]

const actorOptions: { label: string; value: ActorType }[] = [
  { label: "All actors", value: "all" },
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
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
]

function severityTone(value: string) {
  if (value === "critical") return "bg-[#FEE4E2] text-[#B42318] ring-[#FECDCA]"
  if (value === "high") return "bg-[#FFF1E6] text-[#B54708] ring-[#FED7AA]"
  if (value === "normal") return "bg-[#EEF4FF] text-[#3538CD] ring-[#C7D7FE]"
  return "bg-[#F4F6FA] text-[#667085] ring-[#E6EAF2]"
}

function categoryTone(value: string) {
  if (value === "auth") return "bg-[#F5F0FF] text-[#6A4BBC]"
  if (value === "admin") return "bg-[#EEF2FF] text-[#4338CA]"
  if (value === "billing") return "bg-[#ECFDF3] text-[#027A48]"
  if (value === "content") return "bg-[#FFF7ED] text-[#C2410C]"
  if (value === "support") return "bg-[#F0F9FF] text-[#0369A1]"
  if (value === "workspace") return "bg-[#FDF2F8] text-[#BE185D]"
  if (value === "system") return "bg-[#F4F6FA] text-[#475467]"
  return "bg-[#F8FAFC] text-[#475569]"
}

function actionTone(action: string) {
  const value = action.toLowerCase()

  if (value.includes("create")) return "bg-[#EDF7EE] text-[#2A6041]"
  if (value.includes("edit") || value.includes("update")) return "bg-[#EEF2F7] text-[#4B5D7A]"
  if (value.includes("delete") || value.includes("block") || value.includes("remove")) {
    return "bg-[#FDECEC] text-[#B44C4C]"
  }
  if (value.includes("publish")) return "bg-[#FFF4D6] text-[#9A6A00]"
  if (value.includes("import")) return "bg-[#EEF7F0] text-[#356B47]"
  if (value.includes("auth") || value.includes("login")) return "bg-[#F5F0FF] text-[#6A4BBC]"
  return "bg-[#F3F4F6] text-[#6B7280]"
}

function initials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A"
  )
}

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

function shortId(value: string | null | undefined) {
  if (!value) return "—"
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function buildQuery(params: {
  search: string
  category: AuditCategory
  severity: AuditSeverity
  actorType: ActorType
  ip: IpFilter
  range: DateRange
  limit: number
  format?: "json" | "csv"
}) {
  const query = new URLSearchParams()

  query.set("search", params.search)
  query.set("category", params.category)
  query.set("severity", params.severity)
  query.set("actorType", params.actorType)
  query.set("ip", params.ip)
  query.set("range", params.range)
  query.set("limit", String(params.limit))

  if (params.format) {
    query.set("format", params.format)
  }

  return query.toString()
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <section className="rounded-[24px] border border-[#E6EAF0] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none text-[#111827]">
        {value}
      </div>
      <div className="mt-2 text-[13px] text-[#667085]">{sub}</div>
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
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#98A2B3]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#344054] outline-none focus:border-[#7C3AED]"
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

export default function AdminAuditLogPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<AuditCategory>("all")
  const [severity, setSeverity] = useState<AuditSeverity>("all")
  const [actorType, setActorType] = useState<ActorType>("all")
  const [ip, setIp] = useState<IpFilter>("all")
  const [range, setRange] = useState<DateRange>("7d")
  const [limit, setLimit] = useState(100)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [summary, setSummary] = useState<AuditSummary>({
    total: 0,
    critical: 0,
    high: 0,
    uniqueActors: 0,
    uniqueIps: 0,
    latestEventAt: null,
  })
  const [totalMatched, setTotalMatched] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState("")

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0] ?? null,
    [events, selectedId]
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAuditLog()
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, category, severity, actorType, ip, range, limit])

  async function loadAuditLog() {
    try {
      setLoading(true)
      setError("")

      const query = buildQuery({
        search,
        category,
        severity,
        actorType,
        ip,
        range,
        limit,
      })

      const res = await fetch(`/api/admin/audit-log?${query}`, {
        cache: "no-store",
      })

      const data = (await res.json().catch(() => null)) as AuditResponse | null

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load audit log.")
        setEvents([])
        setTotalMatched(0)
        return
      }

      setEvents(Array.isArray(data.events) ? data.events : [])
      setSummary(data.summary)
      setTotalMatched(data.totalMatched)

      if (data.events?.length && !data.events.some((event) => event.id === selectedId)) {
        setSelectedId(data.events[0].id)
      }

      if (!data.events?.length) {
        setSelectedId(null)
      }
    } catch (err) {
      console.error("LOAD AUDIT LOG ERROR:", err)
      setError("Something went wrong while loading the audit log.")
      setEvents([])
      setTotalMatched(0)
    } finally {
      setLoading(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setCategory("all")
    setSeverity("all")
    setActorType("all")
    setIp("all")
    setRange("7d")
    setLimit(100)
  }

  function exportCsv() {
    const query = buildQuery({
      search,
      category,
      severity,
      actorType,
      ip,
      range,
      limit,
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
    <div className="min-w-0 px-6 py-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <section className="rounded-[24px] border border-[#E6EAF0] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div>
              <div className="text-[20px] font-semibold text-[#111827]">Audit Log</div>
              <div className="mt-1 text-[13px] text-[#667085]">
                Search, filter, export, and inspect security relevant activity.
              </div>
            </div>
          </section>

          <StatCard
            label="Matched Events"
            value={loading ? "..." : formatNumber(summary.total)}
            sub={`${formatNumber(events.length)} shown`}
          />

          <StatCard
            label="Critical"
            value={loading ? "..." : formatNumber(summary.critical)}
            sub="Highest risk events"
          />

          <StatCard
            label="High Risk"
            value={loading ? "..." : formatNumber(summary.high)}
            sub="Admin, billing, or access events"
          />

          <StatCard
            label="Unique IPs"
            value={loading ? "..." : formatNumber(summary.uniqueIps)}
            sub={`${formatNumber(summary.uniqueActors)} actors`}
          />
        </div>

        <section className="mb-5 rounded-[28px] border border-[#E6EAF0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#98A2B3]">
                Smart search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actor, email, action, entity, detail, IP, event ID, metadata..."
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#344054] outline-none placeholder:text-[#98A2B3] focus:border-[#7C3AED]"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => void loadAuditLog()}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-4 text-[13px] font-medium text-[#344054] hover:bg-[#F9FAFB]"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="h-10 rounded-xl bg-[#111827] px-4 text-[13px] font-medium text-white hover:bg-[#1F2937]"
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-4 text-[13px] font-medium text-[#667085] hover:bg-[#F9FAFB]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <SelectField label="Date range" value={range} options={rangeOptions} onChange={setRange} />
            <SelectField label="Category" value={category} options={categoryOptions} onChange={setCategory} />
            <SelectField label="Severity" value={severity} options={severityOptions} onChange={setSeverity} />
            <SelectField label="Actor type" value={actorType} options={actorOptions} onChange={setActorType} />
            <SelectField label="IP" value={ip} options={ipOptions} onChange={setIp} />

            <label className="flex min-w-[130px] flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#98A2B3]">
                Rows
              </span>
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#344054] outline-none focus:border-[#7C3AED]"
              >
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={150}>150 rows</option>
                <option value={250}>250 rows</option>
              </select>
            </label>
          </div>

          {copied ? (
            <div className="mt-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-[13px] text-[#15803D]">
              Copied {copied}.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[13px] text-[#B91C1C]">
              {error}
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[28px] border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EAF0] px-5 py-4">
              <div>
                <div className="text-[15px] font-semibold text-[#111827]">Events</div>
                <div className="mt-0.5 text-[13px] text-[#667085]">
                  {loading
                    ? "Loading..."
                    : `${formatNumber(events.length)} shown out of ${formatNumber(
                        totalMatched
                      )} matched events`}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#E6EAF0] bg-[#FBF8F2]">
                  <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#98A2B3]">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Actor</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Entity</th>
                    <th className="px-5 py-3 font-medium">IP</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-[13px] text-[#667085]">
                        Loading audit events...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-[13px] text-[#667085]">
                        No audit events matched the current filters.
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => {
                      const active = selectedEvent?.id === event.id

                      return (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedId(event.id)}
                          className={`cursor-pointer border-b border-[#EEE8DD] text-[13px] hover:bg-[#F9FAFB] ${
                            active ? "bg-[#F8FAFC]" : "bg-white"
                          }`}
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-[#667085]">
                            {event.createdAtLabel}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize ring-1 ${severityTone(
                                event.severity
                              )}`}
                            >
                              {event.severity}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[11px] font-semibold text-[#4B5D7A]">
                                {initials(event.actorName)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[#111827]">
                                  {event.actorName}
                                </div>
                                <div className="truncate text-[11px] text-[#98A2B3]">
                                  {event.actorEmail || event.actorType}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded px-2 py-1 text-[12px] ${actionTone(
                                event.actionLabel
                              )}`}
                            >
                              {event.actionLabel}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded px-2 py-1 text-[12px] capitalize ${categoryTone(
                                event.category
                              )}`}
                            >
                              {event.category}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-[#111827]">{event.entityType}</div>
                            <div className="text-[11px] text-[#98A2B3]">
                              {shortId(event.entityId)}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-[#667085]">
                            {event.ipAddress || "—"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[28px] border border-[#E6EAF0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-[#111827]">Event Details</div>
                <div className="mt-0.5 text-[13px] text-[#667085]">
                  Inspect IDs, metadata, IP, and user agent.
                </div>
              </div>
            </div>

            {!selectedEvent ? (
              <div className="rounded-2xl border border-dashed border-[#D0D5DD] px-4 py-8 text-[13px] text-[#667085]">
                Select an event to inspect details.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize ring-1 ${severityTone(
                        selectedEvent.severity
                      )}`}
                    >
                      {selectedEvent.severity}
                    </span>
                    <span
                      className={`inline-flex rounded px-2 py-1 text-[12px] capitalize ${categoryTone(
                        selectedEvent.category
                      )}`}
                    >
                      {selectedEvent.category}
                    </span>
                  </div>

                  <div className="mt-3 text-[18px] font-semibold text-[#111827]">
                    {selectedEvent.actionLabel}
                  </div>

                  <div className="mt-1 text-[13px] text-[#667085]">
                    {selectedEvent.detail || "No additional detail."}
                  </div>
                </div>

                <div className="grid gap-3 text-[13px]">
                  <DetailRow label="Time" value={selectedEvent.createdAtLabel} />
                  <DetailRow label="Event ID" value={selectedEvent.id} />
                  <DetailRow label="Actor" value={selectedEvent.actorName} />
                  <DetailRow label="Actor email" value={selectedEvent.actorEmail || "—"} />
                  <DetailRow label="Actor ID" value={selectedEvent.actorId || "—"} />
                  <DetailRow label="Related user" value={selectedEvent.userEmail || selectedEvent.userId} />
                  <DetailRow label="Entity type" value={selectedEvent.entityType} />
                  <DetailRow label="Entity ID" value={selectedEvent.entityId || "—"} />
                  <DetailRow label="IP address" value={selectedEvent.ipAddress || "—"} />
                  <DetailRow label="User agent" value={selectedEvent.userAgent || "—"} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText("event ID", selectedEvent.id)}
                    className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]"
                  >
                    Copy event ID
                  </button>

                  <button
                    type="button"
                    onClick={() => void copyText("metadata JSON", safeJson(selectedEvent.metadata))}
                    className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] hover:bg-[#F9FAFB]"
                  >
                    Copy metadata
                  </button>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#98A2B3]">
                    Metadata
                  </div>
                  <pre className="max-h-[320px] overflow-auto rounded-2xl bg-[#0B1020] p-4 text-[11px] leading-5 text-[#E5E7EB]">
                    {safeJson(selectedEvent.metadata)}
                  </pre>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-[#F2F4F7] pb-2">
      <div className="text-[#98A2B3]">{label}</div>
      <div className="break-words font-medium text-[#344054]">{value}</div>
    </div>
  )
}

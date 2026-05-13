"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  Filter,
  Globe2,
  Laptop,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react"

type LegalAcceptanceRecord = {
  id: string
  user_id: string
  email: string
  selected_plan: string | null
  registration_mode: string | null
  terms_version: string | null
  privacy_version: string | null
  refund_version: string | null
  terms_accepted: boolean
  privacy_accepted: boolean
  refund_accepted: boolean
  platform_rules_accepted: boolean
  user_agent: string | null
  ip_address: string | null
  ip_country: string | null
  ip_region: string | null
  ip_city: string | null
  ip_timezone: string | null
  ip_latitude: number | null
  ip_longitude: number | null
  ip_lookup_provider: string | null
  ip_lookup_at: string | null
  accepted_at: string | null
}

type LegalAcceptancesResponse = {
  records?: LegalAcceptanceRecord[]
  error?: string
}

type SortMode =
  | "newest"
  | "oldest"
  | "email_az"
  | "email_za"
  | "plan_az"
  | "country_az"

function formatDateTime(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date)
}

function formatUtc(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC")
}

function normalizePlan(value: string | null) {
  if (!value) return "Unknown"

  if (value === "bll-monthly") return "BLL Monthly"
  if (value === "premium") return "Premium"
  if (value === "free") return "Free"

  return value
}

function normalizeMode(value: string | null) {
  if (!value) return "Unknown"

  if (value === "private_beta") return "Private Beta"
  if (value === "public") return "Public"
  if (value === "closed") return "Closed"

  return value
}

function getBrowserLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown browser"

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    return "Chrome"
  }

  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "Safari"
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox"
  }

  if (userAgent.includes("Edg")) {
    return "Edge"
  }

  return "Browser"
}

function getDeviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device"

  if (userAgent.includes("Macintosh")) return "Mac"
  if (userAgent.includes("Windows")) return "Windows"
  if (userAgent.includes("iPhone")) return "iPhone"
  if (userAgent.includes("iPad")) return "iPad"
  if (userAgent.includes("Android")) return "Android"

  return "Device"
}

function allAccepted(record: LegalAcceptanceRecord) {
  return (
    record.terms_accepted &&
    record.privacy_accepted &&
    record.refund_accepted &&
    record.platform_rules_accepted
  )
}

function getLocationLabel(record: LegalAcceptanceRecord) {
  const parts = [record.ip_city, record.ip_region, record.ip_country].filter(
    Boolean
  )

  if (parts.length === 0) {
    return "Location not captured"
  }

  return parts.join(", ")
}

function getCountryLabel(value: string | null) {
  if (!value) return "Unknown"

  return value
}

function compareNullableText(a: string | null, b: string | null) {
  return (a || "").localeCompare(b || "")
}

function getInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U"
}

export default function AdminLegalAcceptancesPage() {
  const [records, setRecords] = useState<LegalAcceptanceRecord[]>([])
  const [query, setQuery] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [modeFilter, setModeFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [selectedRecord, setSelectedRecord] =
    useState<LegalAcceptanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  async function loadRecords({ silent = false }: { silent?: boolean } = {}) {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError("")

    try {
      const response = await fetch("/api/admin/legal-acceptances", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      const data = (await response.json().catch(() => null)) as
        | LegalAcceptancesResponse
        | null

      if (!response.ok) {
        setError(data?.error || "Failed to load legal acceptance records.")
        return
      }

      setRecords(data?.records || [])
    } catch (err) {
      console.error("LEGAL ACCEPTANCES PAGE ERROR:", err)
      setError("Something went wrong while loading legal acceptance records.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const countryOptions = useMemo(() => {
    const countries = Array.from(
      new Set(
        records
          .map((record) => record.ip_country)
          .filter((value): value is string => Boolean(value))
      )
    )

    return countries.sort((a, b) => a.localeCompare(b))
  }, [records])

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const filtered = records.filter((record) => {
      const searchable = [
        record.email,
        record.user_id,
        record.selected_plan,
        normalizePlan(record.selected_plan),
        record.registration_mode,
        normalizeMode(record.registration_mode),
        record.terms_version,
        record.privacy_version,
        record.refund_version,
        record.ip_address,
        record.ip_country,
        record.ip_region,
        record.ip_city,
        record.ip_timezone,
        record.ip_lookup_provider,
        record.user_agent,
        record.accepted_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const matchesQuery = normalizedQuery
        ? searchable.includes(normalizedQuery)
        : true

      const matchesPlan =
        planFilter === "all" ? true : record.selected_plan === planFilter

      const matchesMode =
        modeFilter === "all" ? true : record.registration_mode === modeFilter

      const matchesCountry =
        countryFilter === "all" ? true : record.ip_country === countryFilter

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "complete"
            ? allAccepted(record)
            : !allAccepted(record)

      return (
        matchesQuery &&
        matchesPlan &&
        matchesMode &&
        matchesCountry &&
        matchesStatus
      )
    })

    return [...filtered].sort((a, b) => {
      if (sortMode === "oldest") {
        return (
          new Date(a.accepted_at || 0).getTime() -
          new Date(b.accepted_at || 0).getTime()
        )
      }

      if (sortMode === "email_az") {
        return a.email.localeCompare(b.email)
      }

      if (sortMode === "email_za") {
        return b.email.localeCompare(a.email)
      }

      if (sortMode === "plan_az") {
        return normalizePlan(a.selected_plan).localeCompare(
          normalizePlan(b.selected_plan)
        )
      }

      if (sortMode === "country_az") {
        return compareNullableText(a.ip_country, b.ip_country)
      }

      return (
        new Date(b.accepted_at || 0).getTime() -
        new Date(a.accepted_at || 0).getTime()
      )
    })
  }, [
    countryFilter,
    modeFilter,
    planFilter,
    query,
    records,
    sortMode,
    statusFilter,
  ])

  const totalRecords = records.length
  const completeRecords = records.filter(allAccepted).length
  const paidRecords = records.filter(
    (record) =>
      record.selected_plan === "bll-monthly" ||
      record.selected_plan === "premium"
  ).length
  const locatedRecords = records.filter(
    (record) => record.ip_country || record.ip_city || record.ip_region
  ).length
  const latestRecord = records[0] || null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total records"
          value={totalRecords}
          detail="latest 100 records"
          icon={<FileCheck2 className="h-4 w-4 text-blue-600" />}
        />

        <SummaryCard
          label="Fully accepted"
          value={completeRecords}
          detail="all required policies true"
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          detailClassName="text-emerald-700"
        />

        <SummaryCard
          label="Paid plans"
          value={paidRecords}
          detail="BLL Monthly or Premium"
          icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />}
        />

        <SummaryCard
          label="Located records"
          value={locatedRecords}
          detail={
            latestRecord
              ? `Latest: ${formatDateTime(latestRecord.accepted_at)}`
              : "No records yet"
          }
          icon={<MapPin className="h-4 w-4 text-slate-500" />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-950">
                Legal Acceptance Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review user consent evidence, policy versions, timestamps, IP
                address, approximate location, and device details.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadRecords({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(145px,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search email, user ID, IP, location..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <SelectControl
              value={planFilter}
              onChange={setPlanFilter}
              icon={<Filter className="h-4 w-4" />}
              options={[
                { label: "All plans", value: "all" },
                { label: "Free", value: "free" },
                { label: "BLL Monthly", value: "bll-monthly" },
                { label: "Premium", value: "premium" },
              ]}
            />

            <SelectControl
              value={modeFilter}
              onChange={setModeFilter}
              icon={<Filter className="h-4 w-4" />}
              options={[
                { label: "All modes", value: "all" },
                { label: "Public", value: "public" },
                { label: "Private Beta", value: "private_beta" },
                { label: "Closed", value: "closed" },
              ]}
            />

            <SelectControl
              value={countryFilter}
              onChange={setCountryFilter}
              icon={<Globe2 className="h-4 w-4" />}
              options={[
                { label: "All countries", value: "all" },
                ...countryOptions.map((country) => ({
                  label: country,
                  value: country,
                })),
              ]}
            />

            <SelectControl
              value={statusFilter}
              onChange={setStatusFilter}
              icon={<ShieldCheck className="h-4 w-4" />}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Complete", value: "complete" },
                { label: "Incomplete", value: "incomplete" },
              ]}
            />

            <SelectControl
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              icon={<SlidersHorizontal className="h-4 w-4" />}
              options={[
                { label: "Newest first", value: "newest" },
                { label: "Oldest first", value: "oldest" },
                { label: "Email A-Z", value: "email_az" },
                { label: "Email Z-A", value: "email_za" },
                { label: "Plan A-Z", value: "plan_az" },
                { label: "Country A-Z", value: "country_az" },
              ]}
            />
          </div>
        </div>

        {error ? (
          <div className="m-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading legal acceptance records...
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex min-h-[340px] items-center justify-center px-5 text-center">
            <div>
              <FileCheck2 className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-950">
                No acceptance records found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try clearing filters or registering a test account.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Accepted</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="cursor-pointer align-top transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                          {getInitial(record.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-950">
                            {record.email}
                          </div>
                          <div className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                            {record.user_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                        {normalizePlan(record.selected_plan)}
                      </div>
                      <div className="mt-2 text-xs font-medium text-slate-500">
                        {normalizeMode(record.registration_mode)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm font-bold text-slate-950">
                        {formatDateTime(record.accepted_at)}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        UTC: {formatUtc(record.accepted_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="text-sm font-bold text-slate-950">
                            {getLocationLabel(record)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {record.ip_lookup_provider
                              ? `Source: ${record.ip_lookup_provider}`
                              : "No lookup source"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                        <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                        {record.ip_address || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {allAccepted(record) ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Incomplete
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-800">
        <div className="font-black">Compliance note</div>
        <div className="mt-1">
          These records are stored as evidence that the user accepted the
          current legal versions during registration. Keep UTC timestamps in the
          database. IP location is approximate and depends on request headers or
          lookup data available at registration time.
        </div>
      </div>

      {selectedRecord ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRecord(null)
            }
          }}
        >
          <div className="ml-auto flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-600">
                  Consent record
                </div>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  User legal acceptance
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Full evidence record for registration consent.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                <DetailSection title="User">
                  <DetailRow label="Email" value={selectedRecord.email} />
                  <DetailRow label="User ID" value={selectedRecord.user_id} />
                  <DetailRow
                    label="Selected plan"
                    value={normalizePlan(selectedRecord.selected_plan)}
                  />
                  <DetailRow
                    label="Registration mode"
                    value={normalizeMode(selectedRecord.registration_mode)}
                  />
                </DetailSection>

                <DetailSection title="Consent evidence">
                  <ConsentRow
                    label="Terms and Conditions"
                    accepted={selectedRecord.terms_accepted}
                    version={selectedRecord.terms_version}
                  />
                  <ConsentRow
                    label="Privacy Policy"
                    accepted={selectedRecord.privacy_accepted}
                    version={selectedRecord.privacy_version}
                  />
                  <ConsentRow
                    label="Refund Policy"
                    accepted={selectedRecord.refund_accepted}
                    version={selectedRecord.refund_version}
                  />
                  <ConsentRow
                    label="Platform rules"
                    accepted={selectedRecord.platform_rules_accepted}
                    version="Recorded"
                  />
                </DetailSection>

                <DetailSection title="Timestamp">
                  <DetailRow
                    label="Displayed time"
                    value={formatDateTime(selectedRecord.accepted_at)}
                  />
                  <DetailRow
                    label="UTC source record"
                    value={formatUtc(selectedRecord.accepted_at)}
                  />
                </DetailSection>

                <DetailSection title="Location">
                  <DetailRow
                    label="Approximate location"
                    value={getLocationLabel(selectedRecord)}
                  />
                  <DetailRow
                    label="Country"
                    value={getCountryLabel(selectedRecord.ip_country)}
                  />
                  <DetailRow
                    label="Region"
                    value={selectedRecord.ip_region || "—"}
                  />
                  <DetailRow
                    label="City"
                    value={selectedRecord.ip_city || "—"}
                  />
                  <DetailRow
                    label="Timezone"
                    value={selectedRecord.ip_timezone || "—"}
                  />
                  <DetailRow
                    label="Latitude"
                    value={
                      selectedRecord.ip_latitude !== null
                        ? String(selectedRecord.ip_latitude)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Longitude"
                    value={
                      selectedRecord.ip_longitude !== null
                        ? String(selectedRecord.ip_longitude)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Lookup provider"
                    value={selectedRecord.ip_lookup_provider || "—"}
                  />
                  <DetailRow
                    label="Lookup time"
                    value={formatUtc(selectedRecord.ip_lookup_at)}
                  />
                </DetailSection>

                <DetailSection title="Technical evidence">
                  <DetailRow
                    label="Real IP address"
                    value={selectedRecord.ip_address || "—"}
                  />
                  <DetailRow
                    label="Browser"
                    value={getBrowserLabel(selectedRecord.user_agent)}
                  />
                  <DetailRow
                    label="Device"
                    value={getDeviceLabel(selectedRecord.user_agent)}
                  />
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.13em] text-slate-400">
                      Raw user agent
                    </div>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                      {selectedRecord.user_agent || "No user agent captured."}
                    </div>
                  </div>
                </DetailSection>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  detailClassName = "text-slate-500",
}: {
  label: string
  value: number
  detail: string
  icon: React.ReactNode
  detailClassName?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </div>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </div>
      <div className={`mt-1 text-xs font-medium ${detailClassName}`}>
        {detail}
      </div>
    </div>
  )
}

function SelectControl({
  value,
  onChange,
  options,
  icon,
}: {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  icon: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">{title}</h4>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </div>
      <div className="break-words text-sm font-semibold leading-6 text-slate-800">
        {value}
      </div>
    </div>
  )
}

function ConsentRow({
  label,
  accepted,
  version,
}: {
  label: string
  accepted: boolean
  version: string | null
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">
          Version: {version || "—"}
        </div>
      </div>

      {accepted ? (
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Accepted
        </div>
      ) : (
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Missing
        </div>
      )}
    </div>
  )
}
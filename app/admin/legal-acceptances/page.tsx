"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  Globe2,
  Laptop,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
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
  accepted_at: string | null
}

type LegalAcceptancesResponse = {
  records?: LegalAcceptanceRecord[]
  error?: string
}

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

export default function AdminLegalAcceptancesPage() {
  const [records, setRecords] = useState<LegalAcceptanceRecord[]>([])
  const [query, setQuery] = useState("")
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

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return records

    return records.filter((record) => {
      const searchable = [
        record.email,
        record.user_id,
        record.selected_plan,
        record.registration_mode,
        record.terms_version,
        record.privacy_version,
        record.refund_version,
        record.ip_address,
        record.user_agent,
        record.accepted_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [query, records])

  const totalRecords = records.length
  const completeRecords = records.filter(allAccepted).length
  const paidRecords = records.filter(
    (record) =>
      record.selected_plan === "bll-monthly" ||
      record.selected_plan === "premium"
  ).length
  const latestRecord = records[0] || null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Total records
            </div>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {totalRecords}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            latest 100 records
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Fully accepted
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {completeRecords}
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            all required policies true
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Paid plan records
            </div>
            <CheckCircle2 className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {paidRecords}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            BLL Monthly or Premium
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Latest accepted
            </div>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-3 text-sm font-black leading-6 text-slate-950">
            {latestRecord ? formatDateTime(latestRecord.accepted_at) : "—"}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-slate-500">
            {latestRecord?.email || "No records yet"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-950">
              Legal Acceptance Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Stored consent evidence for Terms, Privacy Policy, Refund Policy,
              and platform rules.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search email, IP, plan..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-[260px]"
              />
            </div>

            <button
              type="button"
              onClick={() => loadRecords({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={
                  refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              Refresh
            </button>
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
                Try clearing the search field or registering a test account.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Policy versions</th>
                  <th className="px-5 py-3">Accepted time</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">Device</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                          <UserRound className="h-4 w-4" />
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

                      <div className="mt-2 grid gap-1 text-xs text-slate-500">
                        <div>Terms: {record.terms_accepted ? "yes" : "no"}</div>
                        <div>
                          Privacy: {record.privacy_accepted ? "yes" : "no"}
                        </div>
                        <div>
                          Refund: {record.refund_accepted ? "yes" : "no"}
                        </div>
                        <div>
                          Rules:{" "}
                          {record.platform_rules_accepted ? "yes" : "no"}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="grid gap-1 text-xs font-medium text-slate-600">
                        <div>Terms: {record.terms_version || "—"}</div>
                        <div>Privacy: {record.privacy_version || "—"}</div>
                        <div>Refund: {record.refund_version || "—"}</div>
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
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                        <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                        {record.ip_address || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="text-sm font-bold text-slate-950">
                            {getBrowserLabel(record.user_agent)} ·{" "}
                            {getDeviceLabel(record.user_agent)}
                          </div>
                          <div className="mt-1 max-w-[260px] text-xs leading-5 text-slate-400">
                            {record.user_agent || "No user agent captured."}
                          </div>
                        </div>
                      </div>
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
          database. The admin page may display local time for convenience, but
          UTC should remain the source record.
        </div>
      </div>
    </div>
  )
}
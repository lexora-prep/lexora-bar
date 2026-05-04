"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react"

type RegistrationMode = "private_beta" | "public" | "closed"

type LegalAcceptanceRecord = {
  id: string
  user_id: string
  email: string
  selected_plan: string | null
  registration_mode: string | null
  terms_version: string
  privacy_version: string
  refund_version: string
  terms_accepted: boolean
  privacy_accepted: boolean
  refund_accepted: boolean
  platform_rules_accepted: boolean
  user_agent: string | null
  ip_address: string | null
  accepted_at: string
}

const MODE_OPTIONS: {
  value: RegistrationMode
  title: string
  description: string
}[] = [
  {
    value: "private_beta",
    title: "Private beta only",
    description:
      "Only emails approved in beta invites can register. Best for controlled testing.",
  },
  {
    value: "public",
    title: "Public registration",
    description: "Anyone can create an account. Use this when launch is ready.",
  },
  {
    value: "closed",
    title: "Closed registration",
    description:
      "Nobody can register from the public website. Existing users can still log in.",
  },
]

export default function AdminRegistrationPage() {
  const [mode, setMode] = useState<RegistrationMode>("private_beta")
  const [pendingMode, setPendingMode] = useState<RegistrationMode>("private_beta")
  const [records, setRecords] = useState<LegalAcceptanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const currentModeInfo = useMemo(() => {
    return MODE_OPTIONS.find((item) => item.value === pendingMode) || MODE_OPTIONS[0]
  }, [pendingMode])

  async function loadData() {
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const [modeRes, recordsRes] = await Promise.all([
        fetch("/api/admin/registration-mode", { cache: "no-store" }),
        fetch("/api/admin/legal-acceptances", { cache: "no-store" }),
      ])

      const modeData = await modeRes.json().catch(() => null)
      const recordsData = await recordsRes.json().catch(() => null)

      if (!modeRes.ok) {
        throw new Error(modeData?.error || "Failed to load registration mode.")
      }

      if (!recordsRes.ok) {
        throw new Error(
          recordsData?.error || "Failed to load legal acceptance records."
        )
      }

      if (
        modeData?.mode === "private_beta" ||
        modeData?.mode === "public" ||
        modeData?.mode === "closed"
      ) {
        setMode(modeData.mode)
        setPendingMode(modeData.mode)
      }

      setRecords(recordsData?.records || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  async function saveModeChange() {
    if (pendingMode === mode) {
      setMessage("No registration mode change to save.")
      setError("")
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to change registration mode from "${mode}" to "${pendingMode}"?`
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/admin/registration-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: pendingMode }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update registration mode.")
      }

      setMode(pendingMode)
      setMessage(`Registration mode saved: ${pendingMode}.`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-8 text-[#0E1B35] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#7C3AED]">
              <ShieldCheck className="h-4 w-4" />
              Registration Control
            </div>

            <h1 className="font-serif text-[40px] font-normal leading-tight tracking-[-0.04em] text-[#0E1B35] md:text-[48px]">
              Registration and legal records
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748B]">
              Control whether Lexora Prep is private beta, public, or closed.
              Review the records showing when users agreed to the legal terms.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#CDD3E6] bg-white px-4 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#0E1B35] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="mb-8 rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_18px_50px_rgba(14,27,53,0.08)] md:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
              <Lock className="h-6 w-6 text-[#7C3AED]" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-[-0.03em]">
                Current registration mode
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                {currentModeInfo.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {MODE_OPTIONS.map((option) => {
              const active = option.value === pendingMode
              const saved = option.value === mode

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPendingMode(option.value)}
                  disabled={saving}
                  className={
                    active
                      ? "rounded-3xl border border-[#7C3AED] bg-[#F3F0FF] p-5 text-left shadow-[0_14px_34px_rgba(124,58,237,0.10)]"
                      : "rounded-3xl border border-[#E2E6F0] bg-[#F7F8FC] p-5 text-left transition hover:border-[#C4B5FD] hover:bg-white"
                  }
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-base font-black tracking-[-0.03em]">
                      {option.title}
                    </div>
                    {active ? (
                      <CheckCircle2 className="h-5 w-5 text-[#7C3AED]" />
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-[#64748B]">
                    {option.description}
                  </p>

                  {saved ? (
                    <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.13em] text-[#64748B]">
                      Currently saved
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#E2E6F0] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-[#64748B]">
              Saved mode: <span className="font-black text-[#0E1B35]">{mode}</span>
              {pendingMode !== mode ? (
                <>
                  {" "}→ pending change:{" "}
                  <span className="font-black text-[#7C3AED]">{pendingMode}</span>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={saveModeChange}
              disabled={saving || pendingMode === mode}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0E1B35] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,27,53,0.18)] transition hover:bg-[#162B55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save registration mode"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_18px_50px_rgba(14,27,53,0.08)] md:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
              <Users className="h-6 w-6 text-[#7C3AED]" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-[-0.03em]">
                Legal acceptance records
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                Shows the latest 100 legal acceptance records created during
                registration.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center rounded-3xl bg-[#F7F8FC]">
              <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-3xl bg-[#F7F8FC] p-6 text-sm font-semibold text-[#64748B]">
              No legal acceptance records yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-[0.12em] text-[#94A3B8]">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Mode</th>
                    <th className="px-4 py-2">Accepted</th>
                    <th className="px-4 py-2">Versions</th>
                    <th className="px-4 py-2">IP</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => {
                    const accepted =
                      record.terms_accepted &&
                      record.privacy_accepted &&
                      record.refund_accepted &&
                      record.platform_rules_accepted

                    return (
                      <tr key={record.id} className="bg-[#F7F8FC]">
                        <td className="rounded-l-2xl px-4 py-4 align-top">
                          <div className="font-black text-[#0E1B35]">
                            {record.email}
                          </div>
                          <div className="mt-1 max-w-[260px] truncate text-xs text-[#94A3B8]">
                            {record.user_id}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top font-semibold text-[#334155]">
                          {record.selected_plan || "not recorded"}
                        </td>

                        <td className="px-4 py-4 align-top font-semibold text-[#334155]">
                          {record.registration_mode || "not recorded"}
                        </td>

                        <td className="px-4 py-4 align-top text-[#64748B]">
                          {new Date(record.accepted_at).toLocaleString()}
                        </td>

                        <td className="px-4 py-4 align-top text-xs leading-5 text-[#64748B]">
                          <div>Terms: {record.terms_version}</div>
                          <div>Privacy: {record.privacy_version}</div>
                          <div>Refund: {record.refund_version}</div>
                        </td>

                        <td className="px-4 py-4 align-top text-[#64748B]">
                          {record.ip_address || "not recorded"}
                        </td>

                        <td className="rounded-r-2xl px-4 py-4 align-top">
                          {accepted ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                              <XCircle className="h-4 w-4" />
                              Incomplete
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

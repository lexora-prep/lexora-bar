"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react"

type RegistryFilter =
  | "all"
  | "nextgen"
  | "ube"
  | "state"
  | "territory"

type RegistrySubject = {
  name: string
  ruleCount: number
  globalRuleCount: number
  jurisdictionRuleCount: number
  sourcePackages: string[]
}

type RegistrySchedule = {
  id: string
  mappingKey: string
  priority: number
  effectiveFrom: string
  effectiveUntil: string | null
  isCurrent: boolean
  isFuture: boolean
  regime: {
    id: string
    code: string
    name: string
    description: string | null
  }
  applicableRuleCount: number
  subjectCount: number
  subjects: RegistrySubject[]
}

type RegistryJurisdiction = {
  id: string
  code: string
  name: string
  jurisdictionType: string
  categories: RegistryFilter[]
  currentRegime: RegistrySchedule | null
  nextRegime: RegistrySchedule | null
  schedules: RegistrySchedule[]
  applicableRuleCount: number
  subjectCount: number
}

type RegistryResponse = {
  ok: boolean
  generatedAt: string
  jurisdictions: RegistryJurisdiction[]
  summary: {
    total: number
    nextgen: number
    ube: number
    state: number
    territory: number
  }
  error?: string
}

const FILTERS: Array<{
  value: RegistryFilter
  label: string
  description: string
}> = [
  {
    value: "all",
    label: "All",
    description: "Every registered jurisdiction",
  },
  {
    value: "nextgen",
    label: "NextGen",
    description: "Current or scheduled NextGen jurisdictions",
  },
  {
    value: "ube",
    label: "UBE / MBE",
    description: "Jurisdictions mapped to the current UBE curriculum",
  },
  {
    value: "state",
    label: "State-Specific",
    description: "California, Florida, local, and non-UBE systems",
  },
  {
    value: "territory",
    label: "Territories",
    description: "United States territories and special jurisdictions",
  },
]

function formatDate(value: string | null | undefined) {
  if (!value) return "No end date"

  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function regimeTone(code: string) {
  const normalized = code.toUpperCase()

  if (normalized.includes("NEXTGEN")) {
    return {
      label: "NextGen",
      className:
        "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
      dot: "bg-violet-500",
    }
  }

  if (normalized.includes("UBE")) {
    return {
      label: "UBE / MBE",
      className:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      dot: "bg-amber-500",
    }
  }

  if (
    normalized.includes("CALIFORNIA") ||
    normalized.includes("FLORIDA") ||
    normalized.includes("STATE_SPECIFIC") ||
    normalized.includes("LOCAL_COMPONENT")
  ) {
    return {
      label: "State-specific",
      className:
        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      dot: "bg-blue-500",
    }
  }

  if (normalized.includes("TERRITORY")) {
    return {
      label: "Territory",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      dot: "bg-emerald-500",
    }
  }

  return {
    label: code,
    className:
      "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  }
}

function schedulePeriod(schedule: RegistrySchedule) {
  const from = formatDate(schedule.effectiveFrom)

  if (!schedule.effectiveUntil) {
    return `${from} onward`
  }

  return `${from} – ${formatDate(schedule.effectiveUntil)}`
}

function FilterButton({
  filter,
  active,
  count,
  onClick,
}: {
  filter: (typeof FILTERS)[number]
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={filter.description}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-semibold transition",
        active
          ? "bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
    >
      {filter.label}
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px]",
          active
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  )
}

function JurisdictionDrawer({
  jurisdiction,
  onClose,
}: {
  jurisdiction: RegistryJurisdiction
  onClose: () => void
}) {
  const [entered, setEntered] = useState(false)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setEntered(false)

    window.setTimeout(() => {
      onCloseRef.current()
    }, 220)
  }, [])

  useEffect(() => {
    const body = document.body
    const root = document.documentElement
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const previousRootOverscroll = root.style.overscrollBehavior
    const scrollbarWidth = window.innerWidth - root.clientWidth

    body.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setEntered(true)
        scrollRef.current?.focus({ preventScroll: true })
      })
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight
      root.style.overscrollBehavior = previousRootOverscroll
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [requestClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[100] isolate">
      <button
        type="button"
        aria-label="Close jurisdiction details"
        onClick={requestClose}
        className={[
          "absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]",
          "transition-opacity duration-200 ease-out motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="jurisdiction-drawer-title"
        className={[
          "absolute inset-y-0 right-0 z-10 flex h-[100dvh] min-h-0 w-full max-w-[720px] flex-col overflow-hidden bg-[#f8f9fc]",
          "shadow-[-30px_0_80px_rgba(15,23,42,0.22)] will-change-transform",
          "transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          entered ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[14px] font-bold text-violet-700 ring-1 ring-violet-100">
                {jurisdiction.code}
              </div>

              <div className="min-w-0">
                <h2 id="jurisdiction-drawer-title" className="truncate text-[22px] font-bold tracking-[-0.035em] text-slate-950">
                  {jurisdiction.name}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                    {jurisdiction.jurisdictionType}
                  </span>

                  {jurisdiction.currentRegime ? (
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                        regimeTone(
                          jurisdiction.currentRegime.regime.code
                        ).className,
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          regimeTone(
                            jurisdiction.currentRegime.regime.code
                          ).dot,
                        ].join(" ")}
                      />
                      Current: {jurisdiction.currentRegime.regime.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={requestClose}
              aria-label="Close jurisdiction details"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label="Jurisdiction examination details"
          className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-6 focus:outline-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-white p-4 ring-1 ring-slate-200/80">
              <div className="flex items-center gap-2 text-slate-400">
                <Layers3 size={15} />
                <span className="text-[10px] font-bold uppercase tracking-[0.09em]">Applicable rules</span>
              </div>
              <p className="mt-3 text-[25px] font-bold tracking-[-0.04em] text-slate-950">
                {jurisdiction.applicableRuleCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Unique curriculum rules</p>
            </div>

            <div className="rounded-[20px] bg-white p-4 ring-1 ring-slate-200/80">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles size={15} />
                <span className="text-[10px] font-bold uppercase tracking-[0.09em]">Subjects</span>
              </div>
              <p className="mt-3 text-[25px] font-bold tracking-[-0.04em] text-slate-950">
                {jurisdiction.subjectCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Tested subject groups</p>
            </div>

            <div className="rounded-[20px] bg-white p-4 ring-1 ring-slate-200/80">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarDays size={15} />
                <span className="text-[10px] font-bold uppercase tracking-[0.09em]">Regime periods</span>
              </div>
              <p className="mt-3 text-[25px] font-bold tracking-[-0.04em] text-slate-950">
                {jurisdiction.schedules.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Current and scheduled</p>
            </div>
          </section>

          {jurisdiction.nextRegime ? (
            <section className="mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-[0_18px_45px_rgba(79,70,229,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">Scheduled transition</p>
                  <h3 className="mt-2 text-[20px] font-bold tracking-[-0.03em]">
                    {jurisdiction.nextRegime.regime.name}
                  </h3>
                  <p className="mt-2 text-[13px] text-white/75">
                    Effective administration date: {formatDate(jurisdiction.nextRegime.effectiveFrom)}
                  </p>
                </div>
                <CalendarDays className="mt-1 text-white/70" size={22} />
              </div>
            </section>
          ) : null}

          <section className="mt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Clock3 size={16} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-950">Examination timeline</h3>
                <p className="mt-0.5 text-[12px] text-slate-500">Regime dates, tested subjects, and curriculum coverage</p>
              </div>
            </div>

            <div className="relative mt-6 space-y-5 before:absolute before:bottom-5 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
              {jurisdiction.schedules.map((schedule) => {
                const tone = regimeTone(schedule.regime.code)

                return (
                  <article key={schedule.id} className="relative pl-12">
                    <span
                      className={[
                        "absolute left-[10px] top-5 z-10 h-[15px] w-[15px] rounded-full border-[4px] border-[#f8f9fc]",
                        tone.dot,
                      ].join(" ")}
                    />

                    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.045)]">
                      <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-[15px] font-bold text-slate-950">{schedule.regime.name}</h4>
                              {schedule.isCurrent ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                  <CheckCircle2 size={11} /> Current
                                </span>
                              ) : null}
                              {schedule.isFuture ? (
                                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">Scheduled</span>
                              ) : null}
                            </div>
                            <p className="mt-1 font-mono text-[10px] font-semibold text-violet-600">{schedule.regime.code}</p>
                          </div>

                          <span className={["rounded-full px-2.5 py-1 text-[10px] font-bold", tone.className].join(" ")}>
                            {tone.label}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
                          <div className="flex items-center gap-2 text-slate-600">
                            <CalendarDays size={14} className="text-slate-400" />
                            {schedulePeriod(schedule)}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Layers3 size={14} className="text-slate-400" />
                            {schedule.applicableRuleCount.toLocaleString()} unique rules
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Sparkles size={14} className="text-slate-400" />
                            {schedule.subjectCount} subjects
                          </div>
                        </div>

                        {schedule.regime.description ? (
                          <p className="mt-3 text-[12px] leading-5 text-slate-500">{schedule.regime.description}</p>
                        ) : null}
                      </div>

                      <div className="px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Tested subjects</p>

                        {schedule.subjects.length ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {schedule.subjects.map((subject) => (
                              <div key={subject.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                <div className="min-w-0">
                                  <p className="truncate text-[12px] font-semibold text-slate-800">{subject.name}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {subject.globalRuleCount} core
                                    {subject.jurisdictionRuleCount ? ` · ${subject.jurisdictionRuleCount} jurisdiction-specific` : ""}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                                  {subject.ruleCount}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-800 ring-1 ring-amber-200">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            No published rule applicability has been assigned to this jurisdiction and regime period yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>,
    document.body
  )
}

let registryScheduleCache: RegistryResponse | null = null
let registryScheduleRequest: Promise<RegistryResponse> | null = null

async function fetchRegistrySchedule() {
  if (registryScheduleCache) return registryScheduleCache

  if (!registryScheduleRequest) {
    registryScheduleRequest = fetch("/api/admin/rules/registry/jurisdictions", {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as RegistryResponse | null

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error ||
              "Jurisdiction schedule could not be loaded."
          )
        }

        registryScheduleCache = payload
        return payload
      })
      .catch((error) => {
        registryScheduleRequest = null
        throw error
      })
  }

  return registryScheduleRequest
}

function clearRegistryScheduleCache() {
  registryScheduleCache = null
  registryScheduleRequest = null
}

export default function JurisdictionSchedulePanel() {
  const [data, setData] = useState<RegistryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [filter, setFilter] = useState<RegistryFilter>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] =
    useState<RegistryJurisdiction | null>(null)

  const pageSize = 12

  async function loadRegistry(options?: { force?: boolean }) {
    try {
      setLoading(true)
      setError("")

      if (options?.force) {
        clearRegistryScheduleCache()
      }

      const payload = await fetchRegistrySchedule()
      setData(payload)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Jurisdiction schedule could not be loaded."
      )
    } finally {
      setLoading(false)
    }
  }

  async function synchronizeRegistry() {
    try {
      setSyncing(true)
      setError("")
      setMessage("")

      const response = await fetch(
        "/api/admin/rules/registry/sync",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        }
      )

      const text = await response.text()
      let payload: {
        ok?: boolean
        error?: string
        jurisdictionsCreated?: number
        jurisdictionsUpdated?: number
        mappingsUpserted?: number
      } | null = null

      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            text ||
            `Registry synchronization failed with status ${response.status}.`
        )
      }

      setMessage(
        `Registry synchronized: ${
          payload.jurisdictionsCreated ?? 0
        } created, ${
          payload.jurisdictionsUpdated ?? 0
        } updated, ${
          payload.mappingsUpserted ?? 0
        } schedule mappings confirmed.`
      )

      await loadRegistry({ force: true })
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Jurisdictions could not be synchronized."
      )
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void loadRegistry()
  }, [])

  const counts = useMemo(
    () => ({
      all: data?.summary.total ?? 0,
      nextgen: data?.summary.nextgen ?? 0,
      ube: data?.summary.ube ?? 0,
      state: data?.summary.state ?? 0,
      territory: data?.summary.territory ?? 0,
    }),
    [data]
  )

  const visibleJurisdictions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return (data?.jurisdictions ?? []).filter(
      (jurisdiction) => {
        const matchesFilter =
          filter === "all" ||
          jurisdiction.categories.includes(filter)

        const matchesSearch =
          !normalizedSearch ||
          jurisdiction.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          jurisdiction.code
            .toLowerCase()
            .includes(normalizedSearch) ||
          jurisdiction.schedules.some((schedule) =>
            [
              schedule.regime.name,
              schedule.regime.code,
              ...schedule.subjects.map(
                (subject) => subject.name
              ),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          )

        return matchesFilter && matchesSearch
      }
    )
  }, [data, filter, search])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const totalPages = Math.max(
    1,
    Math.ceil(visibleJurisdictions.length / pageSize)
  )

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedJurisdictions = useMemo(() => {
    const start = (page - 1) * pageSize
    return visibleJurisdictions.slice(start, start + pageSize)
  }, [page, visibleJurisdictions])

  return (
    <>
      <section className="overflow-hidden rounded-[26px] bg-white ring-1 ring-slate-200/80 shadow-[0_18px_55px_rgba(15,23,42,0.055)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <MapPinned size={20} />
              </div>

              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.025em] text-slate-950">
                  Jurisdiction schedule
                </h2>
                <p className="mt-1 max-w-[700px] text-[13px] leading-5 text-slate-500">
                  Filter jurisdictions by examination system. Select any
                  jurisdiction to review its current regime, transition
                  dates, tested subjects, and unique applicable rules.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={synchronizeRegistry}
              disabled={syncing}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgba(124,58,237,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={15} />
              )}
              Sync jurisdictions
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <FilterButton
                  key={item.value}
                  filter={item}
                  active={filter === item.value}
                  count={counts[item.value]}
                  onClick={() => setFilter(item.value)}
                />
              ))}
            </div>

            <label className="flex h-10 w-full items-center rounded-xl bg-slate-50 px-3 ring-1 ring-slate-200 transition focus-within:bg-white focus-within:ring-violet-300 lg:w-[310px]">
              <Search
                size={15}
                className="mr-2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search state, regime, or subject"
                className="w-full bg-transparent text-[12px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl bg-rose-50 px-4 py-3 text-[12px] text-rose-700 ring-1 ring-rose-200">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
            />
            <span>{message}</span>
          </div>
        ) : null}

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-[13px] font-medium text-slate-500">
              <LoaderCircle
                size={20}
                className="mr-3 animate-spin text-violet-600"
              />
              Loading jurisdiction schedules…
            </div>
          ) : visibleJurisdictions.length ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {paginatedJurisdictions.map((jurisdiction) => {
                  const currentTone = jurisdiction.currentRegime
                    ? regimeTone(jurisdiction.currentRegime.regime.code)
                    : null

                  return (
                    <button
                      key={jurisdiction.id}
                      type="button"
                      onClick={() => setSelected(jurisdiction)}
                      className="group flex min-h-[148px] w-full flex-col rounded-[16px] border border-slate-200 bg-white p-3.5 text-left shadow-[0_6px_20px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/20 hover:shadow-[0_12px_28px_rgba(76,29,149,0.08)] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                            {jurisdiction.code}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-slate-950">{jurisdiction.name}</p>
                            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.09em] text-slate-400">
                              {jurisdiction.jurisdictionType}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={15} className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                      </div>

                      <div className="mt-3 min-w-0">
                        {jurisdiction.currentRegime ? (
                          <span
                            className={[
                              "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold",
                              currentTone?.className ?? "",
                            ].join(" ")}
                          >
                            <span className={["h-1.5 w-1.5 shrink-0 rounded-full", currentTone?.dot ?? "bg-slate-400"].join(" ")} />
                            <span className="truncate">{jurisdiction.currentRegime.regime.name}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700">No current mapping</span>
                        )}
                      </div>

                      <div className="mt-2 min-h-[30px] text-[10px] leading-4">
                        {jurisdiction.nextRegime ? (
                          <p className="truncate text-slate-500">
                            <span className="font-semibold text-violet-700">Next:</span>{" "}
                            {jurisdiction.nextRegime.regime.name} · {formatDate(jurisdiction.nextRegime.effectiveFrom)}
                          </p>
                        ) : (
                          <p className="text-slate-400">No scheduled transition</p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <p className="text-[10px] text-slate-500">
                          <span className="font-bold text-slate-950">{jurisdiction.applicableRuleCount.toLocaleString()}</span>{" "}
                          rules
                        </p>
                        <p className="text-[10px] text-slate-500">
                          <span className="font-bold text-slate-950">{jurisdiction.subjectCount}</span>{" "}
                          subjects
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {totalPages > 1 ? (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-slate-500">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visibleJurisdictions.length)} of {visibleJurisdictions.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>

                    <span className="min-w-[78px] text-center text-[11px] font-semibold text-slate-600">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <Globe2 size={28} className="text-slate-300" />
              <p className="mt-3 text-[13px] font-semibold text-slate-700">
                No jurisdictions match this filter
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Try another system filter or search term.
              </p>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3 text-[10px] text-slate-400">
          <span>
            Counts use unique active published rules assigned through
            rule applicability.
          </span>
          <span>
            {visibleJurisdictions.length} matching jurisdiction
            {visibleJurisdictions.length === 1 ? "" : "s"}
          </span>
        </footer>
      </section>

      {selected ? (
        <JurisdictionDrawer
          jurisdiction={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Layers,
  Save,
  Zap,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type RuleSet = "emergency" | "golden" | "priority" | "core" | "full"

type StudyPlan = {
  id?: string
  userId?: string
  startDate?: string
  examDate?: string
  dailyRules?: number
  dailyMBE?: number
  totalDays?: number
  studyWeekends?: boolean
  offDates?: string[]
  onDates?: string[]
  ruleSet?: RuleSet | string
  rulePackages?: string[]
  jurisdictionCode?: string
  jurisdictionName?: string
  examRegime?: string
  customRulesEnabled?: boolean
  studyRound?: number
  userManuallySelectedRulePackage?: boolean
  totalRules?: number
  createdAt?: string
  updatedAt?: string
}

type CalendarCell = {
  date: Date
  isPadding?: boolean
  isOff?: boolean
  isManualOff?: boolean
  isManualOn?: boolean
  isExamDay?: boolean
  isToday?: boolean
  inRange?: boolean
  isWeekend?: boolean
}

const RULE_PACKAGE_LABELS: Record<RuleSet, string> = {
  emergency: "Emergency Pack",
  golden: "Golden Pack",
  priority: "Priority Rules",
  core: "Core Rules",
  full: "Full Rule Bank",
}

function normalizeRuleSet(value?: string | null): RuleSet {
  const clean = String(value ?? "").toLowerCase().trim()

  if (clean === "emergency") return "emergency"
  if (clean === "golden") return "golden"
  if (clean === "priority") return "priority"
  if (clean === "full") return "full"

  return "core"
}

function normalizeDate(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function normalizeDateString(value?: string | Date | null) {
  if (!value) return ""

  if (value instanceof Date) {
    return formatDateKey(value)
  }

  const clean = String(value).trim()
  if (!clean) return ""

  const match = clean.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]

  const parsed = new Date(clean)
  if (isNaN(parsed.getTime())) return ""

  return formatDateKey(parsed)
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function formatDisplayDate(value?: string) {
  if (!value) return "-"

  const clean = normalizeDateString(value)
  if (!clean) return "-"

  const d = new Date(`${clean}T00:00:00`)
  if (isNaN(d.getTime())) return "-"

  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isWeekendDate(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6
}

function getDateRange(start?: string, end?: string) {
  if (!start || !end) return []

  const startDate = normalizeDate(new Date(`${normalizeDateString(start)}T00:00:00`))
  const endDate = normalizeDate(new Date(`${normalizeDateString(end)}T00:00:00`))

  if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return []
  }

  const result: Date[] = []
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    result.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

function isDateOff({
  date,
  studyWeekends,
  offDates,
  onDates,
}: {
  date: Date
  studyWeekends: boolean
  offDates: string[]
  onDates: string[]
}) {
  const key = formatDateKey(date)

  if (onDates.includes(key)) return false
  if (offDates.includes(key)) return true

  return !studyWeekends && isWeekendDate(date)
}

function getActiveStudyDates({
  start,
  end,
  studyWeekends,
  offDates,
  onDates,
}: {
  start?: string
  end?: string
  studyWeekends: boolean
  offDates: string[]
  onDates: string[]
}) {
  return getDateRange(start, end).filter(
    (date) =>
      !isDateOff({
        date,
        studyWeekends,
        offDates,
        onDates,
      })
  )
}

function getWorkloadTotal(plan: StudyPlan | null) {
  const totalRules = Number(plan?.totalRules ?? 0)
  const dailyRules = Number(plan?.dailyRules ?? 0)
  const totalDays = Number(plan?.totalDays ?? 0)

  if (Number.isFinite(totalRules) && totalRules > 0) {
    return Math.round(totalRules)
  }

  if (
    Number.isFinite(dailyRules) &&
    dailyRules > 0 &&
    Number.isFinite(totalDays) &&
    totalDays > 0
  ) {
    return dailyRules * totalDays
  }

  return 0
}

function getSafeDailyRules(totalRules: number, activeStudyDays: number) {
  if (!Number.isFinite(totalRules) || totalRules <= 0) return 0
  if (!Number.isFinite(activeStudyDays) || activeStudyDays <= 0) return 0

  return Math.max(1, Math.ceil(totalRules / activeStudyDays))
}

function buildRulesByDate({
  start,
  end,
  totalRules,
  studyWeekends,
  offDates,
  onDates,
}: {
  start?: string
  end?: string
  totalRules: number
  studyWeekends: boolean
  offDates: string[]
  onDates: string[]
}) {
  const dates = getDateRange(start, end)
  if (!dates.length || totalRules <= 0) return {}

  const activeDates = dates.filter(
    (date) =>
      !isDateOff({
        date,
        studyWeekends,
        offDates,
        onDates,
      })
  )

  if (!activeDates.length) return {}

  const base = Math.floor(totalRules / activeDates.length)
  let remainder = totalRules % activeDates.length

  const rulesByDate: Record<string, number> = {}

  for (const date of activeDates) {
    const key = formatDateKey(date)
    rulesByDate[key] = base + (remainder > 0 ? 1 : 0)

    if (remainder > 0) {
      remainder--
    }
  }

  for (const date of dates) {
    const key = formatDateKey(date)
    if (!(key in rulesByDate)) {
      rulesByDate[key] = 0
    }
  }

  return rulesByDate
}

function buildCalendarCells({
  monthDate,
  start,
  end,
  studyWeekends,
  offDates,
  onDates,
}: {
  monthDate: Date
  start?: string
  end?: string
  studyWeekends: boolean
  offDates: string[]
  onDates: string[]
}) {
  const viewMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)

  const cleanStart = normalizeDateString(start)
  const cleanEnd = normalizeDateString(end)
  const startDate = cleanStart ? normalizeDate(new Date(`${cleanStart}T00:00:00`)) : null
  const endDate = cleanEnd ? normalizeDate(new Date(`${cleanEnd}T00:00:00`)) : null
  const today = normalizeDate(new Date())

  const cells: CalendarCell[] = []
  const firstWeekday = firstDay.getDay()

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({
      date: new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        i - firstWeekday + 1
      ),
      isPadding: true,
    })
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const current = normalizeDate(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    )

    const key = formatDateKey(current)
    const weekend = isWeekendDate(current)

    const inRange =
      !!startDate &&
      !!endDate &&
      current >= startDate &&
      current <= endDate

    const isExamDay = inRange && endDate ? isSameDay(current, endDate) : false
    const manualOff = inRange ? offDates.includes(key) : false
    const manualOn = inRange ? onDates.includes(key) : false

    const off =
      inRange && !isExamDay
        ? isDateOff({
            date: current,
            studyWeekends,
            offDates,
            onDates,
          })
        : false

    cells.push({
      date: current,
      isPadding: !inRange,
      inRange,
      isWeekend: weekend,
      isManualOff: manualOff,
      isManualOn: manualOn,
      isOff: off,
      isExamDay,
      isToday: isSameDay(current, today),
    })
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (firstWeekday + lastDay.getDate()) + 1
    cells.push({
      date: new Date(
        lastDay.getFullYear(),
        lastDay.getMonth(),
        lastDay.getDate() + nextDay
      ),
      isPadding: true,
    })
  }

  return cells
}

export default function StudyPlanPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

  function showToast(kind: "success" | "error", title: string, body?: string) {
    window.dispatchEvent(
      new CustomEvent("lexora:toast", {
        detail: {
          kind,
          title,
          body,
        },
      })
    )
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setLoading(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
      } catch (err) {
        console.error("LOAD USER ERROR:", err)
        setLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    async function loadPlan() {
      if (!userId) return

      try {
        setLoading(true)

        const res = await fetch(`/api/study-plan?userId=${userId}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          setPlan(null)
          return
        }

        const data = await res.json()
        const nextPlan = data || null

        setPlan(nextPlan)
        setHasUnsavedChanges(false)

        if (nextPlan?.startDate) {
          const cleanStart = normalizeDateString(nextPlan.startDate)
          const start = new Date(`${cleanStart}T00:00:00`)

          if (!isNaN(start.getTime())) {
            setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1))
          }
        }
      } catch (err) {
        console.error("LOAD STUDY PLAN ERROR:", err)
        setPlan(null)
      } finally {
        setLoading(false)
      }
    }

    loadPlan()
  }, [userId])

  const offDates = useMemo(() => plan?.offDates ?? [], [plan?.offDates])
  const onDates = useMemo(() => plan?.onDates ?? [], [plan?.onDates])
  const studyWeekends = plan?.studyWeekends ?? true
  const currentRuleSet = normalizeRuleSet(plan?.ruleSet)
  const workloadTotal = getWorkloadTotal(plan)

  const activeStudyDates = useMemo(() => {
    return getActiveStudyDates({
      start: plan?.startDate,
      end: plan?.examDate,
      studyWeekends,
      offDates,
      onDates,
    })
  }, [plan?.startDate, plan?.examDate, studyWeekends, offDates, onDates])

  const activeStudyDays = activeStudyDates.length

  const effectiveDailyRules =
    workloadTotal > 0
      ? getSafeDailyRules(workloadTotal, activeStudyDays)
      : Number(plan?.dailyRules ?? 0)

  const rulesByDate = useMemo(() => {
    return buildRulesByDate({
      start: plan?.startDate,
      end: plan?.examDate,
      totalRules: workloadTotal,
      studyWeekends,
      offDates,
      onDates,
    })
  }, [
    plan?.startDate,
    plan?.examDate,
    workloadTotal,
    studyWeekends,
    offDates,
    onDates,
  ])

  const calendarCells = useMemo(() => {
    return buildCalendarCells({
      monthDate: calendarMonth,
      start: plan?.startDate,
      end: plan?.examDate,
      studyWeekends,
      offDates,
      onDates,
    })
  }, [
    calendarMonth,
    plan?.startDate,
    plan?.examDate,
    studyWeekends,
    offDates,
    onDates,
  ])

  async function persistPlan(nextPlan: StudyPlan) {
    if (!userId || !nextPlan.startDate || !nextPlan.examDate) return

    try {
      setSaving(true)
      setSaveMessage("")
      setSaveError("")

      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          startDate: normalizeDateString(nextPlan.startDate),
          examDate: normalizeDateString(nextPlan.examDate),
          studyWeekends: nextPlan.studyWeekends ?? true,
          offDates: nextPlan.offDates ?? [],
          onDates: nextPlan.onDates ?? [],
          ruleSet: normalizeRuleSet(nextPlan.ruleSet),
          rulePackages:
            Array.isArray(nextPlan.rulePackages) && nextPlan.rulePackages.length
              ? nextPlan.rulePackages
              : [normalizeRuleSet(nextPlan.ruleSet)],
          jurisdictionCode: nextPlan.jurisdictionCode ?? "UBE",
          jurisdictionName: nextPlan.jurisdictionName ?? "UBE / Uniform Current",
          examRegime: nextPlan.examRegime ?? "UBE_CURRENT",
          customRulesEnabled: nextPlan.customRulesEnabled ?? false,
          studyRound: nextPlan.studyRound ?? 1,
          userManuallySelectedRulePackage:
            nextPlan.userManuallySelectedRulePackage ?? false,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || data?.error) {
        console.error("SAVE STUDY PLAN ERROR:", data)

        const message = data?.error || "Could not save study plan. Please try again."

        setSaveError(message)
        setSaveMessage("")
        showToast("error", "Study plan was not saved", message)

        return
      }

      setPlan((prev) => ({
        ...(prev ?? {}),
        ...data,
        startDate: normalizeDateString(data?.startDate ?? nextPlan.startDate),
        examDate: normalizeDateString(data?.examDate ?? nextPlan.examDate),
        offDates: Array.isArray(data?.offDates) ? data.offDates : nextPlan.offDates ?? [],
        onDates: Array.isArray(data?.onDates) ? data.onDates : nextPlan.onDates ?? [],
      }))

      setHasUnsavedChanges(false)
      setSaveMessage("Study plan saved successfully.")
      setSaveError("")
      showToast("success", "Study plan saved", "Your study plan was saved successfully.")

      window.setTimeout(() => {
        setSaveMessage("")
      }, 3000)
    } catch (err) {
      console.error("SAVE STUDY PLAN ERROR:", err)

      setSaveError("Could not save study plan. Please try again.")
      setSaveMessage("")
      showToast("error", "Study plan was not saved", "Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function toggleStudyDate(cell: CalendarCell) {
    if (!plan || cell.isPadding || cell.isExamDay || !cell.inRange || saving) return

    const key = formatDateKey(cell.date)
    const nextOffSet = new Set(offDates)
    const nextOnSet = new Set(onDates)

    const currentlyOff = isDateOff({
      date: cell.date,
      studyWeekends,
      offDates,
      onDates,
    })

    if (currentlyOff) {
      nextOffSet.delete(key)
      nextOnSet.add(key)
    } else {
      nextOnSet.delete(key)
      nextOffSet.add(key)
    }

    const nextOffDates = Array.from(nextOffSet).sort()
    const nextOnDates = Array.from(nextOnSet).sort()

    const nextActiveDays = getActiveStudyDates({
      start: plan.startDate,
      end: plan.examDate,
      studyWeekends,
      offDates: nextOffDates,
      onDates: nextOnDates,
    }).length

    const nextPlan: StudyPlan = {
      ...plan,
      offDates: nextOffDates,
      onDates: nextOnDates,
      totalDays: nextActiveDays,
      dailyRules:
        workloadTotal > 0
          ? getSafeDailyRules(workloadTotal, nextActiveDays)
          : plan.dailyRules ?? 0,
    }

    setPlan(nextPlan)
    setHasUnsavedChanges(true)
    setSaveMessage("")
    setSaveError("")
  }

  function toggleStudyWeekends() {
    if (!plan || saving) return

    const confirmed = window.confirm(
      "Changing weekend study settings will recalculate your study days. Continue?"
    )

    if (!confirmed) return

    const nextStudyWeekends = !(plan.studyWeekends ?? true)

    const nextActiveDays = getActiveStudyDates({
      start: plan.startDate,
      end: plan.examDate,
      studyWeekends: nextStudyWeekends,
      offDates,
      onDates,
    }).length

    const nextPlan: StudyPlan = {
      ...plan,
      studyWeekends: nextStudyWeekends,
      totalDays: nextActiveDays,
      dailyRules:
        workloadTotal > 0
          ? getSafeDailyRules(workloadTotal, nextActiveDays)
          : plan.dailyRules ?? 0,
    }

    setPlan(nextPlan)
    setHasUnsavedChanges(true)
    setSaveMessage("")
    setSaveError("")
  }

  async function saveCurrentPlan() {
    if (!plan || saving) return
    await persistPlan(plan)
  }

  function goToPreviousMonth() {
    const next = new Date(calendarMonth)
    next.setMonth(next.getMonth() - 1)
    next.setDate(1)
    setCalendarMonth(next)
  }

  function goToNextMonth() {
    const next = new Date(calendarMonth)
    next.setMonth(next.getMonth() + 1)
    next.setDate(1)
    setCalendarMonth(next)
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white px-5 py-5">
        <div className="mx-auto max-w-[1400px] text-sm text-slate-500">
          Loading...
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen w-full bg-white px-5 py-5">
        <div className="mx-auto max-w-[980px] space-y-4">
          <h1 className="text-[22px] font-semibold text-slate-900">
            Study Plan
          </h1>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="mb-2 text-[15px] font-semibold text-slate-900">
              No study plan yet
            </div>

            <div className="mb-5 text-sm leading-6 text-slate-500">
              You have not created a study plan yet. Go to your dashboard and set
              your jurisdiction, start date, and exam date.
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white px-4 py-4 xl:px-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Study Plan
            </div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-950">
              Build and manage your schedule
            </h1>
            <div className="mt-1 text-sm text-slate-500">
              {plan.jurisdictionName ?? "UBE / Uniform Current"} ·{" "}
              {plan.examRegime ?? "UBE_CURRENT"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges && (
              <div className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                Unsaved changes
              </div>
            )}

            <button
              onClick={saveCurrentPlan}
              disabled={saving || !hasUnsavedChanges}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                saving || !hasUnsavedChanges
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-violet-200 bg-violet-600 text-white hover:-translate-y-0.5 hover:bg-violet-700"
              }`}
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_315px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="text-[19px] font-semibold tracking-[-0.02em] text-slate-950">
                {formatMonthYear(calendarMonth)}
              </div>

              <button
                onClick={goToNextMonth}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
              Click study days to adjust them. Changes stay local until you press
              Save Changes, so the calendar will not flicker or send multiple
              notifications.
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[12px] font-semibold text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid min-h-[430px] grid-cols-7 gap-2">
              {calendarCells.map((cell, index) => {
                const key = formatDateKey(cell.date)
                const rules = rulesByDate[key] ?? effectiveDailyRules
                const weekendOffByRule =
                  !studyWeekends &&
                  cell.inRange &&
                  cell.isWeekend &&
                  !cell.isExamDay &&
                  !cell.isManualOn

                return (
                  <button
                    key={`${key}-${index}`}
                    type="button"
                    onClick={() => toggleStudyDate(cell)}
                    disabled={!!cell.isPadding || !!cell.isExamDay || !cell.inRange || saving}
                    className={[
                      "min-h-[84px] rounded-[20px] border px-3 py-2.5 text-left shadow-sm transition",
                      cell.isPadding
                        ? "cursor-default border-slate-100 bg-slate-50 text-slate-300"
                        : "",
                      cell.isExamDay ? "border-amber-300 bg-amber-50" : "",
                      cell.isOff ? "border-rose-200 bg-rose-50 text-rose-700" : "",
                      cell.inRange && !cell.isOff && !cell.isExamDay
                        ? "border-blue-100 bg-[#F7FAFF] text-slate-900 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"
                        : "",
                      cell.isToday && !cell.isPadding
                        ? "ring-2 ring-violet-500"
                        : "",
                      saving ? "cursor-wait opacity-80" : "",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`text-[13px] font-semibold ${
                          cell.isPadding ? "text-slate-300" : ""
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {cell.isExamDay && (
                        <span className="text-[10px] font-semibold text-amber-700">
                          EXAM
                        </span>
                      )}
                    </div>

                    {!cell.isPadding && !cell.isOff && !cell.isExamDay && (
                      <>
                        <div className="text-[11px] font-semibold text-violet-600">
                          {rules} rules
                        </div>

                        {cell.isToday && (
                          <div className="mt-1 text-[10px] font-semibold text-emerald-600">
                            Today
                          </div>
                        )}

                        {cell.isWeekend && !cell.isToday && (
                          <div className="mt-1 text-[10px] text-sky-500">
                            Weekend
                          </div>
                        )}
                      </>
                    )}

                    {cell.isOff && (
                      <div className="text-[11px] font-semibold text-rose-500">
                        {weekendOffByRule ? "WEEKEND OFF" : "OFF"}
                      </div>
                    )}

                    {cell.isExamDay && (
                      <div className="mt-1 text-[10px] text-amber-700">
                        {formatDisplayDate(plan.examDate)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-7 grid gap-4">
              <ProgressLine
                label="Rules Planned"
                value={workloadTotal > 0 ? `${workloadTotal}` : "-"}
                percent={workloadTotal > 0 ? 100 : 0}
                tone="violet"
              />

              <ProgressLine
                label="Study Days"
                value={`${activeStudyDays || plan.totalDays || 0}`}
                percent={activeStudyDays || plan.totalDays ? 100 : 0}
                tone="amber"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-[#EEF5FF] shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            <PanelSection title="Overview">
              <OverviewRow
                icon={<Zap size={14} />}
                label="Rules per day"
                value={String(effectiveDailyRules || plan.dailyRules || "-")}
              />
              <OverviewRow
                icon={<CalendarOff size={14} />}
                label="Days off saved"
                value={String(offDates.length)}
              />
              <OverviewRow
                icon={<CalendarClock size={14} />}
                label="Study days left"
                value={String(activeStudyDays || plan.totalDays || 0)}
              />
              <OverviewRow
                icon={<Layers size={14} />}
                label="Rule package"
                value={RULE_PACKAGE_LABELS[currentRuleSet]}
              />
            </PanelSection>

            <PanelSection title="Settings">
              <InfoRow
                label="Jurisdiction"
                value={plan.jurisdictionName ?? "UBE / Uniform Current"}
              />
              <InfoRow
                label="Exam system"
                value={plan.examRegime ?? "UBE_CURRENT"}
              />
              <InfoRow
                label="Start date"
                value={formatDisplayDate(plan.startDate)}
              />
              <InfoRow
                label="Exam date"
                value={formatDisplayDate(plan.examDate)}
              />
              <InfoRow
                label="Package"
                value={RULE_PACKAGE_LABELS[currentRuleSet]}
              />

              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <div className="text-[13px] font-medium text-[#7894BC]">
                    Weekends
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#7894BC]/80">
                    Recalculates local workload
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleStudyWeekends}
                  disabled={saving}
                  className={`relative h-8 w-16 rounded-full transition ${
                    studyWeekends ? "bg-violet-500" : "bg-blue-200"
                  } ${saving ? "cursor-wait opacity-70" : ""}`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      studyWeekends ? "left-9" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </PanelSection>

            <PanelSection title="Daily Breakdown">
              <InfoRow
                label="New Rules"
                value={
                  <span className="font-semibold text-violet-600">
                    {effectiveDailyRules || plan.dailyRules || "-"}
                  </span>
                }
              />
              <InfoRow
                label="Review Rules"
                value={<span className="text-slate-400">From review queue</span>}
              />
              {false && (
                <InfoRow
                  label="Practice Questions"
                  value={<span className="text-amber-700">Not active</span>}
                />
              )}
            </PanelSection>

            {(saving || saveMessage || saveError || hasUnsavedChanges) && (
              <div className="px-5 pb-3 text-[11px] font-medium">
                {saving && <div className="text-[#7894BC]">Saving...</div>}

                {!saving && hasUnsavedChanges && !saveError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                    You have unsaved calendar changes.
                  </div>
                )}

                {!saving && saveMessage && !hasUnsavedChanges && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                    {saveMessage}
                  </div>
                )}

                {!saving && saveError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    {saveError}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 border-t border-blue-100 p-4">
              <ActionButton onClick={saveCurrentPlan} disabled={saving || !hasUnsavedChanges}>
                {saving ? "Saving" : "Save"}
              </ActionButton>
              <ActionButton onClick={() => router.push("/rule-training")}>
                Train
              </ActionButton>
              <ActionButton onClick={() => router.push("/weak-areas")}>
                Weak Areas
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-blue-100 px-5 py-5">
      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7894BC]">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function OverviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-blue-100/70 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#7894BC]">
        <span className="text-[#9DB8DF]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-right text-[13px] font-semibold text-slate-900">
        {value}
      </div>
    </div>
  )
}

function ProgressLine({
  label,
  value,
  percent,
  tone,
}: {
  label: string
  value: string
  percent: number
  tone: "violet" | "amber"
}) {
  const fill =
    tone === "violet"
      ? "bg-violet-500 shadow-[0_0_14px_rgba(124,58,237,0.45)]"
      : "bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.45)]"

  const valueClass = tone === "violet" ? "text-violet-600" : "text-amber-700"

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className={`font-mono text-[13px] font-semibold ${valueClass}`}>
          {value}
        </span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-blue-50">
        <div
          className={`h-full rounded-full ${fill} transition-all duration-700`}
          style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
        />
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px] leading-5">
      <span className="text-[#7894BC]">{label}</span>
      <div className="max-w-[165px] truncate text-right font-medium text-slate-900">
        {value}
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition ${
        disabled
          ? "cursor-not-allowed border-blue-100 bg-blue-50 text-slate-400"
          : "border-blue-100 bg-white text-slate-800 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0"
      }`}
    >
      {children}
    </button>
  )
}
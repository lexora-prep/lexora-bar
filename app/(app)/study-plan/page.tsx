"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type StudyPlan = {
  startDate?: string
  examDate?: string
  dailyRules?: number
  dailyMBE?: number
  totalDays?: number
  studyWeekends?: boolean
  offDates?: string[]
}

type CalendarCell = {
  date: Date
  isPadding?: boolean
  isOff?: boolean
  isExamDay?: boolean
  isToday?: boolean
  inRange?: boolean
}

function normalizeDate(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
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
  const d = new Date(value)
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

function getDateRange(start?: string, end?: string) {
  if (!start || !end) return []

  const startDate = normalizeDate(new Date(start))
  const endDate = normalizeDate(new Date(end))

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
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

function buildRulesByDate(
  start?: string,
  end?: string,
  totalRules = 1200,
  offDates: string[] = []
) {
  const dates = getDateRange(start, end)
  if (!dates.length) return {}

  const offSet = new Set(offDates)
  const activeDates = dates.filter((d) => !offSet.has(formatDateKey(d)))
  if (!activeDates.length) return {}

  const base = Math.floor(totalRules / activeDates.length)
  let remainder = totalRules % activeDates.length

  const rulesByDate: Record<string, number> = {}

  for (const d of activeDates) {
    const key = formatDateKey(d)
    rulesByDate[key] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }

  for (const d of dates) {
    const key = formatDateKey(d)
    if (!(key in rulesByDate)) rulesByDate[key] = 0
  }

  return rulesByDate
}

function buildCalendarCells(
  monthDate: Date,
  start?: string,
  end?: string,
  offDates: string[] = []
) {
  const viewMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)

  const startDate = start ? normalizeDate(new Date(start)) : null
  const endDate = end ? normalizeDate(new Date(end)) : null
  const today = normalizeDate(new Date())
  const offSet = new Set(offDates)

  const cells: CalendarCell[] = []

  const firstWeekday = firstDay.getDay()
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({
      date: new Date(firstDay.getFullYear(), firstDay.getMonth(), i - firstWeekday + 1),
      isPadding: true,
    })
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const current = normalizeDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))
    const key = formatDateKey(current)
    const inRange =
      !!startDate &&
      !!endDate &&
      current >= startDate &&
      current <= endDate

    cells.push({
      date: current,
      isPadding: !inRange,
      inRange,
      isOff: inRange ? offSet.has(key) : false,
      isExamDay: inRange && endDate ? isSameDay(current, endDate) : false,
      isToday: isSameDay(current, today),
    })
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (firstWeekday + lastDay.getDate()) + 1
    cells.push({
      date: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + nextDay),
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
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

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
        setPlan(data || null)

        if (data?.startDate) {
          const start = new Date(data.startDate)
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

  const offDates = plan?.offDates ?? []
  const rulesByDate = useMemo(() => {
    return buildRulesByDate(plan?.startDate, plan?.examDate, 1200, offDates)
  }, [plan?.startDate, plan?.examDate, offDates])

  const calendarCells = useMemo(() => {
    return buildCalendarCells(calendarMonth, plan?.startDate, plan?.examDate, offDates)
  }, [calendarMonth, plan?.startDate, plan?.examDate, offDates])

  const remainingRules = 1200
  const activeStudyDays = getDateRange(plan?.startDate, plan?.examDate).filter(
    (d) => !offDates.includes(formatDateKey(d))
  ).length

  const effectiveDailyRules =
    plan?.dailyRules && plan.dailyRules > 0
      ? plan.dailyRules
      : activeStudyDays > 0
        ? Math.ceil(remainingRules / activeStudyDays)
        : 0

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

          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-[15px] font-semibold text-slate-900">
              No study plan yet
            </div>

            <div className="mb-4 text-sm leading-6 text-slate-500">
              You have not created a study plan yet. Go to your dashboard and set your exam date to create your daily schedule.
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Study Plan
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              Build and manage your schedule
            </h1>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => {
                  const next = new Date(calendarMonth)
                  next.setMonth(next.getMonth() - 1)
                  next.setDate(1)
                  setCalendarMonth(next)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="text-[18px] font-semibold text-slate-900">
                {formatMonthYear(calendarMonth)}
              </div>

              <button
                onClick={() => {
                  const next = new Date(calendarMonth)
                  next.setMonth(next.getMonth() + 1)
                  next.setDate(1)
                  setCalendarMonth(next)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-3 text-sm text-slate-500">
              Click a study date to mark it off. Exam day is highlighted in yellow.
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

                return (
                  <div
                    key={`${key}-${index}`}
                    className={[
                      "min-h-[82px] rounded-[18px] border px-2.5 py-2 text-left",
                      cell.isPadding
                        ? "border-slate-100 bg-slate-50 text-slate-300"
                        : "",
                      cell.isExamDay
                        ? "border-amber-300 bg-amber-50"
                        : "",
                      cell.isOff
                        ? "border-red-300 bg-red-50"
                        : "",
                      cell.inRange && !cell.isOff && !cell.isExamDay
                        ? "border-slate-200 bg-white"
                        : "",
                      cell.isToday && !cell.isPadding
                        ? "ring-2 ring-green-500"
                        : "",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`text-[13px] font-semibold ${
                          cell.isPadding ? "text-slate-300" : "text-slate-900"
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
                        <div className="text-[11px] font-semibold text-blue-600">
                          {rules} rules
                        </div>

                        {cell.isToday && (
                          <div className="mt-1 text-[10px] font-semibold text-green-600">
                            Today
                          </div>
                        )}

                        {(cell.date.getDay() === 0 || cell.date.getDay() === 6) && !cell.isToday && (
                          <div className="mt-1 text-[10px] text-sky-500">
                            Weekend
                          </div>
                        )}
                      </>
                    )}

                    {cell.isOff && (
                      <div className="text-[11px] font-semibold text-red-500">
                        OFF
                      </div>
                    )}

                    {cell.isExamDay && (
                      <div className="mt-1 text-[10px] text-amber-700">
                        {formatDisplayDate(plan.examDate)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
              <div className="mb-1 text-[15px] font-semibold text-slate-900">
                Your Remaining Study Schedule
              </div>

              <div className="mb-3 text-[12px] leading-5 text-slate-500">
                Workload updates automatically when you mark a day off.
              </div>

              <div className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-3">
                <InfoRow label="Start Date" value={formatDisplayDate(plan.startDate)} />
                <InfoRow label="Exam Date" value={formatDisplayDate(plan.examDate)} />
                <InfoRow
                  label="Study on weekends"
                  value={plan.studyWeekends ? "Yes" : "No"}
                />
                <InfoRow
                  label="Base Avg Rules Per Day"
                  value={<span className="font-semibold text-blue-600">{effectiveDailyRules}</span>}
                />
                <InfoRow
                  label="Daily MBE"
                  value={<span className="font-semibold text-blue-700">{plan.dailyMBE ?? 50}</span>}
                />
                <InfoRow
                  label="Remaining Rules"
                  value={<span className="font-semibold">{remainingRules}</span>}
                />
                <InfoRow
                  label="Remaining Study Days"
                  value={<span className="font-semibold">{activeStudyDays || plan.totalDays || 0}</span>}
                />
                <InfoRow
                  label="Days Off Saved"
                  value={<span className="font-semibold">{offDates.length}</span>}
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
              <div className="mb-2 text-[14px] font-semibold text-slate-900">
                Daily Breakdown
              </div>

              <div className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-3">
                <InfoRow
                  label="New Rules"
                  value={<span className="font-semibold text-blue-600">{effectiveDailyRules}</span>}
                />
                <InfoRow
                  label="Review Rules"
                  value={<span className="font-semibold">{Math.max(6, effectiveDailyRules * 2)}</span>}
                />
                <InfoRow
                  label="MBE Questions"
                  value={<span className="font-semibold text-blue-700">{plan.dailyMBE ?? 50}</span>}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-full border border-blue-200 bg-white/80 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur transition hover:bg-blue-50"
              >
                Dashboard
              </button>

              <button
                onClick={() => router.push("/rule-training")}
                className="rounded-full border border-violet-200 bg-white/80 px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:bg-violet-50"
              >
                Train
              </button>

              <button
                onClick={() => router.push("/weak-areas")}
                className="rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm backdrop-blur transition hover:bg-emerald-50"
              >
                Weak Areas
              </button>
            </div>
          </div>
        </div>
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
      <span className="text-slate-500">{label}</span>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  )
}
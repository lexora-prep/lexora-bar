"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ClipboardList,
  Globe,
  X,
  ChevronDown,
  CalendarDays,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const MBE_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Real Property",
  "Constitutional Law",
]

const BLL_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Real Property",
  "Constitutional Law",
  "Business Associations",
  "Family Law",
  "Trusts",
  "Wills",
  "Secured Transactions",
]

const STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

type CalendarDay = {
  date: Date
  isOff: boolean
  isPadding?: boolean
  isExamDay?: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [tab, setTab] = useState<"MBE" | "BLL">("BLL")
  const [showAllAnalytics, setShowAllAnalytics] = useState(false)

  const [state, setState] = useState("Colorado")
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const [subjects, setSubjects] = useState<any[]>([])
  const [stateData, setStateData] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [, setUserName] = useState("User")
  const [isPremium, setIsPremium] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true)

  const [openPlan, setOpenPlan] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [examDate, setExamDate] = useState("")
  const [studyWeekends, setStudyWeekends] = useState(true)
  const [planData, setPlanData] = useState<any>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null)
  const [savedOffMap, setSavedOffMap] = useState<Record<string, boolean>>({})

  const filteredStates = STATES.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setAuthReady(true)
          return
        }

        if (!user) {
          setAuthReady(true)
          router.push("/login")
          return
        }

        setCurrentUserId(user.id)

        const profileRes = await fetch(`/api/profile?userId=${user.id}`)
        if (profileRes.ok) {
          const profile = await profileRes.json()

          if (profile?.full_name) {
            setUserName(profile.full_name)
          } else if (profile?.email) {
            setUserName(profile.email)
          }

          setIsPremium(!!profile?.mbe_access)
        }

        setAuthReady(true)
      } catch (err) {
        console.error("LOAD CURRENT USER ERROR:", err)
        setAuthReady(true)
      }
    }

    loadCurrentUser()
  }, [router, supabase])

  useEffect(() => {
    if (!currentUserId) return

    fetch(`/api/dashboard-analytics?userId=${currentUserId}&state=${state}`)
      .then((res) => res.json())
      .then(setStateData)
      .catch((err) => {
        console.error("dashboard-analytics state fetch error:", err)
      })
  }, [state, currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    fetch(`/api/state-comparison?state=${state}&userId=${currentUserId}`)
      .then(async (res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setStateData((prev: any) => ({
          ...prev,
          ...data,
        }))
      })
      .catch((err) => {
        console.error("state-comparison fetch error:", err)
      })
  }, [state, currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    fetch(`/api/dashboard-analytics?userId=${currentUserId}`)
      .then((res) => res.json())
      .then(setDashboard)
      .catch((err) => {
        console.error("dashboard-analytics fetch error:", err)
      })
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    fetch(`/api/bll-subject-analytics?userId=${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.subjects)) {
          setSubjects(data.subjects)
        } else {
          setSubjects([])
        }
      })
      .catch((err) => {
        console.error("bll-subject-analytics fetch error:", err)
        setSubjects([])
      })
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    loadStudyPlan()
  }, [currentUserId])

  const subjectRows = MBE_SUBJECTS.map((name) => {
    const apiRow = subjects.find((s: any) => s.name === name)

    return {
      name,
      accuracy: apiRow?.accuracy ?? apiRow?.user ?? 0,
      avg: apiRow?.avg ?? apiRow?.state ?? 0,
      completed: apiRow?.completed ?? 0,
      total: apiRow?.total ?? 0,
    }
  })

  const bllRows = BLL_SUBJECTS.map((name) => {
    const apiRow = subjects.find((s: any) => s.name === name)

    return {
      name,
      accuracy: apiRow?.accuracy ?? 0,
      completed: apiRow?.completed ?? 0,
      total: apiRow?.total ?? 0,
    }
  })

  const visibleBllRows = showAllAnalytics ? bllRows : bllRows.slice(0, 5)
  const visibleMbeRows = showAllAnalytics ? subjectRows : subjectRows.slice(0, 5)

  function normalizeLocalDate(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function formatDateInput(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  function formatMonthLabel(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }

  function formatShortDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

  function getPlanDateRange(start: string, end: string) {
    const dates: Date[] = []
    if (!start || !end) return dates

    const cursor = normalizeLocalDate(new Date(start))
    const endDt = normalizeLocalDate(new Date(end))

    while (cursor <= endDt) {
      dates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    return dates
  }

  function buildDistributedRuleMap(
    start: string,
    end: string,
    totalRules: number,
    offMap: Record<string, boolean>,
    catchUpWindow = 7
  ) {
    const allDates = getPlanDateRange(start, end)
    if (allDates.length === 0) return {}

    const base = Math.floor(totalRules / allDates.length)
    let remainder = totalRules % allDates.length

    const ruleMap: Record<string, number> = {}

    for (const d of allDates) {
      const key = formatDateInput(d)
      ruleMap[key] = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
    }

    const sortedOffDates = allDates
      .map((d) => formatDateInput(d))
      .filter((key) => offMap[key])

    for (const offKey of sortedOffDates) {
      const offRules = ruleMap[offKey] ?? 0
      ruleMap[offKey] = 0

      if (offRules <= 0) continue

      const futureTargets = allDates
        .map((d) => formatDateInput(d))
        .filter((key) => key > offKey && !offMap[key])
        .slice(0, catchUpWindow)

      if (futureTargets.length === 0) continue

      const extraBase = Math.floor(offRules / futureTargets.length)
      let extraRemainder = offRules % futureTargets.length

      for (const key of futureTargets) {
        ruleMap[key] += extraBase + (extraRemainder > 0 ? 1 : 0)
        if (extraRemainder > 0) extraRemainder--
      }
    }

    return ruleMap
  }

  function buildCalendarDays(
    start: string,
    end: string,
    monthDate?: Date,
    offMap?: Record<string, boolean>
  ) {
    if (!start || !end) return []

    const startDt = normalizeLocalDate(new Date(start))
    const endDt = normalizeLocalDate(new Date(end))
    const viewMonth = monthDate
      ? new Date(monthDate)
      : new Date(startDt.getFullYear(), startDt.getMonth(), 1)

    viewMonth.setDate(1)

    const firstDayOfMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1
    )
    const lastDayOfMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0
    )

    const firstWeekday = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const cells: CalendarDay[] = []

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({
        date: new Date(
          firstDayOfMonth.getFullYear(),
          firstDayOfMonth.getMonth(),
          i - firstWeekday + 1
        ),
        isOff: false,
        isPadding: true,
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const current = normalizeLocalDate(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
      )
      const key = formatDateInput(current)
      const inStudyRange = current >= startDt && current <= endDt

      cells.push({
        date: current,
        isOff: inStudyRange ? !!offMap?.[key] : false,
        isPadding: !inStudyRange,
        isExamDay: isSameDay(current, endDt),
      })
    }

    while (cells.length % 7 !== 0) {
      const nextIndex = cells.length - (firstWeekday + daysInMonth) + 1
      cells.push({
        date: new Date(
          lastDayOfMonth.getFullYear(),
          lastDayOfMonth.getMonth(),
          lastDayOfMonth.getDate() + nextIndex
        ),
        isOff: false,
        isPadding: true,
      })
    }

    return cells
  }

  function getRemainingStudyDays(
    start: string,
    end: string,
    offMap: Record<string, boolean>
  ) {
    return getPlanDateRange(start, end).filter(
      (d) => !offMap[formatDateInput(d)]
    ).length
  }

  async function saveStudyPlanSilently(nextOffDates: string[]) {
    if (!currentUserId || !startDate || !examDate) return

    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          startDate,
          examDate,
          studyWeekends,
          offDates: nextOffDates,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        console.error("AUTO SAVE STUDY PLAN ERROR:", data)
      }
    } catch (err) {
      console.error("AUTO SAVE STUDY PLAN ERROR:", err)
    }
  }

  async function loadStudyPlan() {
    if (!currentUserId) return

    try {
      const res = await fetch(`/api/study-plan?userId=${currentUserId}`)
      const data = await res.json()

      if (!data) {
        setPlanData(null)
        setCalendarDays([])
        setCalendarMonth(null)
        setSavedOffMap({})
        return
      }

      const start = data.startDate?.slice(0, 10) || ""
      const exam = data.examDate?.slice(0, 10) || ""

      setStartDate(start)
      setExamDate(exam)
      setStudyWeekends(data.studyWeekends ?? true)

      const totalRules = 1200
      const safeDailyRules =
        data?.dailyRules && data.dailyRules > 0
          ? data.dailyRules
          : Math.ceil(totalRules / (data?.totalDays || 1))

      const offMap: Record<string, boolean> = {}
      if (Array.isArray(data?.offDates)) {
        data.offDates.forEach((d: string) => {
          offMap[d] = true
        })
      }

      setSavedOffMap(offMap)

      const distributedRules = buildDistributedRuleMap(
        start,
        exam,
        totalRules,
        offMap
      )

      setPlanData({
        ...data,
        totalRules,
        dailyRules: safeDailyRules,
        rulesByDate: distributedRules,
      })

      if (start && exam) {
        const month = new Date(start)
        const viewMonth = new Date(month.getFullYear(), month.getMonth(), 1)
        setCalendarMonth(viewMonth)
        setCalendarDays(buildCalendarDays(start, exam, viewMonth, offMap))
      } else {
        setCalendarDays([])
        setCalendarMonth(new Date())
      }
    } catch (err) {
      console.error("load study plan error:", err)
      setPlanData(null)
      setCalendarDays([])
      setCalendarMonth(null)
      setSavedOffMap({})
    }
  }

  async function openStudyPlanModal() {
    setOpenPlan(true)
    await loadStudyPlan()

    if (!calendarMonth) {
      setCalendarMonth(new Date())
    }
  }

  function closeStudyPlanModal() {
    setOpenPlan(false)
  }

  async function generatePlan() {
    if (!currentUserId) return

    try {
      if (!startDate || !examDate) {
        alert("Please select both start date and exam date.")
        return
      }

      const start = new Date(startDate)
      const end = new Date(examDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        alert("Invalid date format.")
        return
      }

      if (start > end) {
        alert("Start date cannot be after exam date.")
        return
      }

      const existingOffDates = Object.keys(savedOffMap).filter(
        (d) => savedOffMap[d]
      )

      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          startDate,
          examDate,
          studyWeekends,
          offDates: existingOffDates,
        }),
      })

      const data = await res.json()

      if (!res.ok || data?.error) {
        alert(data?.error || "Failed to generate study plan.")
        return
      }

      const viewMonth = new Date(start.getFullYear(), start.getMonth(), 1)

      const totalRules = 1200
      const safeTotalDays =
        data?.totalDays && data.totalDays > 0 ? data.totalDays : 1
      const safeDailyRules =
        data?.dailyRules && data.dailyRules > 0
          ? data.dailyRules
          : Math.ceil(totalRules / safeTotalDays)

      const offMap: Record<string, boolean> = {}
      if (Array.isArray(data?.offDates)) {
        data.offDates.forEach((d: string) => {
          offMap[d] = true
        })
      }

      setSavedOffMap(offMap)

      const distributedRules = buildDistributedRuleMap(
        startDate,
        examDate,
        totalRules,
        offMap
      )

      const nextPlanData = {
        ...data,
        totalRules,
        dailyRules: safeDailyRules,
        rulesByDate: distributedRules,
      }

      const days = buildCalendarDays(startDate, examDate, viewMonth, offMap)

      setPlanData(nextPlanData)
      setCalendarMonth(viewMonth)
      setCalendarDays(days)
      setDashboard((prev: any) => ({
        ...prev,
        goalBLL: safeDailyRules,
      }))
      setShowWelcomeBanner(false)
    } catch (err) {
      console.error("generatePlan error:", err)
      alert("Something went wrong while generating the plan. Check console.")
    }
  }

  async function toggleCalendarDay(day: CalendarDay) {
    if (day.isPadding || day.isExamDay) return

    const nextOffMap = { ...savedOffMap }
    const key = formatDateInput(day.date)
    nextOffMap[key] = !nextOffMap[key]

    setSavedOffMap(nextOffMap)

    const nextDays = buildCalendarDays(
      startDate,
      examDate,
      calendarMonth ?? new Date(startDate),
      nextOffMap
    )

    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])

    const distributedRules = buildDistributedRuleMap(
      startDate,
      examDate,
      planData?.totalRules ?? 1200,
      nextOffMap
    )

    setCalendarDays(nextDays)

    setPlanData((prev: any) => ({
      ...prev,
      offDates: nextOffDates,
      totalDays: getRemainingStudyDays(startDate, examDate, nextOffMap),
      rulesByDate: distributedRules,
    }))

    await saveStudyPlanSilently(nextOffDates)
  }

  function changeMonth(direction: "prev" | "next") {
    if (!calendarMonth) return

    const next = new Date(calendarMonth)
    next.setMonth(calendarMonth.getMonth() + (direction === "prev" ? -1 : 1))
    next.setDate(1)

    setCalendarMonth(next)
    setCalendarDays(buildCalendarDays(startDate, examDate, next, savedOffMap))
  }

  const todayKey = formatDateInput(normalizeLocalDate(new Date()))
  const todayRuleTarget =
    planData?.rulesByDate?.[todayKey] ??
    planData?.dailyRules ??
    dashboard?.goalBLL ??
    20

  const isNewUser =
    authReady &&
    showWelcomeBanner &&
    !planData &&
    (dashboard?.todayBLL ?? 0) === 0 &&
    (dashboard?.todayMBE ?? 0) === 0 &&
    subjects.length === 0

  const mbeDiff =
    (stateData?.userMBE ?? dashboard?.userMBE ?? 0) -
    (stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0)

  const bllDiff =
    (stateData?.userBLL ?? dashboard?.userBLL ?? 0) -
    (stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0)

  const goalMbe = dashboard?.goalMBE ?? 60
  const goalBll = todayRuleTarget
  const todayMbe = dashboard?.todayMBE ?? 0
  const todayBll = dashboard?.todayBLL ?? 0

  const mbeGoalDelta =
    Math.round((todayMbe / Math.max(goalMbe, 1)) * 100) - 100

  const bllGoalDelta =
    Math.round((todayBll / Math.max(goalBll, 1)) * 100) - 100

  if (!authReady) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-slate-500">
        Loading...
      </div>
    )
  }

  return (
    <>
      <div className="w-full min-h-screen bg-white px-4 py-3 xl:px-5 xl:py-3">
        <div className="mx-auto w-full max-w-[1400px] space-y-4">
          {isNewUser && (
            <div className="relative overflow-hidden rounded-[24px] border border-blue-200/70 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 px-5 py-4 text-white shadow-[0_20px_50px_-20px_rgba(59,130,246,0.55)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%)]" />

              <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur-md">
                    <Sparkles size={12} />
                    Welcome to Lexora Prep
                  </div>

                  <h2 className="mb-1.5 text-[22px] font-bold tracking-tight">
                    Let’s build your study plan
                  </h2>

                  <p className="max-w-2xl text-[13px] leading-6 text-blue-50/95">
                    Start by setting your study plan so Lexora can calculate your
                    daily targets, track progress, and build your countdown
                    workflow.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <GlassButton onClick={openStudyPlanModal} variant="light">
                    Create Study Plan
                  </GlassButton>

                  <GlassButton
                    onClick={() => setShowWelcomeBanner(false)}
                    variant="ghost"
                  >
                    Dismiss
                  </GlassButton>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricGlass
              title="MBE QUESTIONS"
              value={isPremium ? `${todayMbe} / ${goalMbe}` : "🔒"}
              subtitle={isPremium ? "today progress" : "Premium only"}
              progress={
                isPremium
                  ? Number((todayMbe / Math.max(goalMbe, 1)) * 100)
                  : undefined
              }
              accent="blue"
              delta={isPremium ? mbeGoalDelta : null}
              deltaMode="goal"
            />

            <MetricGlass
              title="RULES (BLL)"
              value={`${todayBll} / ${goalBll}`}
              subtitle="Black letter law memorization"
              progress={Number((todayBll / Math.max(goalBll, 1)) * 100)}
              accent="violet"
              delta={bllGoalDelta}
              deltaMode="goal"
            />

            <MetricGlass
              title="OVERALL MBE"
              value={isPremium ? `${stateData?.userMBE ?? dashboard?.userMBE ?? 0}%` : "🔒"}
              subtitle={
                isPremium
                  ? `State avg: ${stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0}%`
                  : "Premium only"
              }
              progress={isPremium ? (stateData?.userMBE ?? dashboard?.userMBE ?? 0) : undefined}
              accent="blue"
              delta={isPremium ? mbeDiff : null}
              deltaMode="average"
            />

            <MetricGlass
              title="BLL SCORE"
              value={`${stateData?.userBLL ?? dashboard?.userBLL ?? 0}%`}
              subtitle={`State avg: ${stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}%`}
              progress={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
              accent="violet"
              delta={bllDiff}
              deltaMode="average"
            />
          </div>

          <div className="overflow-hidden rounded-[24px] border border-blue-200/60 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 px-4 py-3 text-white shadow-[0_20px_50px_-22px_rgba(59,130,246,0.55)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/15 backdrop-blur-md">
                  <ClipboardList size={18} />
                </div>

                <div>
                  <div className="text-[17px] font-semibold">
                    Today’s Smart Plan
                  </div>

                  <div className="mt-0.5 text-[12px] leading-5 text-blue-50/90">
                    {todayBll} / {goalBll} rules today • 6 spaced reviews
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <GlassButton onClick={openStudyPlanModal} variant="light">
                  Study Plan
                </GlassButton>

                <GlassButton
                  onClick={() => router.push("/weak-areas")}
                  variant="ghost"
                >
                  Train Weak Areas →
                </GlassButton>
              </div>
            </div>
          </div>

          <div className="grid items-start grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
            <GradientSurface className="xl:self-start">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                  Performance Analytics
                </h2>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl bg-white/55 p-1 backdrop-blur-md shadow-sm">
                    <button
                      onClick={() => setTab("BLL")}
                      className={`rounded-lg px-3 py-1.5 text-[11px] transition-all duration-200 ${
                        tab === "BLL"
                          ? "bg-white text-violet-700 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      BLL
                    </button>

                    <button
                      onClick={() => isPremium && setTab("MBE")}
                      className={`rounded-lg px-3 py-1.5 text-[11px] transition-all duration-200 ${
                        tab === "MBE"
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500"
                      } ${!isPremium ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      MBE {!isPremium && "🔒"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllAnalytics((prev) => !prev)}
                    className="rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    {showAllAnalytics ? "Show less" : "Show all"}
                  </button>
                </div>
              </div>

              <div
                className={`pr-1 ${
                  showAllAnalytics ? "max-h-[470px] overflow-y-auto" : "overflow-hidden"
                }`}
              >
                {tab === "BLL" && (
                  <div className="space-y-3">
                    {visibleBllRows.map((s) => (
                      <SubjectProgressRow
                        key={s.name}
                        name={s.name}
                        leftBadge={`${s.completed} / ${s.total}`}
                        rightBadge={`${s.accuracy}%`}
                        value={s.accuracy}
                        accent="violet"
                      />
                    ))}
                  </div>
                )}

                {tab === "MBE" && (
                  <div className="space-y-3">
                    {visibleMbeRows.map((s) => (
                      <SubjectProgressRow
                        key={s.name}
                        name={s.name}
                        leftBadge={`avg ${s.avg}%`}
                        rightBadge={`${s.accuracy}%`}
                        value={s.accuracy}
                        accent="blue"
                        footer={`${s.completed} / ${s.total} completed`}
                        avg={s.avg}
                      />
                    ))}
                  </div>
                )}
              </div>
            </GradientSurface>

            <GradientSurface className="h-fit xl:sticky xl:top-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                    <Globe size={15} />
                    {state}
                  </div>

                  <div className="mt-1 text-[11px] text-slate-500">
                    You vs State Average
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 transition-colors hover:text-blue-700"
                  onClick={() => setOpen(true)}
                >
                  Change State
                  <ChevronDown size={12} />
                </button>
              </div>

              {(stateData || dashboard) && (
                <div className="space-y-5">
                  <CompactCompareRow
                    label="MBE Accuracy"
                    value={isPremium ? (stateData?.userMBE ?? dashboard?.userMBE ?? 0) : 0}
                    avg={isPremium ? (stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0) : 0}
                    top={stateData?.topMBE ?? 0}
                    diffLabel={
                      isPremium
                        ? `${mbeDiff >= 0 ? "+" : ""}${mbeDiff.toFixed(0)}% vs avg`
                        : "🔒 Premium"
                    }
                    accent="blue"
                    locked={!isPremium}
                  />

                  <CompactCompareRow
                    label="BLL Score"
                    value={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
                    avg={stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}
                    top={stateData?.topBLL ?? 0}
                    diffLabel={`${bllDiff >= 0 ? "+" : ""}${bllDiff.toFixed(0)}% vs avg`}
                    accent="violet"
                  />

                  <div className="space-y-2 border-t border-white/60 pt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-400">
                      Quick Start
                    </div>

                    <QuickActionGradient
                      title="MBE Practice"
                      subtitle={isPremium ? "Go to MBE drills" : "Premium only"}
                      accent="blue"
                      onClick={() => isPremium && router.push("/mbe")}
                    />
                    <QuickActionGradient
                      title="Rule Training"
                      subtitle="Continue BLL memorization"
                      accent="violet"
                      onClick={() => router.push("/rule-training")}
                    />
                    <QuickActionGradient
                      title="Weak Areas"
                      subtitle="Train your weakest rules"
                      accent="emerald"
                      onClick={() => router.push("/weak-areas")}
                    />
                  </div>
                </div>
              )}
            </GradientSurface>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Select Your Bar Exam State
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the state used for your comparison data.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="mx-auto" size={16} />
              </button>
            </div>

            <input
              placeholder="Search states..."
              className="mb-4 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition-colors focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {filteredStates.map((s) => (
                <button
                  key={s.code}
                  onClick={() => {
                    setState(s.name)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-3 text-left transition-all duration-200 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{s.name}</span>

                  <span className="text-xs font-semibold text-blue-600">
                    Select
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {openPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[3px]"
          onClick={closeStudyPlanModal}
        >
          <div
            className="h-[88vh] w-[1120px] max-w-[96vw] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <h2 className="text-[17px] font-semibold leading-none text-slate-900">
                      Study Plan
                    </h2>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Build and manage your schedule.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeStudyPlanModal}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
                <div className="min-h-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => changeMonth("prev")}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/50 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
                    >
                      ‹
                    </button>

                    <div className="text-[16px] font-semibold text-slate-900">
                      {calendarMonth
                        ? formatMonthLabel(calendarMonth)
                        : formatMonthLabel(new Date())}
                    </div>

                    <button
                      onClick={() => changeMonth("next")}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/50 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mb-3 text-[13px] text-slate-500">
                    Click a study date to mark it off. Exam day is highlighted in yellow.
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {calendarDays.length === 0 ? (
                    <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                      Select your start date and exam date, then click Generate Plan.
                    </div>
                  ) : (
                    <div className="h-[520px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((d, i) => {
                          const isWeekend =
                            d.date.getDay() === 0 || d.date.getDay() === 6
                          const isToday = isSameDay(
                            d.date,
                            normalizeLocalDate(new Date())
                          )
                          const todayDate = normalizeLocalDate(new Date())
                          const isPastDay = normalizeLocalDate(d.date) < todayDate
                          const isFinished =
                            isPastDay &&
                            !d.isPadding &&
                            !d.isExamDay &&
                            !d.isOff

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleCalendarDay(d)}
                              disabled={d.isPadding}
                              className={[
                                "min-h-[74px] rounded-[20px] px-2 py-2 text-left transition-all duration-200 shadow-sm",
                                d.isPadding
                                  ? "cursor-default border border-slate-100 bg-slate-50 text-slate-300"
                                  : "",
                                d.isExamDay
                                  ? "border border-amber-300 bg-amber-50"
                                  : "",
                                d.isOff ? "border border-red-300 bg-red-50" : "",
                                !d.isPadding && !d.isOff && !d.isExamDay
                                  ? "border border-white/70 bg-white/85 backdrop-blur-md hover:bg-sky-50"
                                  : "",
                                isToday && !d.isPadding ? "ring-2 ring-green-500" : "",
                                isFinished ? "border border-green-300 bg-green-50" : "",
                                isWeekend &&
                                !d.isPadding &&
                                !d.isOff &&
                                !d.isExamDay
                                  ? "bg-sky-50/75"
                                  : "",
                              ].join(" ")}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[13px] font-semibold">
                                  {d.date.getDate()}
                                </span>

                                {d.isExamDay && (
                                  <span className="text-[9px] font-semibold text-amber-700">
                                    EXAM
                                  </span>
                                )}
                              </div>

                              {!d.isPadding && !d.isExamDay && !d.isOff && (
                                <>
                                  <div className="text-[10px] font-semibold text-sky-600">
                                    {planData?.rulesByDate?.[formatDateInput(d.date)] ??
                                      planData?.dailyRules ??
                                      0}{" "}
                                    rules
                                  </div>

                                  {isFinished && (
                                    <div className="mt-1 text-[10px] font-semibold text-green-600">
                                      Completed
                                    </div>
                                  )}

                                  {isWeekend && !isFinished && (
                                    <div className="mt-1 text-[10px] text-sky-500">
                                      Weekend
                                    </div>
                                  )}
                                </>
                              )}

                              {d.isOff && (
                                <div className="text-[10px] font-semibold text-red-500">
                                  OFF
                                </div>
                              )}

                              {d.isExamDay && (
                                <div className="mt-1 text-[9px] text-amber-700">
                                  {formatShortDate(d.date)}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto">
                  <div className="rounded-[24px] bg-gradient-to-br from-white via-white to-sky-50/40 p-4 shadow-sm backdrop-blur-md">
                    <div>
                      <div className="text-[14px] font-semibold text-slate-800">
                        Your Remaining Study Schedule
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-slate-500">
                        Workload updates automatically when you mark a day off.
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">
                            Start Date
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-md outline-none transition-colors focus:border-blue-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">
                            Exam Date
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-md outline-none transition-colors focus:border-blue-500"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-[13px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={studyWeekends}
                            onChange={(e) => setStudyWeekends(e.target.checked)}
                          />
                          Study on weekends
                        </label>
                      </div>

                      <div className="grid gap-2 pt-1">
                        <InfoRow
                          label="Base Avg Rules Per Day"
                          value={
                            <span className="font-semibold text-blue-600">
                              {planData?.dailyRules ?? "-"}
                            </span>
                          }
                        />

                        <InfoRow
                          label="Daily MBE"
                          value={
                            isPremium ? (
                              <span className="font-semibold text-blue-700">
                                {planData?.dailyMBE ?? 50}
                              </span>
                            ) : (
                              <PremiumBadge />
                            )
                          }
                        />

                        <InfoRow
                          label="Remaining Rules"
                          value={
                            <span className="font-semibold">
                              {planData?.totalRules ?? 1200}
                            </span>
                          }
                        />

                        <InfoRow
                          label="Remaining Study Days"
                          value={
                            <span className="font-semibold">
                              {planData?.totalDays}
                            </span>
                          }
                        />

                        <InfoRow
                          label="Days Off Saved"
                          value={
                            <span className="font-semibold">
                              {planData?.offDates?.length ?? 0}
                            </span>
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-gradient-to-br from-white via-white to-violet-50/35 p-4 shadow-sm backdrop-blur-md">
                    <div className="mb-2 text-[14px] font-semibold text-slate-900">
                      Daily Breakdown
                    </div>

                    <div className="space-y-2 text-[13px] text-slate-600">
                      <InfoRow
                        label="New Rules"
                        value={
                          <span className="font-semibold text-blue-600">
                            {todayRuleTarget}
                          </span>
                        }
                      />

                      <InfoRow
                        label="Review Rules"
                        value={
                          <span className="font-semibold">
                            {todayRuleTarget ? Math.max(6, todayRuleTarget * 2) : 0}
                          </span>
                        }
                      />

                      <InfoRow
                        label="MBE Questions"
                        value={
                          isPremium ? (
                            <span className="font-semibold text-blue-700">
                              {planData?.dailyMBE ?? 50}
                            </span>
                          ) : (
                            <PremiumBadge />
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={generatePlan}
                      className="rounded-2xl border border-white/30 bg-gradient-to-b from-blue-500/95 to-blue-600 px-3 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] backdrop-blur transition hover:from-blue-500 hover:to-blue-700"
                    >
                      Generate
                    </button>

                    <button
                      onClick={async () => {
                        if (!currentUserId) return

                        try {
                          await fetch("/api/study-plan", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              userId: currentUserId,
                              startDate,
                              examDate,
                              studyWeekends,
                              offDates: planData?.offDates ?? [],
                            }),
                          })

                          await loadStudyPlan()
                          closeStudyPlanModal()
                          setShowWelcomeBanner(false)
                        } catch (err) {
                          console.error("save study plan error:", err)
                        }
                      }}
                      className="rounded-2xl border border-white/30 bg-gradient-to-b from-violet-500/95 to-violet-600 px-3 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.22)] backdrop-blur transition hover:from-violet-500 hover:to-violet-700"
                    >
                      Save
                    </button>

                    <button
                      onClick={() => {
                        setPlanData(null)
                        setCalendarDays([])
                        setCalendarMonth(new Date())
                        setStartDate("")
                        setExamDate("")
                        setStudyWeekends(true)
                        setSavedOffMap({})
                      }}
                      className="rounded-2xl border border-white/50 bg-white/80 px-3 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
      Premium
      <span className="text-violet-600">🔒</span>
    </span>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <div>{value}</div>
    </div>
  )
}

function GlassButton({
  children,
  onClick,
  variant = "light",
}: {
  children: ReactNode
  onClick: () => void
  variant?: "light" | "ghost"
}) {
  return (
    <button
      onClick={onClick}
      className={
        variant === "light"
          ? "rounded-2xl border border-white/40 bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
          : "rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/15"
      }
    >
      {children}
    </button>
  )
}

function MetricGlass({
  title,
  value,
  subtitle,
  progress,
  accent,
  delta,
  deltaMode,
}: {
  title: string
  value: string
  subtitle: string
  progress?: number
  accent: "blue" | "violet"
  delta?: number | null
  deltaMode: "goal" | "average"
}) {
  const accentClasses =
    accent === "blue"
      ? "from-blue-500/10 via-sky-400/10 to-white"
      : "from-violet-500/12 via-fuchsia-400/10 to-white"

  const barClass =
    accent === "blue"
      ? "from-blue-500 to-sky-400"
      : "from-violet-500 to-fuchsia-400"

  const deltaClass =
    typeof delta === "number"
      ? delta >= 0
        ? "text-emerald-600"
        : "text-rose-600"
      : "text-slate-400"

  return (
    <div
      className={`rounded-[22px] bg-gradient-to-br ${accentClasses} p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] backdrop-blur-md`}
    >
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
        {title}
      </div>

      <div className="mt-1.5 text-[18px] font-semibold text-slate-900">
        {value}
      </div>

      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-1.5 rounded-full bg-gradient-to-r ${barClass}`}
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-4">
        <span className="text-slate-500">{subtitle}</span>

        {typeof delta === "number" ? (
          <span className={`font-semibold ${deltaClass}`}>
            {delta >= 0 ? "↗" : "↘"} {delta >= 0 ? "+" : ""}
            {delta.toFixed(0)}% {deltaMode === "goal" ? "to goal" : "vs avg"}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function GradientSurface({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[24px] bg-gradient-to-br from-sky-50/70 via-white to-violet-50/55 p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

function SubjectProgressRow({
  name,
  leftBadge,
  rightBadge,
  value,
  accent,
  footer,
  avg,
}: {
  name: string
  leftBadge: string
  rightBadge: string
  value: number
  accent: "blue" | "violet"
  footer?: string
  avg?: number
}) {
  const badgeClass =
    accent === "blue"
      ? "bg-blue-50/85 text-blue-700"
      : "bg-violet-50/85 text-violet-700"

  const barClass =
    accent === "blue"
      ? "bg-gradient-to-r from-blue-500 to-sky-400"
      : "bg-gradient-to-r from-violet-500 to-fuchsia-400"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-slate-800">{name}</span>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
            {leftBadge}
          </span>

          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
            {rightBadge}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/80">
        <div
          className={`absolute h-1.5 rounded-full ${barClass} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />

        {typeof avg === "number" && (
          <div
            className="absolute top-[-1px] h-[7px] w-[3px] rounded-full bg-slate-400"
            style={{ left: `${avg}%` }}
          />
        )}
      </div>

      {footer ? <div className="text-[10px] text-slate-400">{footer}</div> : null}
    </div>
  )
}

function CompactCompareRow({
  label,
  value,
  avg,
  top,
  diffLabel,
  accent,
  locked = false,
}: {
  label: string
  value: number
  avg: number
  top: number
  diffLabel: string
  accent: "blue" | "violet"
  locked?: boolean
}) {
  const barClass =
    accent === "blue"
      ? "bg-gradient-to-r from-blue-500 to-sky-400"
      : "bg-gradient-to-r from-violet-500 to-fuchsia-400"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-emerald-600">{diffLabel}</span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/80">
        <div
          className={`absolute h-1.5 rounded-full ${barClass}`}
          style={{ width: `${locked ? 0 : value}%` }}
        />
        <div
          className="absolute top-[-1px] h-[7px] w-[3px] rounded-full bg-slate-400"
          style={{ left: `${locked ? 0 : avg}%` }}
        />
      </div>

      <div className="text-[10px] leading-5 text-slate-500">
        {locked
          ? "Upgrade to Premium to access MBE analytics"
          : `You: ${value}% | Avg: ${avg}% | Top: ${top}%`}
      </div>
    </div>
  )
}

function QuickActionGradient({
  title,
  subtitle,
  onClick,
  accent,
}: {
  title: string
  subtitle: string
  onClick: () => void
  accent: "blue" | "violet" | "emerald"
}) {
  const bgClass =
    accent === "blue"
      ? "from-blue-50/90 to-sky-50/90"
      : accent === "violet"
        ? "from-violet-50/90 to-fuchsia-50/90"
        : "from-emerald-50/90 to-teal-50/90"

  const arrowClass =
    accent === "blue"
      ? "text-blue-300"
      : accent === "violet"
        ? "text-violet-300"
        : "text-emerald-300"

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${bgClass} px-3 py-2 text-left shadow-sm transition hover:scale-[1.01]`}
    >
      <div>
        <div className="text-[12px] font-semibold text-slate-800">{title}</div>
        <div className="text-[10px] text-slate-500">{subtitle}</div>
      </div>
      <div className={`text-lg ${arrowClass}`}>›</div>
    </button>
  )
}
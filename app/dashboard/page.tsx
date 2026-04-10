"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

import {
  MetricCard,
  WelcomeBanner,
  SmartPlanBanner,
  PerformanceAnalytics,
  StateComparison,
  StateSelectorModal,
  StudyPlanModal,
  type CalendarDay,
} from "./components"

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

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // UI State
  const [tab, setTab] = useState<"MBE" | "BLL">("BLL")
  const [showAllAnalytics, setShowAllAnalytics] = useState(false)
  const [state, setState] = useState("Colorado")
  const [stateModalOpen, setStateModalOpen] = useState(false)
  const [stateSearch, setStateSearch] = useState("")

  // Data State
  const [subjects, setSubjects] = useState<any[]>([])
  const [stateData, setStateData] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)

  // Auth State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [, setUserName] = useState("User")
  const [isPremium, setIsPremium] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true)

  // Study Plan State
  const [studyPlanOpen, setStudyPlanOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [examDate, setExamDate] = useState("")
  const [studyWeekends, setStudyWeekends] = useState(true)
  const [planData, setPlanData] = useState<any>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null)
  const [savedOffMap, setSavedOffMap] = useState<Record<string, boolean>>({})

  // ============================================
  // Auth & Data Loading
  // ============================================

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // ============================================
  // Subject Data Processing
  // ============================================

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

  // ============================================
  // Date Utilities
  // ============================================

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

  // ============================================
  // Study Plan Logic
  // ============================================

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
    setStudyPlanOpen(true)
    await loadStudyPlan()

    if (!calendarMonth) {
      setCalendarMonth(new Date())
    }
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

  async function handleSavePlan() {
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
      setStudyPlanOpen(false)
      setShowWelcomeBanner(false)
    } catch (err) {
      console.error("save study plan error:", err)
    }
  }

  function handleResetPlan() {
    setPlanData(null)
    setCalendarDays([])
    setCalendarMonth(new Date())
    setStartDate("")
    setExamDate("")
    setStudyWeekends(true)
    setSavedOffMap({})
  }

  // ============================================
  // Computed Values
  // ============================================

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

  // ============================================
  // Render
  // ============================================

  if (!authReady) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-6 xl:px-8">
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
          {/* Welcome Banner */}
          {isNewUser && (
            <WelcomeBanner
              onCreatePlan={openStudyPlanModal}
              onDismiss={() => setShowWelcomeBanner(false)}
            />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="MBE QUESTIONS"
              value={isPremium ? `${todayMbe} / ${goalMbe}` : "Locked"}
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

            <MetricCard
              title="RULES (BLL)"
              value={`${todayBll} / ${goalBll}`}
              subtitle="Black letter law memorization"
              progress={Number((todayBll / Math.max(goalBll, 1)) * 100)}
              accent="emerald"
              delta={bllGoalDelta}
              deltaMode="goal"
            />

            <MetricCard
              title="OVERALL MBE"
              value={
                isPremium
                  ? `${stateData?.userMBE ?? dashboard?.userMBE ?? 0}%`
                  : "Locked"
              }
              subtitle={
                isPremium
                  ? `State avg: ${stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0}%`
                  : "Premium only"
              }
              progress={
                isPremium
                  ? (stateData?.userMBE ?? dashboard?.userMBE ?? 0)
                  : undefined
              }
              accent="blue"
              delta={isPremium ? mbeDiff : null}
              deltaMode="average"
            />

            <MetricCard
              title="BLL SCORE"
              value={`${stateData?.userBLL ?? dashboard?.userBLL ?? 0}%`}
              subtitle={`State avg: ${stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}%`}
              progress={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
              accent="emerald"
              delta={bllDiff}
              deltaMode="average"
            />
          </div>

          {/* Smart Plan Banner */}
          <SmartPlanBanner
            todayBll={todayBll}
            goalBll={goalBll}
            onOpenPlan={openStudyPlanModal}
            onTrainWeakAreas={() => router.push("/weak-areas")}
          />

          {/* Analytics and State Comparison */}
          <div className="grid items-start grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <PerformanceAnalytics
              tab={tab}
              setTab={setTab}
              isPremium={isPremium}
              showAll={showAllAnalytics}
              setShowAll={setShowAllAnalytics}
              bllRows={bllRows}
              mbeRows={subjectRows}
            />

            <StateComparison
              state={state}
              onChangeState={() => setStateModalOpen(true)}
              isPremium={isPremium}
              userMBE={stateData?.userMBE ?? dashboard?.userMBE ?? 0}
              stateMBEAvg={stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0}
              topMBE={stateData?.topMBE ?? 0}
              mbeDiff={mbeDiff}
              userBLL={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
              stateBLLAvg={stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}
              topBLL={stateData?.topBLL ?? 0}
              bllDiff={bllDiff}
              onMBEPractice={() => isPremium && router.push("/mbe")}
              onRuleTraining={() => router.push("/rule-training")}
              onWeakAreas={() => router.push("/weak-areas")}
            />
          </div>
        </div>
      </div>

      {/* State Selector Modal */}
      <StateSelectorModal
        open={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        currentState={state}
        onSelectState={setState}
        search={stateSearch}
        onSearchChange={setStateSearch}
      />

      {/* Study Plan Modal */}
      <StudyPlanModal
        open={studyPlanOpen}
        onClose={() => setStudyPlanOpen(false)}
        isPremium={isPremium}
        startDate={startDate}
        examDate={examDate}
        studyWeekends={studyWeekends}
        onStartDateChange={setStartDate}
        onExamDateChange={setExamDate}
        onStudyWeekendsChange={setStudyWeekends}
        planData={planData}
        todayRuleTarget={todayRuleTarget}
        calendarMonth={calendarMonth}
        calendarDays={calendarDays}
        onChangeMonth={changeMonth}
        onToggleDay={toggleCalendarDay}
        onGenerate={generatePlan}
        onSave={handleSavePlan}
        onReset={handleResetPlan}
        formatDateInput={formatDateInput}
        formatMonthLabel={formatMonthLabel}
        formatShortDate={formatShortDate}
        isSameDay={isSameDay}
        normalizeLocalDate={normalizeLocalDate}
      />
    </div>
  )
}

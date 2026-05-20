"use client"

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ClipboardList,
  Globe,
  X,
  ChevronDown,
  CalendarDays,
  Sparkles,
  LineChart,
  BarChart3,
  Crown,
  Lock,
  Zap,
  AlertTriangle,
  Gavel,
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

type AnalyticsRange = "7d" | "14d" | "30d" | "custom"
type AnalyticsMode = "BLL" | "MBE"

type SubjectAnalyticsRow = {
  name: string
  accuracy: number
  completed: number
  total: number
  level: string
  progressWidth: number
}

type TrendPoint = {
  date: string
  mbe: number
  bll: number
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState("")
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const [bllSubjects, setBllSubjects] = useState<any[]>([])
  const [mbeSubjects, setMbeSubjects] = useState<any[]>([])
  const [stateData, setStateData] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [trendData, setTrendData] = useState<TrendPoint[]>([])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [, setUserName] = useState("User")
  const [isPremium, setIsPremium] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  const [coreLoaded, setCoreLoaded] = useState(false)
  const [studyPlanLoaded, setStudyPlanLoaded] = useState(false)

  const [openPlan, setOpenPlan] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [examDate, setExamDate] = useState("")
  const [studyWeekends, setStudyWeekends] = useState(true)
  const [planData, setPlanData] = useState<any>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null)
  const [savedOffMap, setSavedOffMap] = useState<Record<string, boolean>>({})
  const [hasShownPlanThisSession, setHasShownPlanThisSession] =
    useState(false)

  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("30d")
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>("BLL")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false)
  const customRangeRef = useRef<HTMLDivElement | null>(null)

  const filteredStates = STATES.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customRangeRef.current &&
        !customRangeRef.current.contains(event.target as Node)
      ) {
        setShowCustomRangePicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

        const profileRes = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (profileRes.ok) {
          const profile = await profileRes.json()

          if (profile?.full_name) {
            setUserName(profile.full_name)
          } else if (profile?.email) {
            setUserName(profile.email)
          }

          setIsPremium(!!profile?.mbe_access)

          if (profile?.jurisdiction && String(profile.jurisdiction).trim()) {
            setState(String(profile.jurisdiction).trim())
          } else {
            setState("")
          }
        }

        setAuthReady(true)
      } catch (err) {
        console.error("LOAD CURRENT USER ERROR:", err)
        setAuthReady(true)
      }
    }

    loadCurrentUser()
  }, [router, supabase])

  async function loadStudyPlanOnly(userId: string) {
    try {
      setStudyPlanLoaded(false)

      const res = await fetch(`/api/study-plan?userId=${userId}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!data || !data.startDate || !data.examDate) {
        setPlanData(null)
        setCalendarDays([])
        setCalendarMonth(null)
        setSavedOffMap({})
        setStartDate("")
        setExamDate("")
        setStudyWeekends(true)
        setHasShownPlanThisSession(false)
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
          : Math.ceil(totalRules / Math.max(data?.totalDays || 1, 1))

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

      setHasShownPlanThisSession(true)

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
      console.error("LOAD STUDY PLAN ERROR:", err)
      setPlanData(null)
      setCalendarDays([])
      setCalendarMonth(null)
      setSavedOffMap({})
    } finally {
      setStudyPlanLoaded(true)
    }
  }

  async function loadDashboardBundle(userId: string, selectedState: string) {
    try {
      setCoreLoaded(false)

      const requests: Promise<Response>[] = [
        fetch(`/api/dashboard-analytics?userId=${userId}`, {
          cache: "no-store",
        }),
        fetch(`/api/bll-subject-analytics?userId=${userId}`, {
          cache: "no-store",
        }),
      ]

      if (selectedState) {
        requests.push(
          fetch(
            `/api/dashboard-analytics?userId=${userId}&state=${encodeURIComponent(
              selectedState
            )}`,
            { cache: "no-store" }
          )
        )
        requests.push(
          fetch(
            `/api/state-comparison?state=${encodeURIComponent(
              selectedState
            )}&userId=${userId}`,
            { cache: "no-store" }
          )
        )
      }

      const responses = await Promise.all(requests)
      const jsons = await Promise.all(
        responses.map(async (res) => {
          if (!res.ok) return null
          return res.json().catch(() => null)
        })
      )

      const dashboardJson = jsons[0]
      const subjectsJson = jsons[1]
      const stateDashboardJson = selectedState ? jsons[2] : null
      const stateComparisonJson = selectedState ? jsons[3] : null

      setDashboard(dashboardJson)
      setBllSubjects(
        Array.isArray(subjectsJson?.subjects) ? subjectsJson.subjects : []
      )
      setMbeSubjects(
        Array.isArray(subjectsJson?.mbeSubjects) ? subjectsJson.mbeSubjects : []
      )

      if (selectedState) {
        setStateData({
          ...(stateDashboardJson ?? {}),
          ...(stateComparisonJson ?? {}),
        })
      } else {
        setStateData(null)
      }
    } catch (err) {
      console.error("LOAD DASHBOARD BUNDLE ERROR:", err)
    } finally {
      setCoreLoaded(true)
    }
  }

  useEffect(() => {
    if (!currentUserId) return

    void loadStudyPlanOnly(currentUserId)
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    void loadDashboardBundle(currentUserId, state)
  }, [currentUserId, state])

  useEffect(() => {
    async function loadTrendData() {
      if (!currentUserId) return

      try {
        let url = `/api/trend-analytics?userId=${currentUserId}&range=${analyticsRange}`

        if (analyticsRange === "custom") {
          if (!customFrom || !customTo) {
            setTrendData([])
            return
          }
          url = `/api/trend-analytics?userId=${currentUserId}&start=${customFrom}&end=${customTo}`
        }

        const res = await fetch(url, {
          cache: "no-store",
        })

        const data = await res.json().catch(() => null)
        setTrendData(Array.isArray(data?.trend) ? data.trend : [])
      } catch (err) {
        console.error("TREND DATA LOAD ERROR:", err)
        setTrendData([])
      }
    }

    loadTrendData()
  }, [currentUserId, analyticsRange, customFrom, customTo])

  useEffect(() => {
    if (analyticsRange === "custom") {
      setShowCustomRangePicker(true)
    } else {
      setShowCustomRangePicker(false)
    }
  }, [analyticsRange])

  function buildLevelAndProgress(attempts: number, accuracy: number) {
    let level = "Limited"
    let progressWidth = 0

    if (attempts <= 0) {
      return {
        level: "Limited",
        progressWidth: 0,
      }
    }

    const completionFactor = Math.min(attempts / 10, 1)

    if (attempts < 2) {
      level = "Limited"
      progressWidth = Math.max(6, Math.round(completionFactor * 18))
    } else if (accuracy < 55) {
      level = "Building"
      progressWidth = Math.max(10, Math.round((accuracy / 100) * 35))
    } else if (accuracy < 75) {
      level = "Progressing"
      progressWidth = Math.max(24, Math.round((accuracy / 100) * 65))
    } else {
      level = "Strong"
      progressWidth = Math.max(48, Math.round((accuracy / 100) * 100))
    }

    return { level, progressWidth }
  }

  const subjectRows: SubjectAnalyticsRow[] = BLL_SUBJECTS.map((name) => {
    const apiRow = bllSubjects.find((s: any) => s.name === name)
    const attempts = apiRow?.completed ?? 0
    const accuracy = apiRow?.accuracy ?? 0
    const derived = buildLevelAndProgress(attempts, accuracy)

    return {
      name,
      accuracy,
      completed: attempts,
      total: apiRow?.total ?? 0,
      level: derived.level,
      progressWidth: derived.progressWidth,
    }
  })

  const mbeRows: SubjectAnalyticsRow[] = MBE_SUBJECTS.map((name) => {
    const apiRow = mbeSubjects.find((s: any) => s.name === name)
    const attempts = apiRow?.completed ?? 0
    const accuracy = apiRow?.accuracy ?? 0
    const derived = buildLevelAndProgress(attempts, accuracy)

    return {
      name,
      accuracy,
      completed: attempts,
      total: apiRow?.total ?? 0,
      level: derived.level,
      progressWidth: derived.progressWidth,
    }
  })

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

    const activeDates = allDates.filter((d) => !offMap[formatDateInput(d)])
    if (activeDates.length === 0) return {}

    const base = Math.floor(totalRules / activeDates.length)
    let remainder = totalRules % activeDates.length

    const ruleMap: Record<string, number> = {}

    for (const d of activeDates) {
      const key = formatDateInput(d)
      ruleMap[key] = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
    }

    for (const d of allDates) {
      const key = formatDateInput(d)
      if (!(key in ruleMap)) {
        ruleMap[key] = 0
      }
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

  async function handleStateSelect(nextState: string) {
    if (!currentUserId) return

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          jurisdiction: nextState,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        console.error("STATE UPDATE ERROR:", data)
        alert(data?.error || data?.message || "Failed to save state.")
        return
      }

      setState(nextState)
      setOpen(false)
    } catch (err) {
      console.error("STATE UPDATE ERROR:", err)
      alert("Failed to save state.")
    }
  }

  async function openStudyPlanModal() {
    setOpenPlan(true)

    if (currentUserId) {
      await loadStudyPlanOnly(currentUserId)
    }

    if (!calendarMonth) {
      setCalendarMonth(new Date())
    }
  }

  function closeStudyPlanModal() {
    setOpenPlan(false)
    setResetConfirmOpen(false)
  }

  async function createPlan() {
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
        alert(data?.error || "Failed to create study plan.")
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
      setHasShownPlanThisSession(true)

      setDashboard((prev: any) => ({
        ...prev,
        goalBLL: safeDailyRules,
      }))
    } catch (err) {
      console.error("CREATE PLAN ERROR:", err)
      alert("Something went wrong while generating the plan.")
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

  async function savePlanAndClose() {
    if (!currentUserId || !startDate || !examDate || !planData) return

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
          offDates:
            planData?.offDates ??
            Object.keys(savedOffMap).filter((k) => savedOffMap[k]),
        }),
      })

      if (!res.ok) {
        alert("Failed to save study plan.")
        return
      }

      await loadStudyPlanOnly(currentUserId)
      closeStudyPlanModal()
    } catch (err) {
      console.error("SAVE STUDY PLAN ERROR:", err)
      alert("Failed to save study plan.")
    }
  }

  async function resetStudyPlan() {
    if (!currentUserId) return

    try {
      const res = await fetch(`/api/study-plan?userId=${currentUserId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        alert("Failed to reset study plan.")
        return
      }

      setPlanData(null)
      setCalendarDays([])
      setCalendarMonth(new Date())
      setStartDate("")
      setExamDate("")
      setStudyWeekends(true)
      setSavedOffMap({})
      setHasShownPlanThisSession(false)
      setResetConfirmOpen(false)
      closeStudyPlanModal()
      setStudyPlanLoaded(true)
    } catch (err) {
      console.error("RESET STUDY PLAN ERROR:", err)
      alert("Failed to reset study plan.")
    }
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

  const todaySpacedReviews = Number(dashboard?.spacedReviewsDue ?? 0)

  const shouldShowWelcomeBanner =
    authReady &&
    studyPlanLoaded &&
    coreLoaded &&
    !planData &&
    (dashboard?.todayBLL ?? 0) === 0 &&
    (dashboard?.todayMBE ?? 0) === 0

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

  const rankingPercent = useMemo(() => {
    const scoreValue = stateData?.userBLL ?? dashboard?.userBLL

    if (scoreValue === null || scoreValue === undefined) {
      return null
    }

    const score = Number(scoreValue)
    if (!Number.isFinite(score)) {
      return null
    }

    if (score <= 0) return 100

    return Math.min(100, Math.max(1, 100 - score))
  }, [stateData, dashboard])

  const rankingTier = useMemo(() => {
    if (rankingPercent === null) return "bronze"
    if (rankingPercent <= 30) return "gold"
    if (rankingPercent <= 60) return "silver"
    return "bronze"
  }, [rankingPercent])

  const chartRangeLabel = useMemo(() => {
    if (analyticsRange === "custom" && customFrom && customTo) {
      return `${customFrom} → ${customTo}`
    }
    return analyticsRange.toUpperCase()
  }, [analyticsRange, customFrom, customTo])

  const activeRows = useMemo(() => {
    if (analyticsMode === "MBE") {
      return mbeRows
    }
    return subjectRows
  }, [analyticsMode, mbeRows, subjectRows])

  const currentModeStateAverage =
    analyticsMode === "MBE"
      ? Number(stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0)
      : Number(stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0)

  const trendSeries = useMemo(() => {
    if (trendData.length > 0) {
      const usingMBE = analyticsMode === "MBE"

      return {
        labels: trendData.map((point) => shortDateLabel(point.date)),
        user: trendData.map((point) =>
          clampNumber(Number(usingMBE ? point.mbe : point.bll), 0, 100)
        ),
        avg: trendData.map(() =>
          clampNumber(Number(currentModeStateAverage), 0, 100)
        ),
      }
    }

    return {
      labels: [],
      user: [],
      avg: [],
    }
  }, [trendData, analyticsMode, currentModeStateAverage])

  const selectedSubjectBars = useMemo(() => {
    if (analyticsMode === "BLL") {
      return activeRows.slice(0, 7).map((row) => ({
        name: row.name,
        value: row.accuracy,
        avg: currentModeStateAverage,
      }))
    }

    return MBE_SUBJECTS.map((name) => {
      const row = mbeSubjects.find((s: any) => s.name === name)
      return {
        name,
        value: row?.accuracy ?? 0,
        avg: currentModeStateAverage,
      }
    })
  }, [analyticsMode, activeRows, mbeSubjects, currentModeStateAverage])

  const weeklyStudyTimeHours = Number(dashboard?.weeklyStudyTimeHours ?? 0)
  const weeklyRulesDone = Number(dashboard?.weeklyRulesDone ?? 0)
  const weeklySessions = Number(dashboard?.weeklySessions ?? 0)
  const weeklyWeakAreas = Number(dashboard?.weeklyWeakAreas ?? 0)

  const nationwideTitle =
    rankingPercent === null
      ? "Loading..."
      : `Top ${rankingPercent}% Nationwide`

  const canSavePlan =
    !!planData &&
    !!startDate &&
    !!examDate &&
    hasShownPlanThisSession

  if (!authReady || !coreLoaded) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-slate-500">
        Loading...
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        <style jsx>{`
          .nationwide-text-gold {
            background: linear-gradient(
              90deg,
              #b88409 0%,
              #f3cf65 35%,
              #fff1a8 50%,
              #d8ad2d 70%,
              #b88409 100%
            );
            background-size: 220% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: shimmer 11s linear infinite;
          }

          .nationwide-text-bronze {
            background: linear-gradient(
              90deg,
              #8d5a2b 0%,
              #c8894e 35%,
              #f0b77b 50%,
              #b56d35 70%,
              #8d5a2b 100%
            );
            background-size: 220% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: shimmer 13s linear infinite;
          }

          .nationwide-text-silver {
            background: linear-gradient(
              90deg,
              #6b7280 0%,
              #d1d5db 35%,
              #f8fafc 50%,
              #9ca3af 70%,
              #6b7280 100%
            );
            background-size: 220% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: shimmer 12s linear infinite;
          }

          .icon-shimmer-gold {
            background: linear-gradient(
              135deg,
              #fff4c7 0%,
              #f3cf65 30%,
              #fff9dc 50%,
              #d8ad2d 70%,
              #fff4c7 100%
            );
            background-size: 220% auto;
            animation: shimmer 12s linear infinite;
          }

          .icon-shimmer-bronze {
            background: linear-gradient(
              135deg,
              #f5d2b1 0%,
              #c8894e 30%,
              #ffe0c2 50%,
              #a9622d 70%,
              #f5d2b1 100%
            );
            background-size: 220% auto;
            animation: shimmer 14s linear infinite;
          }

          .icon-shimmer-silver {
            background: linear-gradient(
              135deg,
              #ffffff 0%,
              #d1d5db 30%,
              #f8fafc 50%,
              #9ca3af 70%,
              #ffffff 100%
            );
            background-size: 220% auto;
            animation: shimmer 12s linear infinite;
          }

          .premium-glow-text {
            background: linear-gradient(
              90deg,
              #7c3aed 0%,
              #c4b5fd 20%,
              #ede9fe 35%,
              #a78bfa 50%,
              #ede9fe 65%,
              #8b5cf6 80%,
              #7c3aed 100%
            );
            background-size: 260% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: premiumGlowSweep 5s linear infinite;
          }

          @keyframes shimmer {
            0% {
              background-position: 200% center;
            }
            100% {
              background-position: -200% center;
            }
          }

          @keyframes premiumGlowSweep {
            0% {
              background-position: 200% center;
            }
            100% {
              background-position: -200% center;
            }
          }
        `}</style>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_248px]">
          <div className="min-w-0">
            {shouldShowWelcomeBanner && (
              <div className="relative mb-3 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#2D3A8C_0%,#4A2D8C_50%,#6B2D8C_100%)] px-6 py-5 text-white shadow-[0_14px_40px_-22px_rgba(76,29,149,0.5)]">
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5" />
                <div className="absolute bottom-[-70px] right-16 h-40 w-40 rounded-full bg-white/5" />

                <div className="relative">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90">
                    <Sparkles size={11} />
                    Welcome to Lexora Prep
                  </div>

                  <h2 className="text-[28px] font-bold tracking-[-0.03em]">
                    Let&apos;s build your study plan
                  </h2>

                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/75">
                    Start by setting your study plan so Lexora can calculate your
                    daily targets, track progress, and build your adaptive
                    countdown workflow.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={openStudyPlanModal}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#2d3a8c] transition hover:translate-y-[-1px]"
                    >
                      Create Study Plan
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                title="MBE Questions"
                value={isPremium ? `${todayMbe}` : "—"}
                suffix={isPremium ? `/ ${goalMbe}` : ""}
                subtitle={isPremium ? "Today progress" : "Unlock MBE analytics"}
                accent="blue"
                progress={
                  isPremium
                    ? Number((todayMbe / Math.max(goalMbe, 1)) * 100)
                    : 0
                }
                locked={!isPremium}
                premiumTag={true}
                delta={isPremium ? mbeGoalDelta : null}
                deltaMode="goal"
                onClickLocked={() => router.push("/subscription")}
              />

              <MetricCard
                title="Rules (BLL)"
                value={`${todayBll}`}
                suffix={`/ ${goalBll}`}
                subtitle="Black letter law memorization"
                accent="violet"
                progress={Number((todayBll / Math.max(goalBll, 1)) * 100)}
                delta={bllGoalDelta}
                deltaMode="goal"
              />

              <MetricCard
                title="Overall MBE"
                value={
                  isPremium
                    ? `${stateData?.userMBE ?? dashboard?.userMBE ?? 0}%`
                    : "—"
                }
                subtitle={
                  isPremium ? "Your MBE accuracy" : "Unlock to see accuracy"
                }
                accent="blue"
                progress={
                  isPremium
                    ? stateData?.userMBE ?? dashboard?.userMBE ?? 0
                    : 0
                }
                locked={!isPremium}
                premiumTag={true}
                delta={isPremium ? mbeDiff : null}
                deltaMode="average"
                onClickLocked={() => router.push("/subscription")}
              />

              <MetricCard
                title="BLL Score"
                value={`${stateData?.userBLL ?? dashboard?.userBLL ?? 0}%`}
                subtitle={`State avg: ${stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}%`}
                accent="emerald"
                progress={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
                delta={bllDiff}
                deltaMode="average"
              />
            </div>

            <div className="mb-3 flex flex-col gap-2 rounded-[16px] border border-violet-400/20 bg-[linear-gradient(135deg,#1A2460_0%,#2A1A60_100%)] px-4 py-3 text-white sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <ClipboardList size={17} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">
                    Today&apos;s Smart Plan
                  </div>
                  <div className="text-[11px] text-white/65">
                    {todayBll} / {goalBll} rules today • {todaySpacedReviews} spaced reviews due
                  </div>
                </div>
              </div>

              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={openStudyPlanModal}
                  className="rounded-xl bg-[linear-gradient(135deg,#8495f0_0%,#ac83ef_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Study Plan
                </button>
                <button
                  onClick={() => router.push("/weak-areas")}
                  className="rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/12"
                >
                  Train Weak Areas →
                </button>
              </div>
            </div>

            <div className="mb-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="text-[13px] font-semibold">
                Performance Analytics
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAnalyticsMode("BLL")}
                    className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                      analyticsMode === "BLL"
                        ? "bg-white text-violet-700 shadow-[0_4px_14px_rgba(15,23,42,0.10)] ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    BLL
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isPremium) {
                        router.push("/subscription")
                        return
                      }
                      setAnalyticsMode("MBE")
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                      analyticsMode === "MBE" && isPremium
                        ? "bg-white text-blue-700 shadow-[0_4px_14px_rgba(15,23,42,0.10)] ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    MBE
                    {!isPremium && <Lock size={11} className="text-amber-500" />}
                  </button>
                </div>

                <div className="relative flex items-center gap-1" ref={customRangeRef}>
                  {(["7d", "14d", "30d", "custom"] as AnalyticsRange[]).map(
                    (range) => (
                      <button
                        key={range}
                        onClick={() => setAnalyticsRange(range)}
                        className={`rounded-full px-3.5 py-2 text-[12px] font-semibold uppercase transition ${
                          analyticsRange === range
                            ? "bg-white text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.10)] ring-1 ring-slate-200"
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {range}
                      </button>
                    )
                  )}

                  {showCustomRangePicker && (
                    <div className="absolute right-0 top-11 z-20 w-[250px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Custom Range
                      </div>

                      <div className="space-y-2">
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                        />

                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                        />
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowCustomRangePicker(false)}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {analyticsMode === "MBE" && !isPremium ? (
              <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                <LockedChartCard onClick={() => router.push("/subscription")} />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(160px,2fr)_94px_120px_90px] gap-2 border-b border-slate-200 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  <span>Subject</span>
                  <span>{analyticsMode === "BLL" ? "Rules" : "Questions"}</span>
                  <span>Progress</span>
                  <span>Level</span>
                </div>

                <div className="max-h-[240px] overflow-y-auto">
                  {activeRows.map((row) => (
                    <AnalyticsRowNoPercent
                      key={`${analyticsMode}-${row.name}`}
                      name={row.name}
                      completed={row.completed}
                      total={row.total}
                      progressWidth={row.progressWidth}
                      level={row.level}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
              <ChartCard
                icon={<LineChart size={14} />}
                title="Score trend"
                subtitle={`${
                  analyticsMode === "BLL"
                    ? "Black letter law accuracy over time"
                    : "MBE accuracy over time"
                } • ${chartRangeLabel}`}
                premium
              >
                {analyticsMode === "MBE" && !isPremium ? (
                  <LockedChartCard onClick={() => router.push("/subscription")} />
                ) : trendSeries.labels.length > 0 ? (
                  <SimpleLineChart
                    labels={trendSeries.labels}
                    seriesA={trendSeries.user}
                    seriesB={trendSeries.avg}
                  />
                ) : (
                  <EmptyChartMessage message="No trend data yet." />
                )}
              </ChartCard>

              <ChartCard
                icon={<BarChart3 size={14} />}
                title="Accuracy by subject"
                subtitle={
                  analyticsMode === "BLL"
                    ? "Your BLL performance by subject"
                    : isPremium
                      ? "Your MBE percentage vs state average"
                      : "Premium only. Unlock MBE analytics."
                }
              >
                {analyticsMode === "MBE" ? (
                  isPremium ? (
                    <SimpleBarChart rows={selectedSubjectBars} showAverage={true} />
                  ) : (
                    <LockedChartCard onClick={() => router.push("/subscription")} />
                  )
                ) : (
                  <SimpleBarChart rows={selectedSubjectBars} showAverage={true} />
                )}
              </ChartCard>
            </div>
          </div>

          <aside className="space-y-3">
            <div
              className={`rounded-[16px] border px-4 py-4 shadow-[0_12px_28px_-18px_rgba(180,140,30,0.35)] ${
                rankingTier === "gold"
                  ? "border-amber-300/30 bg-[linear-gradient(135deg,rgba(255,248,220,0.98),rgba(245,226,170,0.88))]"
                  : rankingTier === "silver"
                    ? "border-slate-300/50 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(226,232,240,0.92))]"
                    : "border-orange-300/30 bg-[linear-gradient(135deg,rgba(255,244,235,0.98),rgba(239,199,164,0.88))]"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${
                    rankingTier === "gold"
                      ? "icon-shimmer-gold text-amber-800"
                      : rankingTier === "silver"
                        ? "icon-shimmer-silver text-slate-700"
                        : "icon-shimmer-bronze text-orange-900"
                  }`}
                >
                  {rankingTier === "gold" ? (
                    <Crown size={17} strokeWidth={2.2} />
                  ) : rankingTier === "silver" ? (
                    <Gavel size={17} strokeWidth={2.2} />
                  ) : (
                    <Zap size={17} strokeWidth={2.4} />
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Nationwide
                  </div>
                </div>
              </div>

              <div
                className={`text-[18px] font-extrabold tracking-[-0.03em] ${
                  rankingTier === "gold"
                    ? "nationwide-text-gold"
                    : rankingTier === "silver"
                      ? "nationwide-text-silver"
                      : "nationwide-text-bronze"
                }`}
              >
                {nationwideTitle}
              </div>

              <div className="mt-1 text-[11px] text-slate-600">
                Based on BLL score and consistency
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  State Comparison
                </div>

                <button
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 transition hover:text-violet-700"
                  onClick={() => setOpen(true)}
                >
                  Change State
                  <ChevronDown size={12} />
                </button>
              </div>

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="mb-1 flex items-center gap-2 text-[16px] font-bold tracking-[-0.02em]">
                  <Globe size={15} />
                  {state || "Select State"}
                </div>

                <div className="mb-3 text-[11px] text-slate-500">
                  You vs {state || "state"} average
                </div>

                <div className="space-y-3">
                  <CompactCompareMetric
                    label="MBE Accuracy"
                    you={
                      isPremium
                        ? stateData?.userMBE ?? dashboard?.userMBE ?? 0
                        : null
                    }
                    avg={
                      isPremium
                        ? stateData?.stateMBEAvg ?? dashboard?.stateMBEAvg ?? 0
                        : null
                    }
                    top={isPremium ? stateData?.topMBE ?? 0 : null}
                    accent="blue"
                    locked={!isPremium}
                  />

                  <CompactCompareMetric
                    label="BLL Score"
                    you={stateData?.userBLL ?? dashboard?.userBLL ?? 0}
                    avg={stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0}
                    top={
                      stateData?.topBLL ??
                      Math.max(
                        stateData?.stateBLLAvg ?? 0,
                        stateData?.userBLL ?? 0
                      )
                    }
                    accent="violet"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Quick Start
              </div>

              <QuickStartCard
                title="MBE Practice"
                subtitle={isPremium ? "Go to MBE drills" : "Premium only"}
                onClick={() =>
                  isPremium
                    ? router.push("/mbe")
                    : router.push("/subscription")
                }
                locked={!isPremium}
              />
              <QuickStartCard
                title="Rule Training"
                subtitle="Continue BLL memorization"
                onClick={() => router.push("/rule-training")}
              />
              <QuickStartCard
                title="Weak Areas"
                subtitle="Train your weakest rules"
                onClick={() => router.push("/weak-areas")}
              />
              <QuickStartCard
                title="Flashcard Trainer"
                subtitle="Continue your review workflow"
                onClick={() => router.push("/flashcards")}
              />
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                This Week
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <WeekStat
                  value={`${weeklyStudyTimeHours.toFixed(1)}h`}
                  label="Study time"
                />
                <WeekStat value={`${weeklyRulesDone}`} label="Rules done" />
                <WeekStat value={`${weeklySessions}`} label="Sessions" />
                <WeekStat value={`${weeklyWeakAreas}`} label="Weak areas" />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[4px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Select Your Bar Exam State
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the state used for your comparison data.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <input
              placeholder="Search states..."
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {filteredStates.map((s) => (
                <button
                  key={s.code}
                  onClick={() => handleStateSelect(s.name)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs font-semibold text-violet-600">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[4px]"
          onClick={closeStudyPlanModal}
        >
          <div
            className="relative h-[88vh] w-[1120px] max-w-[96vw] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <h2 className="text-[17px] font-semibold leading-none">
                      Study Plan
                    </h2>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Build and manage your schedule.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeStudyPlanModal}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_300px]">
                <div className="min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => changeMonth("prev")}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      ‹
                    </button>

                    <div className="text-[16px] font-semibold">
                      {calendarMonth
                        ? formatMonthLabel(calendarMonth)
                        : formatMonthLabel(new Date())}
                    </div>

                    <button
                      onClick={() => changeMonth("next")}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mb-3 text-[13px] text-slate-500">
                    Click a study date to mark it off. Exam day is highlighted
                    in amber.
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {calendarDays.length === 0 ? (
                    <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                      Select your start date and exam date, then click Create
                      Plan.
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
                                d.isOff
                                  ? "border border-rose-300 bg-rose-50"
                                  : "",
                                !d.isPadding && !d.isOff && !d.isExamDay
                                  ? "border border-slate-200 bg-white hover:bg-slate-50"
                                  : "",
                                isToday && !d.isPadding
                                  ? "ring-2 ring-emerald-500"
                                  : "",
                                isFinished
                                  ? "border border-emerald-300 bg-emerald-50"
                                  : "",
                                isWeekend &&
                                !d.isPadding &&
                                !d.isOff &&
                                !d.isExamDay
                                  ? "bg-sky-50"
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
                                  <div className="text-[10px] font-semibold text-violet-600">
                                    {planData?.rulesByDate?.[
                                      formatDateInput(d.date)
                                    ] ??
                                      planData?.dailyRules ??
                                      0}{" "}
                                    rules
                                  </div>

                                  {isFinished && (
                                    <div className="mt-1 text-[10px] font-semibold text-emerald-600">
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
                                <div className="text-[10px] font-semibold text-rose-500">
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
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div>
                      <div className="text-[14px] font-semibold">
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-violet-400"
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-violet-400"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-[13px]">
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
                            <span className="font-semibold text-violet-600">
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
                              <PremiumBadge
                                onClick={() => router.push("/subscription")}
                              />
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
                              {planData?.totalDays ?? 0}
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

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="mb-2 text-[14px] font-semibold">
                      Daily Breakdown
                    </div>

                    <div className="space-y-2 text-[13px]">
                      <InfoRow
                        label="New Rules"
                        value={
                          <span className="font-semibold text-violet-600">
                            {todayRuleTarget}
                          </span>
                        }
                      />

                      <InfoRow
                        label="Review Rules"
                        value={
                          <span className="font-semibold">
                            {todayRuleTarget
                              ? Math.max(6, todayRuleTarget * 2)
                              : 0}
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
                            <PremiumBadge
                              onClick={() => router.push("/subscription")}
                            />
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={createPlan}
                      className="rounded-2xl bg-[linear-gradient(135deg,#6f84ea_0%,#9f7bea_100%)] px-3 py-2.5 text-[13px] font-semibold text-white shadow transition hover:opacity-95"
                    >
                      Create
                    </button>

                    <button
                      onClick={savePlanAndClose}
                      disabled={!canSavePlan}
                      className={`rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-white shadow transition ${
                        canSavePlan
                          ? "bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_100%)] hover:opacity-95"
                          : "cursor-not-allowed bg-slate-300 text-slate-100 shadow-none"
                      }`}
                    >
                      Save
                    </button>

                    <button
                      onClick={() => setResetConfirmOpen(true)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {resetConfirmOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px] p-4">
                <div className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <AlertTriangle size={18} />
                    </div>

                    <div>
                      <div className="text-[16px] font-semibold text-slate-900">
                        Reset study plan?
                      </div>
                      <div className="mt-1 text-[13px] leading-6 text-slate-500">
                        This will remove the current study plan. It will not
                        reset your profile information.
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      onClick={() => setResetConfirmOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={resetStudyPlan}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      Yes, reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
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

function PremiumBadge({ onClick }: { onClick?: () => void }) {
  const content = (
    <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      Premium
      <span>🔒</span>
    </span>
  )

  if (!onClick) return content

  return (
    <button type="button" onClick={onClick}>
      {content}
    </button>
  )
}

function MetricCard({
  title,
  value,
  suffix,
  subtitle,
  progress,
  accent,
  locked = false,
  premiumTag = false,
  delta,
  deltaMode,
  onClickLocked,
}: {
  title: string
  value: string
  suffix?: string
  subtitle: string
  progress: number
  accent: "blue" | "violet" | "emerald"
  locked?: boolean
  premiumTag?: boolean
  delta?: number | null
  deltaMode: "goal" | "average"
  onClickLocked?: () => void
}) {
  const palette =
    accent === "blue"
      ? { bar: "from-blue-500 to-sky-400" }
      : accent === "violet"
        ? { bar: "from-violet-500 to-fuchsia-400" }
        : { bar: "from-emerald-500 to-teal-400" }

  const deltaClass =
    typeof delta === "number"
      ? delta >= 0
        ? "text-emerald-600"
        : "text-rose-600"
      : "text-slate-400"

  const clickable = Boolean(onClickLocked && locked)

  return (
    <button
      type="button"
      onClick={clickable ? onClickLocked : undefined}
      className={`w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-3 text-left ${
        clickable
          ? "transition hover:border-amber-300 hover:bg-amber-50/20"
          : ""
      }`}
    >
      <div className="mb-2 flex min-h-[20px] items-start justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.11em] text-slate-400">
          {title}
        </span>

        {premiumTag && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-700">
            <Lock size={9} />
            Premium
          </span>
        )}
      </div>

      <div className="mb-2 flex min-h-[42px] items-end">
        <div
          className={`text-[21px] font-bold tracking-[-0.04em] ${
            locked ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {value}
          {suffix ? (
            <span className="ml-1 text-[12px] font-medium text-slate-400">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex min-h-[34px] items-start justify-between gap-3">
        <span className="max-w-[70%] text-[10px] leading-4 text-slate-500">
          {subtitle}
        </span>

        <span className={`text-right text-[10px] font-semibold ${deltaClass}`}>
          {typeof delta === "number"
            ? `${delta >= 0 ? "↗ +" : "↘ "}${delta.toFixed(0)}% ${
                deltaMode === "goal" ? "goal" : "avg"
              }`
            : ""}
        </span>
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-[5px] rounded-full bg-gradient-to-r ${palette.bar}`}
          style={{ width: `${locked ? 0 : Math.max(0, Math.min(progress, 100))}%` }}
        />
      </div>
    </button>
  )
}

function AnalyticsRowNoPercent({
  name,
  completed,
  total,
  progressWidth,
  level,
}: {
  name: string
  completed: number
  total: number
  progressWidth: number
  level: string
}) {
  const tone =
    level === "Strong"
      ? "strong"
      : level === "Progressing"
        ? "good"
        : level === "Building"
          ? "mid"
          : "weak"

  const toneClasses =
    tone === "strong"
      ? {
          dot: "bg-emerald-400",
          bar: "from-emerald-400 to-emerald-500",
          badge: "bg-emerald-50 text-emerald-700",
        }
      : tone === "good"
        ? {
            dot: "bg-blue-400",
            bar: "from-blue-400 to-blue-500",
            badge: "bg-blue-50 text-blue-700",
          }
        : tone === "mid"
          ? {
              dot: "bg-amber-400",
              bar: "from-amber-400 to-orange-500",
              badge: "bg-amber-50 text-amber-700",
            }
          : {
              dot: "bg-rose-400",
              bar: "from-rose-400 to-rose-500",
              badge: "bg-rose-50 text-rose-700",
            }

  return (
    <div className="grid grid-cols-[minmax(160px,2fr)_94px_120px_90px] items-center gap-2 border-b border-slate-200 px-4 py-2 transition hover:bg-slate-50">
      <div className="flex items-center gap-2.5 font-medium text-[12px]">
        <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} />
        <span>{name}</span>
      </div>

      <div className="text-[11px] text-slate-500">
        <span className="font-semibold text-violet-600">{completed}</span> /{" "}
        {total}
      </div>

      <div>
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-[5px] rounded-full bg-gradient-to-r ${toneClasses.bar}`}
            style={{
              width: `${Math.max(0, Math.min(progressWidth, 100))}%`,
            }}
          />
        </div>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${toneClasses.badge}`}
        >
          {level}
        </span>
      </div>
    </div>
  )
}

function ChartCard({
  icon,
  title,
  subtitle,
  children,
  premium = false,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  premium?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_-24px_rgba(15,23,42,0.25)]">
      {premium && (
        <>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl" />
        </>
      )}

      <div className="relative mb-1 flex items-center gap-2 text-[13px] font-semibold">
        <span className="text-violet-500">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="relative mb-3 text-[11px] text-slate-500">{subtitle}</div>
      <div className="relative">{children}</div>
    </div>
  )
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[190px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  )
}

function LockedChartCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/40 text-center transition hover:bg-amber-50"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Lock size={16} />
      </div>
      <div className="text-[13px] font-semibold text-slate-800">
        Premium required
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        Unlock MBE charts and comparison analytics
      </div>
    </button>
  )
}

function CompactCompareMetric({
  label,
  you,
  avg,
  top,
  accent,
  locked = false,
}: {
  label: string
  you: number | null
  avg: number | null
  top: number | null
  accent: "blue" | "violet"
  locked?: boolean
}) {
  const userBar =
    accent === "blue"
      ? "bg-[linear-gradient(90deg,#3b82f6,#2563eb)]"
      : "bg-[linear-gradient(90deg,#8b5cf6,#7c3aed)]"

  const avgBar =
    accent === "blue"
      ? "bg-[linear-gradient(90deg,#cbd5e1,#94a3b8)]"
      : "bg-[linear-gradient(90deg,#ddd6fe,#a78bfa)]"

  return (
    <div className="space-y-2 px-0 py-0">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-slate-700">{label}</span>

        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Lock size={10} />
            Premium
          </span>
        ) : (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-emerald-600">
              You: {you ?? 0}%
            </span>
            <span className="text-slate-500">Avg: {avg ?? 0}%</span>
            <span className="text-orange-500">Top: {top ?? 0}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-[6px] overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-[6px] rounded-full ${userBar}`}
            style={{
              width: `${locked ? 0 : Math.max(0, Math.min(you ?? 0, 100))}%`,
            }}
          />
        </div>

        {!locked && (
          <div className="h-[6px] overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-[6px] rounded-full ${avgBar}`}
              style={{ width: `${Math.max(0, Math.min(avg ?? 0, 100))}%` }}
            />
          </div>
        )}
      </div>

      <div className="text-[11px] leading-5 text-slate-500">
        {locked ? (
          <span className="premium-glow-text font-medium">
            Upgrade to Premium to unlock MBE state comparison
          </span>
        ) : (
          `Difference: ${
            (you ?? 0) - (avg ?? 0) >= 0 ? "+" : ""
          }${((you ?? 0) - (avg ?? 0)).toFixed(0)}% vs state avg`
        )}
      </div>
    </div>
  )
}

function SimpleLineChart({
  labels,
  seriesA,
  seriesB,
}: {
  labels: string[]
  seriesA: number[]
  seriesB: number[]
}) {
  const width = 720
  const height = 240
  const padLeft = 18
  const padRight = 18
  const padTop = 18
  const padBottom = 34

  const all = [...seriesA, ...seriesB]
  const minVal = Math.min(...all)
  const maxVal = Math.max(...all)
  const min = Math.max(0, Math.floor((minVal - 8) / 5) * 5)
  const max = Math.min(100, Math.ceil((maxVal + 8) / 5) * 5 || 100)
  const usableMax = max === min ? max + 1 : max

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom
  const xStep = chartW / Math.max(labels.length - 1, 1)

  function y(v: number) {
    return padTop + (1 - (v - min) / (usableMax - min)) * chartH
  }

  function x(i: number) {
    return padLeft + i * xStep
  }

  function buildSmoothPath(values: number[]) {
    if (values.length === 0) return ""

    if (values.length === 1) {
      return `M ${x(0)} ${y(values[0])}`
    }

    let d = `M ${x(0)} ${y(values[0])}`

    for (let i = 0; i < values.length - 1; i++) {
      const x0 = x(i)
      const y0 = y(values[i])
      const x1 = x(i + 1)
      const y1 = y(values[i + 1])
      const cx1 = x0 + (x1 - x0) / 2
      const cy1 = y0
      const cx2 = x0 + (x1 - x0) / 2
      const cy2 = y1
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x1} ${y1}`
    }

    return d
  }

  function buildAreaPath(values: number[]) {
    if (values.length === 0) return ""
    const line = buildSmoothPath(values)
    const endX = x(values.length - 1)
    const startX = x(0)
    const baseY = padTop + chartH
    return `${line} L ${endX} ${baseY} L ${startX} ${baseY} Z`
  }

  const pathA = buildSmoothPath(seriesA)
  const areaA = buildAreaPath(seriesA)

  const yTicks = 4
  const tickValues = Array.from({ length: yTicks }, (_, i) => {
    const ratio = i / (yTicks - 1)
    return Math.round(max - ratio * (max - min))
  })

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_35%_0%,rgba(139,92,246,0.10),transparent_22%)]" />

      <svg viewBox={`0 0 ${width} ${height}`} className="relative h-[240px] w-full">
        <defs>
          <linearGradient id="trendStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4F7BFF" />
            <stop offset="55%" stopColor="#5B8CFF" />
            <stop offset="100%" stopColor="#7C5CFF" />
          </linearGradient>

          <linearGradient id="trendFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,123,255,0.28)" />
            <stop offset="55%" stopColor="rgba(99,102,241,0.12)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
          </linearGradient>

          <filter id="trendGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="trendSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="blur2" />
            <feColorMatrix
              in="blur2"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.22 0"
            />
          </filter>
        </defs>

        {tickValues.map((v, i) => {
          const yy = padTop + (chartH / (yTicks - 1)) * i
          return (
            <line
              key={v}
              x1={padLeft}
              x2={width - padRight}
              y1={yy}
              y2={yy}
              stroke={i === yTicks - 1 ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.12)"}
              strokeWidth="1"
            />
          )
        })}

        {seriesB.length > 0 && (
          <path
            d={buildSmoothPath(seriesB)}
            fill="none"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <path d={areaA} fill="url(#trendFillGradient)" />

        <path
          d={pathA}
          fill="none"
          stroke="url(#trendStrokeGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trendGlow)"
        />

        <path
          d={pathA}
          fill="none"
          stroke="rgba(99,102,241,0.30)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trendSoftGlow)"
        />

        {seriesA.map((v, i) => {
          const cx = x(i)
          const cy = y(v)
          const isLast = i === seriesA.length - 1
          const shouldShow = isLast || i === Math.floor(seriesA.length / 2) || i === 0

          if (!shouldShow) return null

          return (
            <g key={`${v}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={isLast ? 13 : 9}
                fill="rgba(79,123,255,0.16)"
              />
              <circle
                cx={cx}
                cy={cy}
                r={isLast ? 8 : 6}
                fill="#4F7BFF"
                stroke="#ffffff"
                strokeWidth={isLast ? 4 : 3}
              />
              <title>{`You: ${v}%${seriesB[i] !== undefined ? ` | Avg: ${seriesB[i]}%` : ""}`}</title>
            </g>
          )
        })}

        {labels.map((label, i) => {
          const isLast = i === labels.length - 1
          return (
            <text
              key={label}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isLast ? 700 : 500}
              fill={isLast ? "#4F7BFF" : "#94a3b8"}
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function SimpleBarChart({
  rows,
  showAverage = true,
}: {
  rows: { name: string; value: number; avg: number | null }[]
  showAverage?: boolean
}) {
  const width = 640
  const height = 190
  const pad = 20
  const chartHeight = height - pad * 2
  const barWidth = showAverage ? 16 : 28
  const groupGap = showAverage ? 20 : 26
  const startX = 34

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full">
        {[0, 25, 50, 75, 100].map((v) => {
          const yy = height - pad - (v / 100) * chartHeight
          return (
            <g key={v}>
              <line
                x1={pad}
                x2={width - pad}
                y1={yy}
                y2={yy}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth="1"
              />
              <text x={6} y={yy + 3} fontSize="10" fill="#94a3b8">
                {v}
              </text>
            </g>
          )
        })}

        {rows.slice(0, 7).map((row, i) => {
          const x =
            startX + i * (showAverage ? barWidth * 2 + groupGap : barWidth + groupGap)
          const yourH = (row.value / 100) * chartHeight
          const avgH = row.avg !== null ? (row.avg / 100) * chartHeight : 0

          return (
            <g key={row.name}>
              <rect
                x={x}
                y={height - pad - yourH}
                width={barWidth}
                height={yourH}
                rx="3"
                fill="rgba(123,143,232,0.88)"
              >
                <title>{`${row.name} | You: ${row.value}%${
                  row.avg !== null ? ` | State avg: ${row.avg}%` : ""
                }`}</title>
              </rect>

              {showAverage && row.avg !== null && (
                <rect
                  x={x + barWidth + 5}
                  y={height - pad - avgH}
                  width={barWidth}
                  height={avgH}
                  rx="3"
                  fill="rgba(58,64,85,0.9)"
                >
                  <title>{`${row.name} | State avg: ${row.avg}%`}</title>
                </rect>
              )}

              <text
                x={showAverage ? x + barWidth + 2 : x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {shortSubject(row.name)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function QuickStartCard({
  title,
  subtitle,
  onClick,
  locked = false,
}: {
  title: string
  subtitle: string
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-between rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50"
    >
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span>{title}</span>
          {locked && <Lock size={12} className="text-amber-500" />}
        </div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>
      <div className="text-lg text-slate-400">›</div>
    </button>
  )
}

function WeekStat({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
      <div className="text-[16px] font-medium tracking-[-0.02em] text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-slate-400">
        {label}
      </div>
    </div>
  )
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function shortSubject(name: string) {
  if (name === "Civil Procedure") return "Civil"
  if (name === "Constitutional Law") return "Con"
  if (name === "Criminal Law and Procedure") return "Crim"
  if (name === "Real Property") return "Real"
  if (name === "Business Associations") return "BA"
  return name.split(" ")[0]
}

function shortDateLabel(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
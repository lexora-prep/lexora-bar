import { buildDraftCalendarPreviewForDashboard } from "./_components/dashboardDraftCalendarPreviewHelpers"\n"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ClipboardList,
  Globe,
  X,
  ChevronDown,
  CalendarDays,
  Sparkles,
  Flame,
  LineChart,
  BarChart3,
  Crown,
  Lock,
  Zap,
  AlertTriangle,
  Gavel,
  CalendarOff,
  CalendarClock,
  Layers,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import {
AnalyticsRowNoPercent,
  ChartCard,
  CompactCompareMetric,
  EmptyChartMessage,
  InfoRow,
  LockedChartCard,
  MetricCard,
  OverviewRow,
  PanelField,
  PremiumBadge,
  ProgressLine,
  QuickStartCard,
  SimpleBarChart,
  SimpleLineChart,
  StudyPanelSection,
  WeekStat,
  clampNumber,
  shortDateLabel,
} from "./_components/DashboardUi"
import {
  type RuleSet,
  type SubscriptionTier,
  type ExamRegime,
  type JurisdictionGroup,
  type JurisdictionOption,
  type SubjectPlanItem,
  type CalendarDay,
  type AnalyticsRange,
  type AnalyticsMode,
  type SubjectAnalyticsRow,
  type TrendPoint,
} from "./_components/dashboardTypes"
import { getEntitlements, normalizeRuleSet } from "./_components/dashboardHelpers"
import { buildLevelAndProgress } from "./_components/dashboardProgressHelpers"
import { getStudyPlanDayStatsForPlan } from "./_components/dashboardStudyPlanStatsHelpers"
import {
  deleteStudyPlan,
  postStudyPlan,
} from "./_components/dashboardStudyPlanApiHelpers"
import { buildStudyPlanRequestBodyForDashboard } from "./_components/dashboardStudyPlanPayloadHelpers"
import { buildStudyPlanDateMaps } from "./_components/dashboardStudyPlanDateMapHelpers"
import {
  getSubjectAnalyticsForJurisdiction,
  getSubjectProgressPercentForJurisdiction,
  shouldUseGlobalSubjectProgressForJurisdiction,
} from "./_components/dashboardSubjectAnalyticsHelpers"
import {
  getEffectivePackageRuleTotal,
  getPlanTotalRules,
  getPositiveNumber,
  getRecommendedRuleSet,
  getSafeDailyRules,
  getSubjectRuleTotal,
  isHeavierPackage,
} from "./_components/dashboardCalculations"
import {
  buildCalendarDays,
  buildDistributedRuleMap,
  formatDateInput,
  formatMonthLabel,
  formatShortDate,
  getDaysUntilExamForDate,
  getPlanDateRange,
  getRemainingStudyDays,
  isDateOff,
  isSameDay,
  isWeekendDate,
  normalizeDateString,
  normalizeLocalDate,
} from "./_components/dashboardCalendarHelpers"
import {
  getEffectiveExamRegime,
  getJurisdictionDisplayName,
  getJurisdictionSubjects,
  getRegimeLabel,
  getSelectedJurisdictionOption,
  normalizeJurisdictionCode,
} from "./_components/dashboardJurisdictionHelpers"
import {
  CALIFORNIA_SUBJECTS,
  COMPARISON_STATE_STORAGE_KEY,
  FLORIDA_CURRENT_SUBJECTS,
  JURISDICTION_OPTIONS,
  LOCAL_COMPONENT_SUBJECTS,
  MBE_SUBJECTS,
  NEXTGEN_SUBJECTS,
  RULE_PACKAGE_META,
  STATE_SPECIFIC_SUBJECTS,
  STATES,
  UBE_CURRENT_SUBJECTS,
} from "./_components/dashboardConstants"
export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

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
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free")
  const [entitlements, setEntitlements] = useState(() => getEntitlements(null))
  const [authReady, setAuthReady] = useState(false)

  const [coreLoaded, setCoreLoaded] = useState(false)
  const [studyPlanLoaded, setStudyPlanLoaded] = useState(false)

  const [openPlan, setOpenPlan] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [studyPlanSaveStatus, setStudyPlanSaveStatus] =
    useState<"idle" | "saving" | "saved">("idle")
  const [startDate, setStartDate] = useState("")
  const [examDate, setExamDate] = useState("")
  const [studyWeekends, setStudyWeekends] = useState(true)
  const [ruleSet, setRuleSet] = useState<RuleSet>("core")
  const [selectedStudyJurisdiction, setSelectedStudyJurisdiction] =
    useState("UBE")
  const [planData, setPlanData] = useState<any>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null)
  const [savedOffMap, setSavedOffMap] = useState<Record<string, boolean>>({})
  const [savedOnMap, setSavedOnMap] = useState<Record<string, boolean>>({})
  const [hasShownPlanThisSession, setHasShownPlanThisSession] =
    useState(false)
  const [hasUnsavedPlanChanges, setHasUnsavedPlanChanges] = useState(false)
  const [userManuallySelectedRulePackage, setUserManuallySelectedRulePackage] =
    useState(false)

  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("14d")
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>("BLL")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false)
  const customRangeRef = useRef<HTMLDivElement | null>(null)

  const todayKey = formatDateInput(normalizeLocalDate(new Date()))

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
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (cancelled) return

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setAuthReady(true)
          setCoreLoaded(true)
          setStudyPlanLoaded(true)
          return
        }

        if (!user) {
          setAuthReady(true)
          setCoreLoaded(true)
          setStudyPlanLoaded(true)
          router.push("/login")
          return
        }

        setCurrentUserId(user.id)
        setAuthReady(true)
      } catch (err) {
        if (cancelled) return
        console.error("LOAD CURRENT USER ERROR:", err)
        setAuthReady(true)
        setCoreLoaded(true)
        setStudyPlanLoaded(true)
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const dashboardBatchQuery = useQuery({
    queryKey: ["dashboard-batch", currentUserId, state],
    queryFn: async () => {
      const query = state ? `?state=${encodeURIComponent(state)}` : ""
      const res = await fetch(`/api/dashboard/batch${query}`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data) {
        throw new Error(
          data?.message || data?.error || "Failed to load dashboard batch."
        )
      }

      return data
    },
    enabled: authReady && !!currentUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
  })

  useEffect(() => {
    const summary = dashboardBatchQuery.data

    if (!summary) return

    try {
      const profile = summary?.profile ?? null
      const studyPlan = summary?.studyPlan ?? null
      const summaryRuleTotal = getSubjectRuleTotal(summary?.subjects)

      if (profile?.full_name) {
        setUserName(profile.full_name)
      } else if (profile?.email) {
        setUserName(profile.email)
      } else {
        setUserName("User")
      }

      const nextEntitlements = getEntitlements(profile)
      setSubscriptionTier(nextEntitlements.tier)
      setEntitlements(nextEntitlements)

      const savedComparisonState =
        typeof window !== "undefined"
          ? window.localStorage.getItem(COMPARISON_STATE_STORAGE_KEY)
          : null

      const selectedDashboardState =
        savedComparisonState && String(savedComparisonState).trim()
          ? String(savedComparisonState).trim()
          : summary?.comparisonState && String(summary.comparisonState).trim()
            ? String(summary.comparisonState).trim()
            : summary?.dashboard?.selectedState &&
                String(summary.dashboard.selectedState).trim()
              ? String(summary.dashboard.selectedState).trim()
              : ""

      if (selectedDashboardState) {
        setState((prev) => {
          const current = String(prev || "").trim()
          if (current === selectedDashboardState) return prev
          return selectedDashboardState
        })
      }

      setDashboard(summary?.dashboard ?? null)
      setBllSubjects(Array.isArray(summary?.subjects) ? summary.subjects : [])
      setMbeSubjects(
        Array.isArray(summary?.mbeSubjects) ? summary.mbeSubjects : []
      )

      if (selectedDashboardState) {
        setStateData(
          summary?.stateData ?? {
            userMBE: summary?.dashboard?.userMBE ?? 0,
            userBLL: summary?.dashboard?.userBLL ?? 0,
            stateMBEAvg: summary?.dashboard?.stateMBEAvg ?? 0,
            stateBLLAvg: summary?.dashboard?.stateBLLAvg ?? 0,
            topMBE: summary?.dashboard?.topMBE ?? 0,
            topBLL: summary?.dashboard?.topBLL ?? 0,
          }
        )
      } else {
        setStateData(null)
      }

      if (!studyPlan || !studyPlan.startDate || !studyPlan.examDate) {
        const hasLocalStudyPlanDraft =
          openPlan &&
          (hasUnsavedPlanChanges ||
            Boolean(startDate) ||
            Boolean(examDate) ||
            calendarDays.length > 0)

        if (!hasLocalStudyPlanDraft) {
          const profileJurisdiction = normalizeJurisdictionCode(
            profile?.jurisdiction ?? "UBE"
          )

          setSelectedStudyJurisdiction(profileJurisdiction)
          setPlanData(null)
          setCalendarDays([])
          setCalendarMonth(null)
          setSavedOffMap({})
          setSavedOnMap({})
          setStartDate("")
          setExamDate("")
          setStudyWeekends(true)
          setRuleSet("core")
          setHasShownPlanThisSession(false)
          setHasUnsavedPlanChanges(false)
          setUserManuallySelectedRulePackage(false)
        }
      } else {
        if (!(openPlan && hasUnsavedPlanChanges)) {
          hydrateStudyPlanFromPayload(studyPlan, summaryRuleTotal)
        }
      }

      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    } catch (err) {
      console.error("APPLY DASHBOARD BATCH ERROR:", err)
      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    }
  }, [
    dashboardBatchQuery.data,
    openPlan,
    hasUnsavedPlanChanges,
    startDate,
    examDate,
    calendarDays.length,
  ])

  useEffect(() => {
    if (dashboardBatchQuery.isError) {
      console.error("DASHBOARD BATCH QUERY ERROR:", dashboardBatchQuery.error)
      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    }
  }, [dashboardBatchQuery.isError, dashboardBatchQuery.error])

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

        const res = await fetch(url, { cache: "no-store" })
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
    setShowCustomRangePicker(analyticsRange === "custom")
  }, [analyticsRange])

  useEffect(() => {
    if (!entitlements.canSeeMBEComingSoon && analyticsMode === "MBE") {
      setAnalyticsMode("BLL")
    }
  }, [analyticsMode, entitlements.canSeeMBEComingSoon])

  function hydrateStudyPlanFromPayload(studyPlan: any, fallbackTotalRules?: number) {
    const start = normalizeDateString(studyPlan.startDate)
    const exam = normalizeDateString(studyPlan.examDate)
    const nextStudyWeekends = studyPlan.studyWeekends ?? true
    const savedJurisdiction = normalizeJurisdictionCode(
      studyPlan.jurisdictionCode ??
        studyPlan.jurisdiction_code ??
        studyPlan.jurisdiction ??
        "UBE"
    )
    const recommended = getRecommendedRuleSet(getDaysUntilExamForDate(exam), isPremium)
    const nextRuleSet = normalizeRuleSet(studyPlan.ruleSet ?? recommended)
    const manualPackage = Boolean(studyPlan?.userManuallySelectedRulePackage)

    setSelectedStudyJurisdiction(savedJurisdiction)
    setStartDate(start)
    setExamDate(exam)
    setStudyWeekends(nextStudyWeekends)
    setRuleSet(nextRuleSet)
    setUserManuallySelectedRulePackage(manualPackage)

    const { offMap, onMap } = buildStudyPlanDateMaps(
      studyPlan?.offDates,
      studyPlan?.onDates,
      normalizeDateString
    )

    setSavedOffMap(offMap)
    setSavedOnMap(onMap)

    const baseTotalRules = getPlanTotalRules(studyPlan, fallbackTotalRules)
    const totalRules = getEffectivePackageRuleTotal(baseTotalRules, nextRuleSet)
    const activeStudyDays = getRemainingStudyDays(
      start,
      exam,
      offMap,
      onMap,
      nextStudyWeekends
    )

    const safeDailyRules = getSafeDailyRules(
      totalRules,
      activeStudyDays,
      studyPlan?.dailyRules
    )

    const distributedRules = buildDistributedRuleMap(
      start,
      exam,
      totalRules,
      offMap,
      onMap,
      nextStudyWeekends,
      todayKey,
      studyPlan?.rulesByDate ?? planData?.rulesByDate ?? {}
    )

    setPlanData({
      ...studyPlan,
      jurisdictionCode: savedJurisdiction,
      jurisdictionName: getJurisdictionDisplayName(savedJurisdiction),
      examRegime: getEffectiveExamRegime(savedJurisdiction, exam),
      ruleSet: nextRuleSet,
      baseTotalRules,
      totalRules,
      totalDays: activeStudyDays || studyPlan.totalDays || 0,
      dailyRules: safeDailyRules,
      rulesByDate: distributedRules,
      userManuallySelectedRulePackage: manualPackage,
    })

    setHasShownPlanThisSession(true)
    setHasUnsavedPlanChanges(false)

    if (start && exam) {
      const preservedMonth = calendarMonth ?? new Date(`${start}T00:00:00`)
      const viewMonth = new Date(
        preservedMonth.getFullYear(),
        preservedMonth.getMonth(),
        1
      )

      setCalendarMonth(viewMonth)
      setCalendarDays(
        buildCalendarDays(
          start,
          exam,
          viewMonth,
          offMap,
          onMap,
          nextStudyWeekends
        )
      )
    } else {
      setCalendarDays([])
      setCalendarMonth(new Date())
    }
  }

  async function loadStudyPlanOnly(userId: string) {
    try {
      setStudyPlanLoaded(false)

      const res = await fetch(`/api/study-plan?userId=${userId}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!data || !data.startDate || !data.examDate) {
        if (openPlan && (hasUnsavedPlanChanges || startDate || examDate)) {
          return
        }

        setPlanData(null)
        setCalendarDays([])
        setCalendarMonth(null)
        setSavedOffMap({})
        setSavedOnMap({})
        setStartDate("")
        setExamDate("")
        setStudyWeekends(true)
        setRuleSet("core")
        setHasShownPlanThisSession(false)
        setHasUnsavedPlanChanges(false)
        setUserManuallySelectedRulePackage(false)
        return
      }

      hydrateStudyPlanFromPayload(
        data,
        planData?.baseTotalRules ?? planData?.totalRules
      )
    } catch (err) {
      console.error("LOAD STUDY PLAN ERROR:", err)

      if (!(openPlan && (hasUnsavedPlanChanges || startDate || examDate))) {
        setPlanData(null)
        setCalendarDays([])
        setCalendarMonth(null)
        setSavedOffMap({})
        setSavedOnMap({})
      }
    } finally {
      setStudyPlanLoaded(true)
    }
  }

  const subjectRows: SubjectAnalyticsRow[] = bllSubjects
    .filter((row: any) => Number(row?.total ?? 0) > 0)
    .map((row: any) => {
      const attempts = Number(row?.completed ?? 0)
      const accuracy = Number(row?.accuracy ?? 0)
      const total = Number(row?.total ?? 0)
      const derived = buildLevelAndProgress(attempts, accuracy)

      return {
        name: String(row?.name ?? "Unknown"),
        accuracy,
        completed: attempts,
        total,
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

  function shouldUseGlobalSubjectProgressForCurrentJurisdiction() {
    return shouldUseGlobalSubjectProgressForJurisdiction({
      selectedStudyJurisdiction,
      examDate,
    })
  }

  function getSubjectProgressPercent(subjectName: string) {
    return getSubjectProgressPercentForJurisdiction({
      subjectName,
      subjectRows,
      selectedStudyJurisdiction,
      examDate,
    })
  }

  function getSubjectAnalyticsForCurrentJurisdiction() {
    return getSubjectAnalyticsForJurisdiction({
      subjectRows,
      selectedStudyJurisdiction,
      examDate,
    })
  }

  function getStudyPlanDayStats() {
    return getStudyPlanDayStatsForPlan({
      startDate,
      examDate,
      savedOffMap,
      savedOnMap,
      studyWeekends,
    })
  }

  function getDaysUntilExam() {
    return getDaysUntilExamForDate(examDate)
  }

  function buildDraftCalendarPreview({
    nextStartDate,
    nextExamDate,
    nextOffMap,
    nextOnMap,
    nextStudyWeekends,
  }: {
    nextStartDate: string
    nextExamDate: string
    nextOffMap: Record<string, boolean>
    nextOnMap: Record<string, boolean>
    nextStudyWeekends: boolean
  }) {
    const preview = buildDraftCalendarPreviewForDashboard({
      nextStartDate,
      nextExamDate,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends,
      calendarMonth,
    })

    if (!preview) return

    setCalendarMonth(preview.viewMonth)
    setCalendarDays(preview.calendarDays)
  }

  function applyStudyPlanOptimistically({
    nextOffMap,
    nextOnMap,
    nextStudyWeekends,
    nextRuleSet = ruleSet,
    preserveBeforeDate = startDate,
    markManualPackage = true,
    nextStartDate = startDate,
    nextExamDate = examDate,
  }: {
    nextOffMap: Record<string, boolean>
    nextOnMap: Record<string, boolean>
    nextStudyWeekends: boolean
    nextRuleSet?: RuleSet
    preserveBeforeDate?: string
    markManualPackage?: boolean
    nextStartDate?: string
    nextExamDate?: string
  }) {
    if (!nextStartDate || !nextExamDate) return

    const baseTotalRules = getPlanTotalRules(
      { baseTotalRules: planData?.baseTotalRules },
      getSubjectRuleTotal(bllSubjects) || planData?.totalRules
    )

    const totalRules = getEffectivePackageRuleTotal(baseTotalRules, nextRuleSet)

    const nextTotalDays = getRemainingStudyDays(
      nextStartDate,
      nextExamDate,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    )

    const nextDailyRules = getSafeDailyRules(totalRules, nextTotalDays)

    const nextRulesByDate = buildDistributedRuleMap(
      nextStartDate,
      nextExamDate,
      totalRules,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends,
      preserveBeforeDate,
      planData?.rulesByDate ?? {}
    )

    const nextCalendarDays = buildCalendarDays(
      nextStartDate,
      nextExamDate,
      calendarMonth ?? new Date(`${nextStartDate}T00:00:00`),
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    )

    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])
    const nextOnDates = Object.keys(nextOnMap).filter((k) => nextOnMap[k])
    const nextManualPackage =
      markManualPackage || userManuallySelectedRulePackage

    setSavedOffMap(nextOffMap)
    setSavedOnMap(nextOnMap)
    setStudyWeekends(nextStudyWeekends)
    setRuleSet(nextRuleSet)
    setCalendarDays(nextCalendarDays)

    setPlanData((prev: any) => ({
      ...(prev ?? {}),
      startDate: nextStartDate,
      examDate: nextExamDate,
      baseTotalRules,
      totalRules,
      dailyRules: nextDailyRules,
      totalDays: nextTotalDays,
      studyWeekends: nextStudyWeekends,
      ruleSet: nextRuleSet,
      offDates: nextOffDates,
      onDates: nextOnDates,
      jurisdictionCode: selectedStudyJurisdiction,
      jurisdictionName: getJurisdictionDisplayName(selectedStudyJurisdiction),
      examRegime: getEffectiveExamRegime(selectedStudyJurisdiction, nextExamDate),
      rulesByDate: nextRulesByDate,
      userManuallySelectedRulePackage: nextManualPackage,
    }))

    setDashboard((prev: any) => ({
      ...(prev ?? {}),
      goalBLL:
        nextRulesByDate[todayKey] && nextRulesByDate[todayKey] > 0
          ? nextRulesByDate[todayKey]
          : nextDailyRules,
    }))
  }

  async function refreshDashboardAndPlan() {
    if (!currentUserId) return

    await queryClient.invalidateQueries({
      queryKey: ["dashboard-batch", currentUserId],
    })

    await dashboardBatchQuery.refetch()
  }

  async function handleStateSelect(nextState: string) {
    const cleanState = String(nextState || "").trim()

    if (!cleanState) return

    const queryKey = ["dashboard-batch", currentUserId, cleanState]

    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMPARISON_STATE_STORAGE_KEY, cleanState)
    }

    setState(cleanState)
    setOpen(false)
    setSearch("")

    setDashboard((prev: any) => ({
      ...(prev ?? {}),
      selectedState: cleanState,
    }))

    setStateData((prev: any) =>
      prev ?? {
        userMBE: dashboard?.userMBE ?? 0,
        userBLL: dashboard?.userBLL ?? 0,
        stateMBEAvg: dashboard?.stateMBEAvg ?? 0,
        stateBLLAvg: dashboard?.stateBLLAvg ?? 0,
        topMBE: dashboard?.topMBE ?? 0,
        topBLL: dashboard?.topBLL ?? 0,
      }
    )

    if (currentUserId) {
      await queryClient.invalidateQueries({ queryKey })
    }
  }

  function handleStudyJurisdictionChange(nextCode: string) {
    const normalized = normalizeJurisdictionCode(nextCode)

    if (normalized === selectedStudyJurisdiction) return

    if (planData && startDate && examDate) {
      const confirmed = window.confirm(
        "Changing your study jurisdiction will update the exam system and tested subjects for this study plan. Your state comparison will not change. Continue?"
      )

      if (!confirmed) return
    }

    const nextRegime = getEffectiveExamRegime(normalized, examDate)

    setSelectedStudyJurisdiction(normalized)
    setHasUnsavedPlanChanges(true)

    setPlanData((prev: any) => {
      if (!prev) return prev

      return {
        ...prev,
        jurisdictionCode: normalized,
        jurisdictionName: getJurisdictionDisplayName(normalized),
        examRegime: nextRegime,
      }
    })
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

      const start = new Date(`${startDate}T00:00:00`)
      const end = new Date(`${examDate}T00:00:00`)

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
      const existingOnDates = Object.keys(savedOnMap).filter(
        (d) => savedOnMap[d]
      )

      const selectedRuleSet = ruleSet || getRecommendedRuleSet(getDaysUntilExam(), isPremium)

      const result = await postStudyPlan(
        buildStudyPlanRequestBodyForDashboard({
          currentUserId,
          startDate,
          examDate,
          selectedStudyJurisdiction,
          nextOffDates: existingOffDates,
          nextOnDates: existingOnDates,
          nextStudyWeekends: studyWeekends,
          nextRuleSet: selectedRuleSet,
          customRulesEnabled: Boolean(planData?.customRulesEnabled ?? false),
          studyRound: Number(planData?.studyRound ?? 1),
          manualPackage: userManuallySelectedRulePackage,
        })
      )

      const data = result.data

      if (!result.ok) {
        alert(result.error || "Failed to create study plan.")
        return
      }

      const persistedJurisdiction = normalizeJurisdictionCode(
        data?.jurisdictionCode ?? selectedStudyJurisdiction
      )

      setSelectedStudyJurisdiction(persistedJurisdiction)

      const viewMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      const baseTotalRules = getPlanTotalRules(
        data,
        planData?.baseTotalRules ?? getSubjectRuleTotal(bllSubjects)
      )
      const totalRules = getEffectivePackageRuleTotal(baseTotalRules, selectedRuleSet)

      const { offMap, onMap } = buildStudyPlanDateMaps(
        data?.offDates,
        data?.onDates,
        normalizeDateString
      )

      const nextStudyWeekends = data.studyWeekends ?? studyWeekends
      const safeTotalDays = getRemainingStudyDays(
        startDate,
        examDate,
        offMap,
        onMap,
        nextStudyWeekends
      )
      const safeDailyRules = getSafeDailyRules(totalRules, safeTotalDays)

      const distributedRules = buildDistributedRuleMap(
        startDate,
        examDate,
        totalRules,
        offMap,
        onMap,
        nextStudyWeekends,
        startDate,
        {}
      )

      const nextPlanData = {
        ...data,
        jurisdictionCode: persistedJurisdiction,
        jurisdictionName: getJurisdictionDisplayName(persistedJurisdiction),
        examRegime: getEffectiveExamRegime(persistedJurisdiction, examDate),
        ruleSet: selectedRuleSet,
        baseTotalRules,
        totalRules,
        totalDays: safeTotalDays,
        dailyRules: safeDailyRules,
        rulesByDate: distributedRules,
        userManuallySelectedRulePackage,
      }

      const days = buildCalendarDays(
        startDate,
        examDate,
        viewMonth,
        offMap,
        onMap,
        nextStudyWeekends
      )

      setRuleSet(selectedRuleSet)
      setSavedOffMap(offMap)
      setSavedOnMap(onMap)
      setPlanData(nextPlanData)
      setCalendarMonth(viewMonth)
      setCalendarDays(days)
      setHasShownPlanThisSession(true)
      setHasUnsavedPlanChanges(false)

      setDashboard((prev: any) => ({
        ...prev,
        goalBLL:
          distributedRules[todayKey] && distributedRules[todayKey] > 0
            ? distributedRules[todayKey]
            : safeDailyRules,
      }))

      await loadStudyPlanOnly(currentUserId)
      await refreshDashboardAndPlan()
    } catch (err) {
      console.error("CREATE PLAN ERROR:", err)
      alert("Something went wrong while generating the plan.")
    }
  }

  function toggleCalendarDay(day: CalendarDay) {
    if (day.isPadding || day.isExamDay) return

    const key = formatDateInput(day.date)
    const nextOffMap = { ...savedOffMap }
    const nextOnMap = { ...savedOnMap }

    const currentlyOff = isDateOff(
      day.date,
      savedOffMap,
      savedOnMap,
      studyWeekends
    )

    if (currentlyOff) {
      delete nextOffMap[key]
      nextOnMap[key] = true
    } else {
      nextOffMap[key] = true
      delete nextOnMap[key]
    }

    setHasUnsavedPlanChanges(true)

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends: studyWeekends,
      nextRuleSet: ruleSet,
      preserveBeforeDate: key,
      markManualPackage: false,
    })
  }

  function handleStudyWeekendChange(nextStudyWeekends: boolean) {
    const nextOffMap = { ...savedOffMap }
    const nextOnMap = { ...savedOnMap }

    setStudyWeekends(nextStudyWeekends)
    setHasUnsavedPlanChanges(true)

    if (!startDate || !examDate) {
      return
    }

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends,
      nextRuleSet: ruleSet,
      preserveBeforeDate: todayKey,
      markManualPackage: false,
    })
  }

  function handleRuleSetChange(nextRuleSet: RuleSet) {
    const recommended = getRecommendedRuleSet(getDaysUntilExam(), isPremium)

    if (!isPremium && nextRuleSet === "full") {
      alert("Full Rule Bank is available only for Premium users.")
      return
    }

    if (isHeavierPackage(nextRuleSet, recommended)) {
      const confirmed = window.confirm(
        `Lexora recommends ${RULE_PACKAGE_META[recommended].label} because your exam is close. Choosing ${RULE_PACKAGE_META[nextRuleSet].label} may overload your daily workload. Continue?`
      )

      if (!confirmed) return
    }

    setRuleSet(nextRuleSet)
    setHasUnsavedPlanChanges(true)
    setUserManuallySelectedRulePackage(true)

    if (!startDate || !examDate) {
      return
    }

    const nextOffMap = { ...savedOffMap }
    const nextOnMap = { ...savedOnMap }

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends: studyWeekends,
      nextRuleSet,
      preserveBeforeDate: todayKey,
      markManualPackage: true,
    })
  }

  function handleStartDateChange(nextStartDate: string) {
    setStartDate(nextStartDate)
    setHasUnsavedPlanChanges(true)

    if (!nextStartDate || !examDate) return

    const start = new Date(`${nextStartDate}T00:00:00`)
    const end = new Date(`${examDate}T00:00:00`)

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setCalendarDays([])
      return
    }

    if (planData || getSubjectRuleTotal(bllSubjects) > 0) {
      applyStudyPlanOptimistically({
        nextOffMap: savedOffMap,
        nextOnMap: savedOnMap,
        nextStudyWeekends: studyWeekends,
        nextRuleSet: ruleSet,
        preserveBeforeDate: nextStartDate,
        markManualPackage: userManuallySelectedRulePackage,
        nextStartDate,
        nextExamDate: examDate,
      })
      return
    }

    buildDraftCalendarPreview({
      nextStartDate,
      nextExamDate: examDate,
      nextOffMap: savedOffMap,
      nextOnMap: savedOnMap,
      nextStudyWeekends: studyWeekends,
    })
  }

  function handleExamDateChange(nextExamDate: string) {
    setExamDate(nextExamDate)
    setHasUnsavedPlanChanges(true)

    const recommended = getRecommendedRuleSet(getDaysUntilExamForDate(nextExamDate), isPremium)
    const nextRuleSet = userManuallySelectedRulePackage ? ruleSet : recommended

    if (!userManuallySelectedRulePackage) {
      setRuleSet(recommended)
    }

    if (!startDate || !nextExamDate) return

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${nextExamDate}T00:00:00`)

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setCalendarDays([])
      return
    }

    if (planData || getSubjectRuleTotal(bllSubjects) > 0) {
      applyStudyPlanOptimistically({
        nextOffMap: savedOffMap,
        nextOnMap: savedOnMap,
        nextStudyWeekends: studyWeekends,
        nextRuleSet,
        preserveBeforeDate: startDate,
        markManualPackage: userManuallySelectedRulePackage,
        nextStartDate: startDate,
        nextExamDate,
      })
      return
    }

    buildDraftCalendarPreview({
      nextStartDate: startDate,
      nextExamDate,
      nextOffMap: savedOffMap,
      nextOnMap: savedOnMap,
      nextStudyWeekends: studyWeekends,
    })
  }

  function showDashboardToast(kind: "success" | "error", title: string, body?: string) {
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

  async function savePlanAndKeepOpen() {
    if (!currentUserId || !startDate || !examDate || !planData) return

    try {
      setStudyPlanSaveStatus("saving")

      const nextOffDates =
        planData?.offDates ??
        Object.keys(savedOffMap).filter((k) => savedOffMap[k])

      const nextOnDates =
        planData?.onDates ??
        Object.keys(savedOnMap).filter((k) => savedOnMap[k])

      const normalizedJurisdiction = normalizeJurisdictionCode(selectedStudyJurisdiction)
      const nextExamRegime = getEffectiveExamRegime(normalizedJurisdiction, examDate)

      const requestBody = {
        ...buildStudyPlanRequestBodyForDashboard({
          currentUserId,
          startDate,
          examDate,
          selectedStudyJurisdiction,
          nextOffDates,
          nextOnDates,
          nextStudyWeekends: studyWeekends,
          nextRuleSet: ruleSet,
          customRulesEnabled: Boolean(planData?.customRulesEnabled ?? false),
          studyRound: Number(planData?.studyRound ?? 1),
          manualPackage: userManuallySelectedRulePackage,
        }),
        jurisdictionCode: normalizedJurisdiction,
        jurisdictionName: getJurisdictionDisplayName(normalizedJurisdiction),
        examRegime: nextExamRegime,
      }

      const result = await postStudyPlan(requestBody)
      const data = result.data

      if (!result.ok) {
        const message = result.error || "Failed to save study plan."

        setStudyPlanSaveStatus("idle")
        showDashboardToast("error", "Study plan was not saved", message)
        return
      }

      setPlanData((prev: any) => ({
        ...(prev ?? {}),
        ...data,
        jurisdictionCode: normalizedJurisdiction,
        jurisdictionName: getJurisdictionDisplayName(normalizedJurisdiction),
        examRegime: nextExamRegime,
        userManuallySelectedRulePackage,
      }))

      setStudyPlanSaveStatus("saved")
      setHasUnsavedPlanChanges(false)
      showDashboardToast("success", "Study plan saved", "Your study calendar was saved successfully.")

      await loadStudyPlanOnly(currentUserId)
      await refreshDashboardAndPlan()

      window.setTimeout(() => {
        setStudyPlanSaveStatus("idle")
      }, 2500)
    } catch (err) {
      console.error("SAVE STUDY PLAN ERROR:", err)

      setStudyPlanSaveStatus("idle")
      showDashboardToast("error", "Study plan was not saved", "Please try again.")
    }
  }

  async function resetStudyPlan() {
    if (!currentUserId) return

    try {
      const result = await deleteStudyPlan(currentUserId)

      if (!result.ok) {
        showDashboardToast(
          "error",
          "Study plan was not reset",
          result.error || "Failed to reset study plan."
        )
        return
      }

      setPlanData(null)
      setCalendarDays([])
      setCalendarMonth(new Date())
      setStartDate("")
      setExamDate("")
      setStudyWeekends(true)
      setRuleSet("core")
      setSavedOffMap({})
      setSavedOnMap({})
      setHasShownPlanThisSession(false)
      setHasUnsavedPlanChanges(false)
      setUserManuallySelectedRulePackage(false)
      setResetConfirmOpen(false)
      closeStudyPlanModal()
      setStudyPlanLoaded(true)

      showDashboardToast("success", "Study plan reset", "Your study calendar was reset successfully.")

      await refreshDashboardAndPlan()
    } catch (err) {
      console.error("RESET STUDY PLAN ERROR:", err)
      showDashboardToast("error", "Study plan was not reset", "Please try again.")
    }
  }

  function changeMonth(direction: "prev" | "next") {
    if (!calendarMonth) return

    const next = new Date(calendarMonth)
    next.setMonth(calendarMonth.getMonth() + (direction === "prev" ? -1 : 1))
    next.setDate(1)

    setCalendarMonth(next)
    setCalendarDays(
      buildCalendarDays(
        startDate,
        examDate,
        next,
        savedOffMap,
        savedOnMap,
        studyWeekends
      )
    )
  }

  const todayRuleTarget =
    planData?.rulesByDate?.[todayKey] ??
    dashboard?.goalBLL ??
    planData?.dailyRules ??
    20

  const todaySpacedReviews = Number(dashboard?.spacedReviewsDue ?? 0)

  const isPremium = subscriptionTier === "premium"
  const shouldShowMBEComingSoon = entitlements.canSeeMBEComingSoon

  const shouldShowWelcomeBanner =
    authReady &&
    studyPlanLoaded &&
    coreLoaded &&
    !planData &&
    (dashboard?.todayBLL ?? 0) === 0 &&
    (dashboard?.todayMBE ?? 0) === 0

  const bllDiff =
    (stateData?.userBLL ?? dashboard?.userBLL ?? 0) -
    (stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0)

  const goalMbe = dashboard?.goalMBE ?? 60
  const goalBll = todayRuleTarget
  const todayMbe = dashboard?.todayMBE ?? 0
  const todayBll = dashboard?.todayBLL ?? 0

  const bllGoalDelta =
    Math.round((todayBll / Math.max(goalBll, 1)) * 100) - 100

  const rankingPercent = useMemo(() => {
    const scoreValue = stateData?.userBLL ?? dashboard?.userBLL

    if (scoreValue === null || scoreValue === undefined) return null

    const score = Number(scoreValue)
    if (!Number.isFinite(score)) return null

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

  const jurisdictionBllRows = useMemo(() => {
    return getSubjectAnalyticsForCurrentJurisdiction()
  }, [
    selectedStudyJurisdiction,
    examDate,
    bllSubjects,
    planData?.jurisdictionCode,
    planData?.examRegime,
  ])

  const activeRows = useMemo(() => {
    if (analyticsMode === "MBE") return mbeRows
    return jurisdictionBllRows
  }, [analyticsMode, mbeRows, jurisdictionBllRows])

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

    return { labels: [], user: [], avg: [] }
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
    rankingPercent === null ? "Loading..." : `Top ${rankingPercent}% Nationwide`

  const selectedJurisdictionOption =
    getSelectedJurisdictionOption(selectedStudyJurisdiction)

  const effectiveExamRegime = getEffectiveExamRegime(
    selectedStudyJurisdiction,
    examDate
  )

  const effectiveSubjectPlan = getJurisdictionSubjects(
    selectedStudyJurisdiction,
    examDate
  )

  const visibleSubjectPlan = effectiveSubjectPlan
  const studyDayStats = getStudyPlanDayStats()
  const daysUntilExam = getDaysUntilExam()
  const weeksUntilExam = Math.max(0, daysUntilExam / 7).toFixed(1)
  const recommendedRuleSet = getRecommendedRuleSet(daysUntilExam, isPremium)

  const actualTotalRules =
    Number(planData?.totalRules ?? 0) ||
    getEffectivePackageRuleTotal(getSubjectRuleTotal(bllSubjects), ruleSet)

  const totalPlanRulesForDisplay =
    Number.isFinite(actualTotalRules) && actualTotalRules > 0
      ? Math.round(actualTotalRules)
      : 0

  const totalPlanRulesForPercent = Math.max(1, totalPlanRulesForDisplay)

  const subjectRulesStudiedCount = subjectRows.reduce((sum, row) => {
    return sum + Number(row.completed ?? 0)
  }, 0)

  const rawRulesStudiedCount = Math.max(
    0,
    Number(
      dashboard?.totalRulesStudied ??
        dashboard?.totalRulesMastered ??
        subjectRulesStudiedCount ??
        0
    )
  )

  const rulesStudiedCount = shouldUseGlobalSubjectProgressForCurrentJurisdiction()
    ? rawRulesStudiedCount
    : 0

  const rulesStudiedPercent =
    totalPlanRulesForDisplay > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((rulesStudiedCount / totalPlanRulesForPercent) * 100)
          )
        )
      : 0

  const studyDaysPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (studyDayStats.completedStudyDays /
          Math.max(studyDayStats.totalStudyDays, 1)) *
          100
      )
    )
  )

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

          @keyframes progressShimmer {
            0% {
              transform: translateX(-120%);
            }
            100% {
              transform: translateX(220%);
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
                subtitle="Coming soon"
                accent="blue"
                progress={
                  isPremium
                    ? Number((todayMbe / Math.max(goalMbe, 1)) * 100)
                    : 0
                }
                locked={true}
                premiumTag={true}
                delta={null}
                deltaMode="goal"
                onClickLocked={() => undefined}
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
                subtitle="Coming soon"
                accent="blue"
                progress={
                  isPremium
                    ? stateData?.userMBE ?? dashboard?.userMBE ?? 0
                    : 0
                }
                locked={true}
                premiumTag={true}
                delta={null}
                deltaMode="average"
                onClickLocked={() => undefined}
              />

              <MetricCard
                title="BLL Score"
                value={`${stateData?.userBLL ?? dashboard?.userBLL ?? 0}%`}
                subtitle={`State avg: ${
                  stateData?.stateBLLAvg ?? dashboard?.stateBLLAvg ?? 0
                }%`}
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
                    {todayBll} / {goalBll} rules today •{" "}
                    {todaySpacedReviews} spaced reviews due
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

                  {shouldShowMBEComingSoon && (
                    <button
                      type="button"
                      onClick={() => undefined}
                      className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100"
                    >
                      MBE
                      <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-700">
                        Coming Soon
                      </span>
                    </button>
                  )}
                </div>

                <div
                  className="relative flex items-center gap-1"
                  ref={customRangeRef}
                >
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
                <LockedChartCard onClick={() => undefined} />
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
                    ? `${getJurisdictionDisplayName(selectedStudyJurisdiction)} BLL accuracy over time`
                    : "MBE accuracy over time"
                } • ${chartRangeLabel}`}
                premium
              >
                {analyticsMode === "MBE" && !isPremium ? (
                  <LockedChartCard onClick={() => undefined} />
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
                    ? `${getJurisdictionDisplayName(selectedStudyJurisdiction)} subjects`
                    : isPremium
                      ? "Your MBE percentage vs state average"
                      : "Premium only. Unlock MBE analytics."
                }
              >
                {analyticsMode === "MBE" ? (
                  isPremium ? (
                    <SimpleBarChart rows={selectedSubjectBars} showAverage={true} />
                  ) : (
                    <LockedChartCard onClick={() => undefined} />
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
                subtitle="Coming soon"
                onClick={() => undefined}
                locked={false}
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
                  Select Comparison State
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This only changes comparison data. It does not change your
                  study jurisdiction.
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
                    Compare
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
            className="relative h-[88vh] w-[1120px] max-w-[96vw] select-none overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
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

              <div className="grid min-h-0 flex-1 grid-cols-1 bg-white lg:grid-cols-[1fr_320px]">
                <div className="min-h-0 overflow-y-auto border-r border-[#D6E4FF] bg-white px-6 py-5">
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
                    Choose your exam date, then adjust study days as needed.
                    Days marked off are excluded from daily rule distribution.
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
                    <div className="flex h-[430px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                      Select your start date and exam date, then click Create Plan.
                    </div>
                  ) : (
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
                              "min-h-[66px] rounded-[14px] px-2 py-2 text-left transition-all duration-200 shadow-sm",
                              d.isPadding
                                ? "cursor-default border border-slate-100 bg-slate-50 text-slate-300"
                                : "",
                              d.isExamDay
                                ? "border border-amber-300 bg-amber-50"
                                : "",
                              d.isOff
                                ? "border border-rose-200 bg-rose-50 text-rose-600"
                                : "",
                              !d.isPadding && !d.isOff && !d.isExamDay
                                ? "border border-[#D6E4FF] bg-[#F7FAFF] hover:-translate-y-0.5 hover:border-[#7C5CFC] hover:bg-[#F0EDFF]"
                                : "",
                              isToday && !d.isPadding
                                ? "ring-2 ring-[#7C5CFC] bg-[#F0EDFF]"
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
                  )}

                  <div className="mt-5 grid grid-cols-1 gap-4 px-1 md:grid-cols-2">
                    <ProgressLine
                      label="Rules Studied"
                      value={`${rulesStudiedCount} / ${
                        totalPlanRulesForDisplay || "-"
                      }`}
                      percent={rulesStudiedPercent}
                      tone="violet"
                    />

                    <ProgressLine
                      label="Study Days"
                      value={`${studyDayStats.completedStudyDays} / ${studyDayStats.totalStudyDays}`}
                      percent={studyDaysPercent}
                      tone="amber"
                    />
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto bg-[#EEF5FF]">
                  <StudyPanelSection compact>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7F9CC0]">
                      Exam Countdown
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[5px] border-[#D6E4FF] bg-white shadow-sm">
                        <div className="absolute inset-[-5px] rounded-full border-[5px] border-transparent border-t-[#7C5CFC]" />
                        <div className="text-center">
                          <div className="font-mono text-[18px] font-semibold text-[#3C3489]">
                            {daysUntilExam}
                          </div>
                          <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7F77DD]">
                            days
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-slate-900">
  {getJurisdictionDisplayName(selectedStudyJurisdiction)}
</div>
<div className="mt-1 font-mono text-[11px] text-[#7F9CC0]">
  {examDate ? formatShortDate(new Date(`${examDate}T00:00:00`)) : "No exam date"}
</div>
<div className="mt-1 truncate text-[10px] font-medium text-[#7F9CC0]">
  {getRegimeLabel(effectiveExamRegime)}
</div>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                          <Flame size={11} />
                          {weeksUntilExam} weeks left
                        </div>
                      </div>
                    </div>
                  </StudyPanelSection>

                  <StudyPanelSection compact>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7F9CC0]">
                        Subject Progress
                      </div>
                      <div className="text-[10px] font-semibold text-[#3C3489]">
                        {effectiveSubjectPlan.length} subjects
                      </div>
                    </div>

                    <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                      {visibleSubjectPlan.map((subject) => {
                        const pct = getSubjectProgressPercent(subject.name)

                        return (
                          <div
                            key={`${subject.system}-${subject.name}`}
                            className="flex items-center gap-2"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#7C5CFC]" />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                              {subject.name}
                            </span>
                            <div className="h-[4px] w-16 overflow-hidden rounded-full bg-[#D6E4FF]">
                              <div
                                className="h-full rounded-full bg-[#7C5CFC]"
                                style={{
                                  width: `${Math.max(0, Math.min(pct, 100))}%`,
                                }}
                              />
                            </div>
                            <span className="w-8 text-right font-mono text-[10px] text-[#7F9CC0]">
                              {pct}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </StudyPanelSection>

                  <StudyPanelSection compact>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7F9CC0]">
                      Overview
                    </div>

                    <div className="space-y-2.5">
                      <OverviewRow
                        icon={<Zap size={14} />}
                        label="Today’s target"
                        value={String(goalBll || "-")}
                        tone="violet"
                      />

                      <OverviewRow
                        icon={<Zap size={14} />}
                        label="Average pace"
                        value={String(planData?.dailyRules ?? "-")}
                        tone="violet"
                      />

                      <OverviewRow
                        icon={<CalendarOff size={14} />}
                        label="Days off saved"
                        value={String(planData?.offDates?.length ?? 0)}
                        tone="amber"
                      />

                      <OverviewRow
                        icon={<CalendarClock size={14} />}
                        label="Study days left"
                        value={String(planData?.totalDays ?? 0)}
                        tone="violet"
                      />

                      <OverviewRow
                        icon={<Layers size={14} />}
                        label="Rule package"
                        value={RULE_PACKAGE_META[ruleSet].shortLabel}
                        tone="violet"
                      />
                    </div>
                  </StudyPanelSection>

                  <StudyPanelSection compact>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7F9CC0]">
                      Settings
                    </div>

                    <div className="space-y-3">
                      <PanelField label="Jurisdiction">
                        <select
                          value={selectedStudyJurisdiction}
                          onChange={(e) =>
                            handleStudyJurisdictionChange(e.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-[#BED0F5] bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] outline-none transition focus:border-[#7C5CFC] focus:ring-4 focus:ring-violet-100"
                        >
                          <option value="UBE">UBE / Uniform Current</option>
                          {JURISDICTION_OPTIONS.map((j) => (
                            <option key={j.code} value={j.code}>
                              {j.name} — {j.group}
                            </option>
                          ))}
                        </select>
                        <div className="mt-1 text-[10px] leading-4 text-[#6D82A3]">
                          Current system: {getRegimeLabel(effectiveExamRegime)}
                          {selectedJurisdictionOption?.nextGenStart
                            ? ` • NextGen from ${selectedJurisdictionOption.nextGenStart}`
                            : ""}
                        </div>
                      </PanelField>

                      <PanelField label="Start date">
                        <input
                          type="date"
                          className="w-full rounded-2xl border border-[#D7E2F7] bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] outline-none transition focus:border-[#7C5CFC] focus:ring-4 focus:ring-violet-100"
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                        />
                      </PanelField>

                      <PanelField label="Exam date">
                        <input
                          type="date"
                          className="w-full rounded-2xl border border-[#D7E2F7] bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] outline-none transition focus:border-[#7C5CFC] focus:ring-4 focus:ring-violet-100"
                          value={examDate}
                          onChange={(e) => handleExamDateChange(e.target.value)}
                        />
                      </PanelField>

                      <PanelField label="Package">
                        <select
                          value={ruleSet}
                          onChange={(e) =>
                            handleRuleSetChange(normalizeRuleSet(e.target.value))
                          }
                          className="w-full appearance-none rounded-2xl border border-[#D7E2F7] bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] outline-none transition focus:border-[#7C5CFC] focus:ring-4 focus:ring-violet-100"
                        >
                          <option value="emergency">Emergency Pack</option>
                          <option value="priority">Priority Rules</option>
                          <option value="core">Core Rules Only</option>
                          <option value="full" disabled={!isPremium}>
                            Full Rule Bank{!isPremium ? " — Premium" : ""}
                          </option>
                        </select>
                        <div className="mt-1 text-[10px] leading-4 text-[#6D82A3]">
                          Recommended: {RULE_PACKAGE_META[recommendedRuleSet].label}.{" "}
                          {userManuallySelectedRulePackage
                            ? "You manually selected this package. "
                            : ""}
                          {RULE_PACKAGE_META[ruleSet].description}
                        </div>
                      </PanelField>

                      <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                        <div className="text-[12px] font-medium text-[#7F9CC0]">
                          Weekends
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStudyWeekendChange(!studyWeekends)}
                          className={`relative h-7 w-14 rounded-full transition ${
                            studyWeekends ? "bg-[#7C5CFC]" : "bg-[#C7DAF7]"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                              studyWeekends ? "left-8" : "left-1"
                            }`}
                          />
                          <span className="absolute right-[-28px] top-1 text-[12px] font-medium text-[#7F9CC0]">
                            {studyWeekends ? "on" : "off"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </StudyPanelSection>

                  <StudyPanelSection compact>
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7F9CC0]">
                      Daily Breakdown
                    </div>

                    <div className="space-y-3">
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
                            {todaySpacedReviews}
                          </span>
                        }
                      />

                      <InfoRow
                        label="MBE Questions"
                        value={
                          isPremium ? (
                            <span className="font-semibold text-slate-400">
                              Coming soon
                            </span>
                          ) : (
                            <PremiumBadge onClick={() => undefined} />
                          )
                        }
                      />
                    </div>
                  </StudyPanelSection>

                  <div className="grid grid-cols-3 gap-3 border-t border-[#D6E4FF] p-4">
                    <button
                      onClick={createPlan}
                      className="rounded-2xl bg-[linear-gradient(135deg,#7C5CFC,#9B7CFF)] px-3 py-3 text-[13px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(124,92,252,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-14px_rgba(124,92,252,0.8)] active:translate-y-0"
                    >
                      Create
                    </button>

                    <button
                      onClick={savePlanAndKeepOpen}
                      disabled={!canSavePlan}
                      className={`rounded-2xl px-3 py-3 text-[13px] font-semibold shadow-sm transition ${
                        canSavePlan
                          ? "bg-white text-slate-900 ring-1 ring-[#BFD0F3] hover:-translate-y-0.5 hover:bg-[#F7FAFF] hover:shadow-[0_14px_24px_-18px_rgba(15,23,42,0.55)] active:translate-y-0"
                          : "cursor-not-allowed bg-[#E7EEF9] text-[#9AAAC5] ring-1 ring-[#C7D5EF]"
                      }`}
                    >
                      {studyPlanSaveStatus === "saving"
                        ? "Saving..."
                        : studyPlanSaveStatus === "saved"
                          ? "Saved"
                          : "Save"}
                    </button>

                    <button
                      onClick={() => setResetConfirmOpen(true)}
                      className="rounded-2xl bg-white px-3 py-3 text-[13px] font-semibold text-rose-600 ring-1 ring-rose-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-[0_14px_24px_-18px_rgba(244,63,94,0.55)] active:translate-y-0"
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
                        This will remove the current study plan. It will not reset your profile information.
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

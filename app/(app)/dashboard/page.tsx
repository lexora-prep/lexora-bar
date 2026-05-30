"use client"

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
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
  BookOpen,
  CheckCircle2,
  LineChart,
  BarChart3,
  Crown,
  Lock,
  Zap,
  AlertTriangle,
  Gavel,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type RuleSet = "core"

type ExamRegime =
  | "UBE_CURRENT"
  | "NEXTGEN"
  | "CALIFORNIA_CURRENT"
  | "FLORIDA_CURRENT"
  | "FLORIDA_NEXTGEN"
  | "STATE_SPECIFIC"
  | "TERRITORY_SPECIAL"
  | "LOCAL_COMPONENT"

type JurisdictionGroup =
  | "UBE / Uniform Current"
  | "California"
  | "Florida"
  | "State-Specific / Non-UBE"
  | "Territories / Special"
  | "Local Component"

type JurisdictionOption = {
  code: string
  name: string
  group: JurisdictionGroup
  nextGenStart?: string
  needsVerification?: boolean
  localComponent?: boolean
}

type SubjectPlanItem = {
  name: string
  weight: number
  system: ExamRegime
}

const UBE_CURRENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 8, system: "UBE_CURRENT" },
  { name: "Constitutional Law", weight: 8, system: "UBE_CURRENT" },
  { name: "Contracts", weight: 8, system: "UBE_CURRENT" },
  { name: "Criminal Law", weight: 6, system: "UBE_CURRENT" },
  { name: "Criminal Procedure", weight: 6, system: "UBE_CURRENT" },
  { name: "Evidence", weight: 8, system: "UBE_CURRENT" },
  { name: "Real Property", weight: 8, system: "UBE_CURRENT" },
  { name: "Torts", weight: 8, system: "UBE_CURRENT" },
  { name: "Business Associations", weight: 6, system: "UBE_CURRENT" },
  { name: "Agency", weight: 4, system: "UBE_CURRENT" },
  { name: "Partnership", weight: 4, system: "UBE_CURRENT" },
  { name: "Corporations", weight: 4, system: "UBE_CURRENT" },
  { name: "Limited Liability Companies", weight: 3, system: "UBE_CURRENT" },
  { name: "Conflict of Laws", weight: 3, system: "UBE_CURRENT" },
  { name: "Family Law", weight: 5, system: "UBE_CURRENT" },
  { name: "Secured Transactions", weight: 5, system: "UBE_CURRENT" },
  { name: "Trusts", weight: 4, system: "UBE_CURRENT" },
  { name: "Wills and Estates", weight: 4, system: "UBE_CURRENT" },
  { name: "Performance Test Templates", weight: 3, system: "UBE_CURRENT" },
]

const NEXTGEN_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 10, system: "NEXTGEN" },
  { name: "Contract Law", weight: 10, system: "NEXTGEN" },
  { name: "Evidence", weight: 10, system: "NEXTGEN" },
  { name: "Torts", weight: 10, system: "NEXTGEN" },
  { name: "Business Associations", weight: 9, system: "NEXTGEN" },
  { name: "Constitutional Law", weight: 9, system: "NEXTGEN" },
  { name: "Criminal Law", weight: 8, system: "NEXTGEN" },
  { name: "Criminal Procedure", weight: 8, system: "NEXTGEN" },
  { name: "Real Property", weight: 8, system: "NEXTGEN" },
  { name: "Family Law", weight: 7, system: "NEXTGEN" },
  { name: "Legal Research", weight: 5, system: "NEXTGEN" },
  { name: "Legal Writing", weight: 5, system: "NEXTGEN" },
  { name: "Issue Spotting and Analysis", weight: 5, system: "NEXTGEN" },
  { name: "Investigation and Evaluation", weight: 4, system: "NEXTGEN" },
  { name: "Client Counseling and Advising", weight: 4, system: "NEXTGEN" },
  { name: "Negotiation and Dispute Resolution", weight: 3, system: "NEXTGEN" },
  { name: "Client Relationship and Management", weight: 3, system: "NEXTGEN" },
  { name: "Performance Task Templates", weight: 4, system: "NEXTGEN" },
]

const CALIFORNIA_SUBJECTS: SubjectPlanItem[] = [
  { name: "Business Associations", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Civil Procedure", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "California Civil Procedure", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Community Property", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Constitutional Law", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Contracts", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Criminal Law", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Criminal Procedure", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Evidence", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "California Evidence", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Professional Responsibility", weight: 8, system: "CALIFORNIA_CURRENT" },
  { name: "California Professional Responsibility", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Real Property", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Remedies", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Torts", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Trusts", weight: 5, system: "CALIFORNIA_CURRENT" },
  { name: "Wills and Succession", weight: 5, system: "CALIFORNIA_CURRENT" },
  { name: "California Performance Test Templates", weight: 5, system: "CALIFORNIA_CURRENT" },
]

const FLORIDA_CURRENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Florida Constitutional Law", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Federal Constitutional Law", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Contracts", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Criminal Law", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Criminal Procedure", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Florida Criminal Procedure", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Evidence", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Florida Evidence", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Real Property", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Florida Real Property", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Torts", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Florida Civil Procedure", weight: 7, system: "FLORIDA_CURRENT" },
  { name: "Florida Rules of Judicial Administration", weight: 4, system: "FLORIDA_CURRENT" },
  { name: "Business Entities", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Family Law", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Wills", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Trusts", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Administration of Estates", weight: 4, system: "FLORIDA_CURRENT" },
  { name: "UCC Article 3", weight: 4, system: "FLORIDA_CURRENT" },
  { name: "UCC Article 9", weight: 4, system: "FLORIDA_CURRENT" },
  { name: "Rules Regulating The Florida Bar", weight: 4, system: "FLORIDA_CURRENT" },
  { name: "Professionalism", weight: 4, system: "FLORIDA_CURRENT" },
]

const STATE_SPECIFIC_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Constitutional Law", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Contracts", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Criminal Law", weight: 6, system: "STATE_SPECIFIC" },
  { name: "Criminal Procedure", weight: 6, system: "STATE_SPECIFIC" },
  { name: "Evidence", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Real Property", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Torts", weight: 7, system: "STATE_SPECIFIC" },
  { name: "State Civil Procedure", weight: 5, system: "STATE_SPECIFIC" },
  { name: "State Criminal Procedure", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Evidence Distinctions", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Constitutional Law", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Real Property Distinctions", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Wills", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Trusts", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Estates", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Family Law", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Business Entities", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Professional Responsibility", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Remedies", weight: 4, system: "STATE_SPECIFIC" },
  { name: "State Commercial Law / UCC", weight: 4, system: "STATE_SPECIFIC" },
  { name: "Local Bar Rules", weight: 3, system: "STATE_SPECIFIC" },
  { name: "Performance Test Templates", weight: 3, system: "STATE_SPECIFIC" },
]

const LOCAL_COMPONENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Local Law", weight: 8, system: "LOCAL_COMPONENT" },
  { name: "Local Civil Practice", weight: 8, system: "LOCAL_COMPONENT" },
  { name: "Local Criminal Procedure", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Local Evidence Distinctions", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Local Professional Responsibility", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Local Real Property Rules", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Local Family Law", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Local Trusts and Estates", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Local Administrative / Admission Rules", weight: 5, system: "LOCAL_COMPONENT" },
]

const JURISDICTION_OPTIONS: JurisdictionOption[] = [
  { code: "AL", name: "Alabama", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AK", name: "Alaska", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AZ", name: "Arizona", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "AR", name: "Arkansas", group: "UBE / Uniform Current" },
  { code: "CO", name: "Colorado", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "CT", name: "Connecticut", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "DC", name: "District of Columbia", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "GU", name: "Guam", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "ID", name: "Idaho", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "IL", name: "Illinois", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "IN", name: "Indiana", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "IA", name: "Iowa", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "KS", name: "Kansas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "KY", name: "Kentucky", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "ME", name: "Maine", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MD", name: "Maryland", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MA", name: "Massachusetts", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MI", name: "Michigan", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MN", name: "Minnesota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MO", name: "Missouri", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MT", name: "Montana", group: "UBE / Uniform Current" },
  { code: "NE", name: "Nebraska", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NH", name: "New Hampshire", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NJ", name: "New Jersey", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NM", name: "New Mexico", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NY", name: "New York", group: "UBE / Uniform Current", nextGenStart: "2028-07-01", localComponent: true },
  { code: "NC", name: "North Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "ND", name: "North Dakota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MP", name: "Northern Mariana Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "OH", name: "Ohio", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "OK", name: "Oklahoma", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "OR", name: "Oregon", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "PW", name: "Palau", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "PA", name: "Pennsylvania", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "RI", name: "Rhode Island", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "SC", name: "South Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "TN", name: "Tennessee", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "TX", name: "Texas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VI", name: "U.S. Virgin Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "UT", name: "Utah", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VT", name: "Vermont", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WA", name: "Washington", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "WV", name: "West Virginia", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WI", name: "Wisconsin", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "WY", name: "Wyoming", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "CA", name: "California", group: "California", needsVerification: true },
  { code: "FL", name: "Florida", group: "Florida", nextGenStart: "2028-07-01" },
  { code: "DE", name: "Delaware", group: "State-Specific / Non-UBE", nextGenStart: "2028-02-01" },
  { code: "GA", name: "Georgia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "HI", name: "Hawaii", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "LA", name: "Louisiana", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "MS", name: "Mississippi", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "NV", name: "Nevada", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "SD", name: "South Dakota", group: "State-Specific / Non-UBE", nextGenStart: "2027-07-01" },
  { code: "VA", name: "Virginia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "PR", name: "Puerto Rico", group: "Territories / Special", needsVerification: true },
]

const MBE_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Real Property",
  "Constitutional Law",
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

function normalizeRuleSet(_value: unknown): RuleSet {
  return "core"
}

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
  const [isPremium, setIsPremium] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  const [coreLoaded, setCoreLoaded] = useState(false)
  const [studyPlanLoaded, setStudyPlanLoaded] = useState(false)

  const [openPlan, setOpenPlan] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
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

  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("14d")
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

      setIsPremium(!!profile?.mbe_access)

      const selectedDashboardState =
        summary?.comparisonState && String(summary.comparisonState).trim()
          ? String(summary.comparisonState).trim()
          : summary?.dashboard?.selectedState &&
              String(summary.dashboard.selectedState).trim()
            ? String(summary.dashboard.selectedState).trim()
            : profile?.jurisdiction && String(profile.jurisdiction).trim()
              ? String(profile.jurisdiction).trim()
              : ""

      if (selectedDashboardState) {
        setState((prev) => {
          const current = String(prev || "").trim()
          if (current === selectedDashboardState) return prev
          return selectedDashboardState
        })

        setSelectedStudyJurisdiction((prev) => {
          if (prev && prev !== "UBE") return prev
          return normalizeJurisdictionCode(selectedDashboardState)
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
      } else {
        const start = studyPlan.startDate?.slice(0, 10) || ""
        const exam = studyPlan.examDate?.slice(0, 10) || ""
        const nextStudyWeekends = studyPlan.studyWeekends ?? true
        const nextRuleSet = normalizeRuleSet(studyPlan.ruleSet)

        setStartDate(start)
        setExamDate(exam)
        setStudyWeekends(nextStudyWeekends)
        setRuleSet(nextRuleSet)

        const totalRules = getPlanTotalRules(studyPlan, summaryRuleTotal)
        const offMap: Record<string, boolean> = {}
        const onMap: Record<string, boolean> = {}

        if (Array.isArray(studyPlan?.offDates)) {
          studyPlan.offDates.forEach((d: string) => {
            offMap[d] = true
          })
        }

        if (Array.isArray(studyPlan?.onDates)) {
          studyPlan.onDates.forEach((d: string) => {
            onMap[d] = true
          })
        }

        setSavedOffMap(offMap)
        setSavedOnMap(onMap)

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
          planData?.rulesByDate ?? {}
        )

        setPlanData({
          ...studyPlan,
          ruleSet: nextRuleSet,
          totalRules,
          totalDays: activeStudyDays || studyPlan.totalDays || 0,
          dailyRules: safeDailyRules,
          rulesByDate: distributedRules,
        })

        setHasShownPlanThisSession(true)

        if (start && exam) {
          const preservedMonth = calendarMonth ?? new Date(start)
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

      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    } catch (err) {
      console.error("APPLY DASHBOARD BATCH ERROR:", err)
      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    }
  }, [dashboardBatchQuery.data])

  useEffect(() => {
    if (dashboardBatchQuery.isError) {
      console.error("DASHBOARD BATCH QUERY ERROR:", dashboardBatchQuery.error)
      setCoreLoaded(true)
      setStudyPlanLoaded(true)
    }
  }, [dashboardBatchQuery.isError, dashboardBatchQuery.error])

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
        setSavedOnMap({})
        setStartDate("")
        setExamDate("")
        setStudyWeekends(true)
        setRuleSet("core")
        setHasShownPlanThisSession(false)
        return
      }

      const start = data.startDate?.slice(0, 10) || ""
      const exam = data.examDate?.slice(0, 10) || ""
      const nextStudyWeekends = data.studyWeekends ?? true
      const nextRuleSet = normalizeRuleSet(data.ruleSet)

      setStartDate(start)
      setExamDate(exam)
      setStudyWeekends(nextStudyWeekends)
      setRuleSet(nextRuleSet)

      const totalRules = getPlanTotalRules(data, planData?.totalRules)
      const offMap: Record<string, boolean> = {}
      const onMap: Record<string, boolean> = {}

      if (Array.isArray(data?.offDates)) {
        data.offDates.forEach((d: string) => {
          offMap[d] = true
        })
      }

      if (Array.isArray(data?.onDates)) {
        data.onDates.forEach((d: string) => {
          onMap[d] = true
        })
      }

      setSavedOffMap(offMap)
      setSavedOnMap(onMap)

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
        data?.dailyRules
      )

      const distributedRules = buildDistributedRuleMap(
        start,
        exam,
        totalRules,
        offMap,
        onMap,
        nextStudyWeekends,
        todayKey,
        planData?.rulesByDate ?? {}
      )

      setPlanData({
        ...data,
        ruleSet: nextRuleSet,
        totalRules,
        totalDays: activeStudyDays || data.totalDays || 0,
        dailyRules: safeDailyRules,
        rulesByDate: distributedRules,
      })

      setHasShownPlanThisSession(true)

      if (start && exam) {
        const preservedMonth = calendarMonth ?? new Date(start)
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
    } catch (err) {
      console.error("LOAD STUDY PLAN ERROR:", err)
      setPlanData(null)
      setCalendarDays([])
      setCalendarMonth(null)
      setSavedOffMap({})
      setSavedOnMap({})
    } finally {
      setStudyPlanLoaded(true)
    }
  }

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

  function getPositiveNumber(...values: any[]) {
    for (const value of values) {
      const num = Number(value)
      if (Number.isFinite(num) && num > 0) {
        return num
      }
    }

    return 0
  }

  function getPlanTotalRules(source?: any, fallback?: any) {
    return getPositiveNumber(
      source?.totalRules,
      source?.total_rules,
      source?.totalRuleCount,
      source?.total_rule_count,
      source?.remainingRules,
      source?.remaining_rules,
      fallback
    )
  }

  function getSubjectRuleTotal(rows?: any[]) {
    if (!Array.isArray(rows)) return 0

    return rows.reduce((sum, row) => {
      const total = Number(row?.total ?? 0)
      if (!Number.isFinite(total) || total <= 0) return sum
      return sum + total
    }, 0)
  }

  function getSafeDailyRules(
    totalRules: number,
    activeStudyDays: number,
    fallbackDailyRules?: any
  ) {
    const fallback = Number(fallbackDailyRules)

    if (
      Number.isFinite(totalRules) &&
      totalRules > 0 &&
      Number.isFinite(activeStudyDays) &&
      activeStudyDays > 0
    ) {
      return Math.max(1, Math.ceil(totalRules / activeStudyDays))
    }

    if (Number.isFinite(fallback) && fallback > 0) {
      return Math.max(1, Math.ceil(fallback))
    }

    return 0
  }

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

  function normalizeJurisdictionCode(value?: string | null) {
    const clean = String(value ?? "").trim()

    if (!clean) return "UBE"

    if (clean.toUpperCase() === "UBE") return "UBE"

    const direct = JURISDICTION_OPTIONS.find(
      (j) => j.code.toLowerCase() === clean.toLowerCase()
    )

    if (direct) return direct.code

    const byName = JURISDICTION_OPTIONS.find(
      (j) => j.name.toLowerCase() === clean.toLowerCase()
    )

    return byName?.code ?? "UBE"
  }

  function getSelectedJurisdictionOption(code: string) {
    const normalized = normalizeJurisdictionCode(code)
    return (
      JURISDICTION_OPTIONS.find((j) => j.code === normalized) ??
      JURISDICTION_OPTIONS.find((j) => j.code === "NY") ??
      null
    )
  }

  function getEffectiveExamRegime(
    code: string,
    selectedExamDate?: string
  ): ExamRegime {
    const normalized = normalizeJurisdictionCode(code)

    if (normalized === "UBE") return "UBE_CURRENT"

    const option = getSelectedJurisdictionOption(normalized)

    if (!option) return "UBE_CURRENT"

    if (option.code === "CA") return "CALIFORNIA_CURRENT"

    const examDateValue = selectedExamDate ? new Date(selectedExamDate) : null
    const nextGenDateValue = option.nextGenStart
      ? new Date(option.nextGenStart)
      : null

    const hasNextGenStarted =
      examDateValue &&
      nextGenDateValue &&
      !isNaN(examDateValue.getTime()) &&
      !isNaN(nextGenDateValue.getTime()) &&
      examDateValue >= nextGenDateValue

    if (option.code === "FL") {
      return hasNextGenStarted ? "FLORIDA_NEXTGEN" : "FLORIDA_CURRENT"
    }

    if (hasNextGenStarted) return "NEXTGEN"

    if (option.group === "Territories / Special") return "TERRITORY_SPECIAL"
    if (option.group === "State-Specific / Non-UBE") return "STATE_SPECIFIC"
    if (option.group === "Local Component") return "LOCAL_COMPONENT"

    return "UBE_CURRENT"
  }

  function getRegimeLabel(regime: ExamRegime) {
    if (regime === "UBE_CURRENT") return "UBE / Uniform Current"
    if (regime === "NEXTGEN") return "NextGen"
    if (regime === "CALIFORNIA_CURRENT") return "California"
    if (regime === "FLORIDA_CURRENT") return "Florida Current"
    if (regime === "FLORIDA_NEXTGEN") return "NextGen + Florida Component"
    if (regime === "STATE_SPECIFIC") return "State-Specific"
    if (regime === "TERRITORY_SPECIAL") return "Territory / Special"
    return "Local Component"
  }

  function getJurisdictionSubjects(
    code: string,
    selectedExamDate?: string
  ): SubjectPlanItem[] {
    const regime = getEffectiveExamRegime(code, selectedExamDate)

    if (regime === "CALIFORNIA_CURRENT") return CALIFORNIA_SUBJECTS
    if (regime === "FLORIDA_CURRENT") return FLORIDA_CURRENT_SUBJECTS
    if (regime === "FLORIDA_NEXTGEN") {
      return [
        ...NEXTGEN_SUBJECTS,
        { name: "Florida Civil Procedure", weight: 6, system: "FLORIDA_NEXTGEN" },
        { name: "Florida Evidence", weight: 5, system: "FLORIDA_NEXTGEN" },
        { name: "Rules Regulating The Florida Bar", weight: 4, system: "FLORIDA_NEXTGEN" },
        { name: "Professionalism", weight: 4, system: "FLORIDA_NEXTGEN" },
      ]
    }
    if (regime === "NEXTGEN") return NEXTGEN_SUBJECTS
    if (regime === "STATE_SPECIFIC") return STATE_SPECIFIC_SUBJECTS
    if (regime === "TERRITORY_SPECIAL") return UBE_CURRENT_SUBJECTS
    if (regime === "LOCAL_COMPONENT") return LOCAL_COMPONENT_SUBJECTS

    return UBE_CURRENT_SUBJECTS
  }

  function getSubjectProgressPercent(subjectName: string) {
    const normalized = subjectName.toLowerCase()
    const direct = subjectRows.find(
      (row) => row.name.toLowerCase() === normalized
    )

    if (direct && direct.total > 0) {
      return Math.round((direct.completed / Math.max(direct.total, 1)) * 100)
    }

    const loose = subjectRows.find((row) => {
      const name = row.name.toLowerCase()
      return normalized.includes(name) || name.includes(normalized)
    })

    if (loose && loose.total > 0) {
      return Math.round((loose.completed / Math.max(loose.total, 1)) * 100)
    }

    return 0
  }

  function getStudyPlanDayStats() {
    const allDates = getPlanDateRange(startDate, examDate)
    const today = normalizeLocalDate(new Date())

    const totalStudyDays = allDates.filter(
      (d) => !isDateOff(d, savedOffMap, savedOnMap, studyWeekends)
    ).length

    const completedStudyDays = allDates.filter(
      (d) =>
        d < today &&
        !isDateOff(d, savedOffMap, savedOnMap, studyWeekends)
    ).length

    return {
      totalStudyDays,
      completedStudyDays,
    }
  }

  function getDaysUntilExam() {
    if (!examDate) return 0

    const today = normalizeLocalDate(new Date())
    const exam = normalizeLocalDate(new Date(examDate))
    const diff = exam.getTime() - today.getTime()

    return Math.max(0, Math.ceil(diff / 86400000))
  }

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

  function isWeekendDate(date: Date) {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  function isDateOff(
    date: Date,
    offMap: Record<string, boolean>,
    onMap: Record<string, boolean>,
    shouldStudyWeekends: boolean
  ) {
    const key = formatDateInput(date)

    if (onMap[key]) return false
    if (offMap[key]) return true

    return !shouldStudyWeekends && isWeekendDate(date)
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
    onMap: Record<string, boolean>,
    shouldStudyWeekends = true,
    preserveBeforeDate?: string,
    previousRuleMap: Record<string, number> = {}
  ) {
    const allDates = getPlanDateRange(start, end)
    if (allDates.length === 0) return {}

    const today = normalizeLocalDate(new Date())
    const preserveBefore = preserveBeforeDate
      ? normalizeLocalDate(new Date(preserveBeforeDate))
      : today

    const safeTotalRules =
      Number.isFinite(totalRules) && totalRules > 0 ? Math.floor(totalRules) : 0

    const ruleMap: Record<string, number> = {}
    let lockedRules = 0

    for (const d of allDates) {
      const key = formatDateInput(d)

      if (d < preserveBefore) {
        const previousValue = Number(previousRuleMap?.[key] ?? 0)
        const safePreviousValue =
          Number.isFinite(previousValue) && previousValue > 0
            ? Math.floor(previousValue)
            : 0

        ruleMap[key] = safePreviousValue
        lockedRules += safePreviousValue
      }
    }

    const futureDates = allDates.filter((d) => d >= preserveBefore)
    const futureActiveDates = futureDates.filter(
      (d) => !isDateOff(d, offMap, onMap, shouldStudyWeekends)
    )

    const remainingRules = Math.max(0, safeTotalRules - lockedRules)

    if (futureActiveDates.length === 0) {
      for (const d of futureDates) {
        ruleMap[formatDateInput(d)] = 0
      }

      for (const d of allDates) {
        const key = formatDateInput(d)
        if (!(key in ruleMap)) ruleMap[key] = 0
      }

      return ruleMap
    }

    const base = Math.floor(remainingRules / futureActiveDates.length)
    let remainder = remainingRules % futureActiveDates.length

    for (const d of futureActiveDates) {
      const key = formatDateInput(d)
      ruleMap[key] = base + (remainder > 0 ? 1 : 0)

      if (remainder > 0) {
        remainder--
      }
    }

    for (const d of futureDates) {
      const key = formatDateInput(d)
      if (!(key in ruleMap)) {
        ruleMap[key] = 0
      }
    }

    for (const d of allDates) {
      const key = formatDateInput(d)
      if (!(key in ruleMap)) {
        ruleMap[key] = 0
      }
    }

    return ruleMap
  }

  function buildCalendarDays(
    start: string,
    end: string,
    monthDate?: Date,
    offMap?: Record<string, boolean>,
    onMap?: Record<string, boolean>,
    shouldStudyWeekends = true
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
      const inStudyRange = current >= startDt && current <= endDt

      cells.push({
        date: current,
        isOff: inStudyRange
          ? isDateOff(current, offMap ?? {}, onMap ?? {}, shouldStudyWeekends)
          : false,
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
    offMap: Record<string, boolean>,
    onMap: Record<string, boolean>,
    shouldStudyWeekends = true
  ) {
    return getPlanDateRange(start, end).filter(
      (d) => !isDateOff(d, offMap, onMap, shouldStudyWeekends)
    ).length
  }

  function applyStudyPlanOptimistically({
    nextOffMap,
    nextOnMap,
    nextStudyWeekends,
    nextRuleSet = ruleSet,
    preserveBeforeDate = todayKey,
  }: {
    nextOffMap: Record<string, boolean>
    nextOnMap: Record<string, boolean>
    nextStudyWeekends: boolean
    nextRuleSet?: RuleSet
    preserveBeforeDate?: string
  }) {
    if (!startDate || !examDate) return

    const totalRules = getPlanTotalRules(planData)
    const nextTotalDays = getRemainingStudyDays(
      startDate,
      examDate,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    )
    const nextDailyRules = getSafeDailyRules(
      totalRules,
      nextTotalDays,
      planData?.dailyRules
    )

    const nextRulesByDate = buildDistributedRuleMap(
      startDate,
      examDate,
      totalRules,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends,
      preserveBeforeDate,
      planData?.rulesByDate ?? {}
    )

    const nextCalendarDays = buildCalendarDays(
      startDate,
      examDate,
      calendarMonth ?? new Date(startDate),
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    )

    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])
    const nextOnDates = Object.keys(nextOnMap).filter((k) => nextOnMap[k])

    setSavedOffMap(nextOffMap)
    setSavedOnMap(nextOnMap)
    setStudyWeekends(nextStudyWeekends)
    setRuleSet(nextRuleSet)
    setCalendarDays(nextCalendarDays)

    setPlanData((prev: any) => ({
      ...(prev ?? {}),
      totalRules,
      dailyRules: nextDailyRules,
      totalDays: nextTotalDays,
      studyWeekends: nextStudyWeekends,
      ruleSet: nextRuleSet,
      offDates: nextOffDates,
      onDates: nextOnDates,
      rulesByDate: nextRulesByDate,
    }))

    setDashboard((prev: any) => ({
      ...(prev ?? {}),
      goalBLL:
        nextRulesByDate[todayKey] && nextRulesByDate[todayKey] > 0
          ? nextRulesByDate[todayKey]
          : nextDailyRules,
    }))
  }

  async function saveStudyPlanSilently(
    nextOffDates: string[],
    nextOnDates: string[],
    nextStudyWeekends = studyWeekends,
    nextRuleSet = ruleSet
  ) {
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
          studyWeekends: nextStudyWeekends,
          offDates: nextOffDates,
          onDates: nextOnDates,
          ruleSet: nextRuleSet,
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
    const cleanState = String(nextState || "").trim()

    if (!cleanState) return

    const queryKey = ["dashboard-batch", currentUserId, cleanState]

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
      await queryClient.invalidateQueries({
        queryKey,
      })
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
      const existingOnDates = Object.keys(savedOnMap).filter(
        (d) => savedOnMap[d]
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
          onDates: existingOnDates,
          ruleSet,
        }),
      })

      const data = await res.json()

      if (!res.ok || data?.error) {
        alert(data?.error || "Failed to create study plan.")
        return
      }

      const viewMonth = new Date(start.getFullYear(), start.getMonth(), 1)

      const totalRules = getPlanTotalRules(data, planData?.totalRules)
      const offMap: Record<string, boolean> = {}
      const onMap: Record<string, boolean> = {}

      if (Array.isArray(data?.offDates)) {
        data.offDates.forEach((d: string) => {
          offMap[d] = true
        })
      }

      if (Array.isArray(data?.onDates)) {
        data.onDates.forEach((d: string) => {
          onMap[d] = true
        })
      }

      const nextStudyWeekends = data.studyWeekends ?? studyWeekends
      const nextRuleSet = normalizeRuleSet(data.ruleSet)
      const safeTotalDays = getRemainingStudyDays(
        startDate,
        examDate,
        offMap,
        onMap,
        nextStudyWeekends
      )
      const safeDailyRules = getSafeDailyRules(
        totalRules,
        safeTotalDays,
        data?.dailyRules
      )

      const distributedRules = buildDistributedRuleMap(
        startDate,
        examDate,
        totalRules,
        offMap,
        onMap,
        nextStudyWeekends,
        todayKey,
        planData?.rulesByDate ?? {}
      )

      const nextPlanData = {
        ...data,
        ruleSet: nextRuleSet,
        totalRules,
        totalDays: safeTotalDays,
        dailyRules: safeDailyRules,
        rulesByDate: distributedRules,
      }

      const days = buildCalendarDays(
        startDate,
        examDate,
        viewMonth,
        offMap,
        onMap,
        nextStudyWeekends
      )

      setRuleSet(nextRuleSet)
      setSavedOffMap(offMap)
      setSavedOnMap(onMap)
      setPlanData(nextPlanData)
      setCalendarMonth(viewMonth)
      setCalendarDays(days)
      setHasShownPlanThisSession(true)

      setDashboard((prev: any) => ({
        ...prev,
        goalBLL:
          distributedRules[todayKey] && distributedRules[todayKey] > 0
            ? distributedRules[todayKey]
            : safeDailyRules,
      }))

      await queryClient.invalidateQueries({
        queryKey: ["dashboard-batch", currentUserId],
      })
    } catch (err) {
      console.error("CREATE PLAN ERROR:", err)
      alert("Something went wrong while generating the plan.")
    }
  }

  async function toggleCalendarDay(day: CalendarDay) {
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

    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])
    const nextOnDates = Object.keys(nextOnMap).filter((k) => nextOnMap[k])

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends: studyWeekends,
      nextRuleSet: ruleSet,
      preserveBeforeDate: todayKey,
    })

    await saveStudyPlanSilently(
      nextOffDates,
      nextOnDates,
      studyWeekends,
      ruleSet
    )
  }

  async function handleStudyWeekendChange(nextStudyWeekends: boolean) {
    const nextOffMap = { ...savedOffMap }
    const nextOnMap = { ...savedOnMap }
    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])
    const nextOnDates = Object.keys(nextOnMap).filter((k) => nextOnMap[k])

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends,
      nextRuleSet: ruleSet,
      preserveBeforeDate: todayKey,
    })

    await saveStudyPlanSilently(
      nextOffDates,
      nextOnDates,
      nextStudyWeekends,
      ruleSet
    )
  }

  async function handleRuleSetChange(nextRuleSet: RuleSet) {
    setRuleSet(nextRuleSet)

    if (!planData || !startDate || !examDate) {
      setPlanData((prev: any) => ({
        ...(prev ?? {}),
        ruleSet: nextRuleSet,
      }))
      return
    }

    const nextOffMap = { ...savedOffMap }
    const nextOnMap = { ...savedOnMap }
    const nextOffDates = Object.keys(nextOffMap).filter((k) => nextOffMap[k])
    const nextOnDates = Object.keys(nextOnMap).filter((k) => nextOnMap[k])

    applyStudyPlanOptimistically({
      nextOffMap,
      nextOnMap,
      nextStudyWeekends: studyWeekends,
      nextRuleSet,
      preserveBeforeDate: todayKey,
    })

    await saveStudyPlanSilently(
      nextOffDates,
      nextOnDates,
      studyWeekends,
      nextRuleSet
    )

    if (currentUserId) {
      await loadStudyPlanOnly(currentUserId)
    }
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
          ruleSet,
          offDates:
            planData?.offDates ??
            Object.keys(savedOffMap).filter((k) => savedOffMap[k]),
          onDates:
            planData?.onDates ??
            Object.keys(savedOnMap).filter((k) => savedOnMap[k]),
        }),
      })

      if (!res.ok) {
        alert("Failed to save study plan.")
        return
      }

      await loadStudyPlanOnly(currentUserId)
      await queryClient.invalidateQueries({
        queryKey: ["dashboard-batch", currentUserId],
      })
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
      setRuleSet("core")
      setSavedOffMap({})
      setSavedOnMap({})
      setHasShownPlanThisSession(false)
      setResetConfirmOpen(false)
      closeStudyPlanModal()
      setStudyPlanLoaded(true)

      await queryClient.invalidateQueries({
        queryKey: ["dashboard-batch", currentUserId],
      })
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

  const visibleSubjectPlan = effectiveSubjectPlan.slice(0, 9)

  const studyDayStats = getStudyPlanDayStats()
  const rulesMasteredCount = Math.max(0, Number(dashboard?.totalRulesMastered ?? weeklyRulesDone ?? 0))
  const totalPlanRules = Math.max(1, getPlanTotalRules(planData) || getSubjectRuleTotal(bllSubjects) || 1)
  const rulesMasteredPercent = Math.max(
    0,
    Math.min(100, Math.round((rulesMasteredCount / totalPlanRules) * 100))
  )
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
  const daysUntilExam = getDaysUntilExam()
  const weeksUntilExam = Math.max(0, daysUntilExam / 7).toFixed(1)

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
                    ? "Black letter law accuracy over time"
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

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 bg-white lg:grid-cols-[1fr_320px]">
                <div className="min-h-0 overflow-hidden border-r border-[#D6E4FF] bg-white p-6">
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
                                "min-h-[74px] rounded-[14px] px-2 py-2 text-left transition-all duration-200 shadow-sm hover:-translate-y-0.5",
                                d.isPadding
                                  ? "cursor-default border border-slate-100 bg-slate-50 text-slate-300"
                                  : "",
                                d.isExamDay
                                  ? "border border-amber-300 bg-amber-50"
                                  : "",
                                d.isOff
                                  ? "border border-dashed border-[#C5D5FF] bg-white"
                                  : "",
                                !d.isPadding && !d.isOff && !d.isExamDay
                                  ? "border border-[#D6E4FF] bg-[#F7FAFF] hover:border-[#7C5CFC] hover:bg-[#F0EDFF]"
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
                    </div>
                  )}
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto bg-[#F0F5FF] p-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div>
                      <div className="text-[14px] font-semibold">
                        {selectedJurisdictionOption?.name ?? "UBE"} Study Schedule
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-slate-500">
                        Lexora automatically detects the exam system from the jurisdiction and exam date.
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">
                            Jurisdiction
                          </label>
                          <select
                            value={selectedStudyJurisdiction}
                            onChange={(e) =>
                              setSelectedStudyJurisdiction(e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-violet-400"
                          >
                            <option value="UBE">UBE / Uniform Current</option>
                            {JURISDICTION_OPTIONS.map((j) => (
                              <option key={j.code} value={j.code}>
                                {j.name} — {j.group}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-[10px] leading-4 text-slate-500">
                            Current system: {getRegimeLabel(effectiveExamRegime)}
                            {selectedJurisdictionOption?.nextGenStart
                              ? ` • NextGen from ${selectedJurisdictionOption.nextGenStart}`
                              : ""}
                          </div>
                        </div>

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

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">
                            Rule Package
                          </label>
                          <select
                            value={ruleSet}
                            onChange={(e) =>
                              handleRuleSetChange(normalizeRuleSet(e.target.value))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-violet-400"
                          >
                            <option value="core">Core Rules Only</option>
                          </select>
                          <div className="mt-1 text-[10px] leading-4 text-slate-500">
                            Core excludes definition-only expansion rules. Full
                            Rule Bank includes all active rules.
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={studyWeekends}
                            onChange={(e) =>
                              handleStudyWeekendChange(e.target.checked)
                            }
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
                              <PremiumBadge onClick={() => undefined} />
                            )
                          }
                        />

                        <InfoRow
                          label="Remaining Rules"
                          value={
                            <span className="font-semibold">
                              {getPlanTotalRules(planData) || "-"}
                            </span>
                          }
                        />

                        <InfoRow
                          label="Rule Package"
                          value={<span className="font-semibold">Core</span>}
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
                          label="Manual Days Off"
                          value={
                            <span className="font-semibold">
                              {planData?.offDates?.length ?? 0}
                            </span>
                          }
                        />

                        <InfoRow
                          label="Manual Weekend Study Days"
                          value={
                            <span className="font-semibold">
                              {planData?.onDates?.length ?? 0}
                            </span>
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#D6E4FF] bg-[#F0F5FF] p-4 shadow-sm">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F9CC0]">
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

                      <div>
                        <div className="text-[13px] font-semibold text-slate-900">
                          {getRegimeLabel(effectiveExamRegime)}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[#7F9CC0]">
                          {examDate ? formatShortDate(new Date(examDate)) : "No exam date"}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                          <Flame size={11} />
                          {weeksUntilExam} weeks left
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#D6E4FF] bg-[#F0F5FF] p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F9CC0]">
                        Subject Progress
                      </div>
                      <div className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#3C3489]">
                        {effectiveSubjectPlan.length} subjects
                      </div>
                    </div>

                    <div className="space-y-2">
                      {visibleSubjectPlan.map((subject) => {
                        const pct = getSubjectProgressPercent(subject.name)

                        return (
                          <div key={`${subject.system}-${subject.name}`} className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#7C5CFC]" />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                              {subject.name}
                            </span>
                            <div className="h-[4px] w-16 overflow-hidden rounded-full bg-[#D6E4FF]">
                              <div
                                className="h-full rounded-full bg-[#7C5CFC]"
                                style={{
                                  width: `${Math.max(4, Math.min(pct, 100))}%`,
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
                  </div>

                  <div className="rounded-[24px] border border-[#D6E4FF] bg-white p-4 shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Rules mastered
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-[#7C5CFC]">
                            {rulesMasteredCount} / {totalPlanRules}
                          </span>
                        </div>
                        <div className="h-[7px] overflow-hidden rounded-full bg-[#E8EFFF]">
                          <div
                            className="relative h-full overflow-hidden rounded-full bg-[#7C5CFC] shadow-[0_0_14px_rgba(124,92,252,0.55)] transition-all duration-1000 ease-out before:absolute before:inset-0 before:translate-x-[-100%] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] before:animate-[progressShimmer_2s_ease-in-out_infinite]"
                            style={{ width: `${rulesMasteredPercent}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Study days
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-amber-700">
                            {studyDayStats.completedStudyDays} / {studyDayStats.totalStudyDays}
                          </span>
                        </div>
                        <div className="h-[7px] overflow-hidden rounded-full bg-[#E8EFFF]">
                          <div
                            className="relative h-full overflow-hidden rounded-full bg-[#EF9F27] shadow-[0_0_14px_rgba(239,159,39,0.5)] transition-all duration-1000 ease-out before:absolute before:inset-0 before:translate-x-[-100%] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] before:animate-[progressShimmer_2s_ease-in-out_infinite]"
                            style={{ width: `${studyDaysPercent}%` }}
                          />
                        </div>
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
                            {todaySpacedReviews}
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
                            <PremiumBadge onClick={() => undefined} />
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
            Coming Soon
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
            Coming Soon
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
            MBE state comparison coming soon
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
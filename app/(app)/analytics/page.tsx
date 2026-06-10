"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Lock,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

type DashboardData = {
  bllScore: number
  ruleAttempts: number
  prevBLL: number
}

type TrendPoint = {
  date: string
  bll: number
}

type BLLSubjectStat = {
  name: string
  accuracy: number
  completed: number
  total: number
}

type WeakArea = {
  id?: string
  ruleId?: string
  subject: string
  topic?: string
  subtopic?: string
  rule?: string
  title?: string
  accuracy?: number
  attempts?: number
  priority?: number
  mastery?: number
  needsPractice?: boolean
}

type SubscriptionTier = "free" | "bll-monthly" | "premium" | string

type ProfileData = {
  subscription_tier?: SubscriptionTier
  billing_status?: string
}

type TabKey =
  | "overview"
  | "learning"
  | "rules"
  | "time"
  | "strengths"
  | "history"

type SubjectDiagnostic = {
  name: string
  accuracy: number
  completed: number
  total: number
}

type ForecastPoint = {
  day: string
  followPlan: number
  consistent: number
  ignoreWeak: number
}

type RiskBuckets = {
  safe: SubjectDiagnostic[]
  maintenance: SubjectDiagnostic[]
  high: SubjectDiagnostic[]
  critical: SubjectDiagnostic[]
}

const ALL_BLL_SUBJECTS = [
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

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "learning", label: "Learning Insights" },
  { key: "rules", label: "Rule Analytics" },
  { key: "time", label: "Time Analysis" },
  { key: "strengths", label: "Strengths & Weaknesses" },
  { key: "history", label: "Progress History" },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free")
  const [billingStatus, setBillingStatus] = useState("free")

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [bllSubjects, setBLLSubjects] = useState<BLLSubjectStat[]>([])
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])

  const [range, setRange] = useState("30d")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setLoadingUser(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)

        const profileRes = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (profileRes.ok) {
          const profile: ProfileData = await profileRes.json()
          setSubscriptionTier(profile?.subscription_tier || "free")
          setBillingStatus(profile?.billing_status || "free")
        }
      } catch (error) {
        console.error("LOAD USER ERROR:", error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    async function loadAnalytics() {
      if (!userId) return

      try {
        const [dashRes, bllRes, weakRes] = await Promise.all([
          fetch(`/api/dashboard-analytics?userId=${userId}`, {
            cache: "no-store",
          }),
          fetch(`/api/bll-subject-analytics?userId=${userId}`, {
            cache: "no-store",
          }),
          fetch(`/api/weak-areas?userId=${userId}`, {
            cache: "no-store",
          }),
        ])

        const dashData = await dashRes.json()
        const bllData = await bllRes.json()
        const weakData = await weakRes.json()

        setDashboard(dashData)
        setBLLSubjects(Array.isArray(bllData?.subjects) ? bllData.subjects : [])
        setWeakAreas(Array.isArray(weakData?.weakAreas) ? weakData.weakAreas : [])
      } catch (error) {
        console.error("Analytics load error:", error)
      }
    }

    loadAnalytics()
  }, [userId])

  useEffect(() => {
    async function loadTrend() {
      if (!userId) return

      try {
        let url = `/api/trend-analytics?userId=${userId}&range=${range}`

        if (range === "custom") {
          if (!startDate || !endDate) {
            setTrend([])
            return
          }

          url = `/api/trend-analytics?userId=${userId}&start=${startDate}&end=${endDate}`
        }

        const res = await fetch(url, {
          cache: "no-store",
        })
        const data = await res.json()

        setTrend(Array.isArray(data?.trend) ? data.trend : [])
      } catch (error) {
        console.error("Trend analytics load error:", error)
        setTrend([])
      }
    }

    loadTrend()
  }, [userId, range, startDate, endDate])

  if (loadingUser || !userId) {
    return <LoadingState text="Loading analytics..." />
  }

  if (!dashboard) {
    return <LoadingState text="Preparing analytics..." />
  }

  const hasActivePaidAccess =
    billingStatus === "active" || billingStatus === "trialing"

  const isPremium = hasActivePaidAccess && subscriptionTier === "premium"
  const isBLL =
    hasActivePaidAccess &&
    (subscriptionTier === "bll-monthly" || subscriptionTier === "premium")

  const canUseBLLAnalytics = isBLL || isPremium
  const canUsePremiumAnalytics = isPremium

  const tierLabel = isPremium ? "Premium" : isBLL ? "Black Letter Law" : "Free"

  const chartData = trend.map((item) => ({
    date: shortDateLabel(item.date),
    score: safeNumber(item.bll),
  }))

  const activeTrend = chartData.filter((item) => item.score > 0)
  const currentScore = activeTrend.at(-1)?.score ?? safeNumber(dashboard.bllScore)
  const previousScore =
    activeTrend.length > 1
      ? activeTrend.at(-2)?.score ?? currentScore
      : safeNumber(dashboard.prevBLL)

  const delta = currentScore - previousScore

  const subjects = buildSubjectDiagnostics(bllSubjects)
  const attemptedSubjects = subjects.filter((subject) => subject.completed > 0)
  const strongSubjects = attemptedSubjects.filter((subject) => subject.accuracy >= 75)
  const weakSubjects = attemptedSubjects.filter(
    (subject) => subject.accuracy > 0 && subject.accuracy < 70
  )
  const strongestSubject = [...attemptedSubjects].sort(
    (a, b) => b.accuracy - a.accuracy
  )[0]
  const weakestSubject = [...attemptedSubjects].sort(
    (a, b) => a.accuracy - b.accuracy
  )[0]
  const primaryWeakArea = weakAreas[0]
  const riskBuckets = buildRiskBuckets(subjects)
  const forecast = buildForecast(currentScore, delta, weakAreas.length)
  const consistencyScore = buildConsistencyScore(chartData)

  return (
    <main className="min-h-screen select-none bg-white px-5 py-5 text-[#0a1038] md:px-6">
      <div className="w-full space-y-4">
        <header className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-medium tracking-[-0.03em] text-[#060b2b]">
                Analytics
              </h1>
              <span className="rounded-md bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                {tierLabel}
              </span>
            </div>
            <p className="mt-2 text-[13px] font-normal text-[#425274]">
              Deep insights to help you master Black Letter Law.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e5e8f0] bg-white px-3 text-[12px] font-normal text-[#0c123a] shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <CalendarDays size={15} className="text-[#1b2452]" />
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-8 bg-transparent text-[12px] font-normal outline-none"
              >
                <option value="today">Today</option>
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
                <option value="30d">30 days</option>
                <option value="90d">3 months</option>
                <option value="custom">Custom</option>
              </select>

              {range === "custom" ? (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-8 rounded-md border border-[#e5e8f0] bg-white px-2 text-[11px] outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-8 rounded-md border border-[#e5e8f0] bg-white px-2 text-[11px] outline-none"
                  />
                </>
              ) : null}
            </div>

            <button
              type="button"
              disabled
              className="flex h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-[#e5e8f0] bg-white px-4 text-[12px] font-normal text-[#6c7897] shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
            >
              <Download size={15} />
              Export Report
              <Lock size={12} />
            </button>
          </div>
        </header>

        <nav className="flex items-center gap-7 border-b border-[#edf0f6]">
          {TABS.map((tab) => {
            const active = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-4 text-[12px] font-normal transition-all duration-300 ${
                  active ? "text-violet-700" : "text-[#11183d] hover:text-violet-700"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-violet-700 transition-all duration-300 ${
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </button>
            )
          })}
        </nav>

        {activeTab === "overview" ? (
          <Overview
            dashboard={dashboard}
            chartData={chartData}
            currentScore={currentScore}
            delta={delta}
            canUseBLLAnalytics={canUseBLLAnalytics}
            canUsePremiumAnalytics={canUsePremiumAnalytics}
            strongSubjects={strongSubjects}
            weakSubjects={weakSubjects}
            strongestSubject={strongestSubject}
            weakestSubject={weakestSubject}
            weakAreas={weakAreas}
            primaryWeakArea={primaryWeakArea}
            forecast={forecast}
            riskBuckets={riskBuckets}
            consistencyScore={consistencyScore}
          />
        ) : (
          <TabPlaceholder
            title={TABS.find((tab) => tab.key === activeTab)?.label || "Analytics"}
            canUseBLLAnalytics={canUseBLLAnalytics}
          />
        )}

        <footer className="flex min-h-10 items-center justify-between rounded-xl bg-violet-50 px-5 py-3 text-[12px] font-normal text-[#3b2b8f]">
          <div className="flex items-center gap-2">
            <Sparkles size={15} />
            <span>
              Insights are updated daily based on your activity. The more consistent you are, the smarter Lexora gets.
            </span>
          </div>
          <div className="hidden items-center gap-2 font-normal md:flex">
            <span>How insights work</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 text-[11px]">
              ?
            </span>
            <ArrowRight size={15} />
          </div>
        </footer>
      </div>
    </main>
  )
}

function Overview({
  dashboard,
  chartData,
  currentScore,
  delta,
  canUseBLLAnalytics,
  canUsePremiumAnalytics,
  strongSubjects,
  weakSubjects,
  strongestSubject,
  weakestSubject,
  weakAreas,
  primaryWeakArea,
  forecast,
  riskBuckets,
  consistencyScore,
}: {
  dashboard: DashboardData
  chartData: Array<{ date: string; score: number }>
  currentScore: number
  delta: number
  canUseBLLAnalytics: boolean
  canUsePremiumAnalytics: boolean
  strongSubjects: SubjectDiagnostic[]
  weakSubjects: SubjectDiagnostic[]
  strongestSubject?: SubjectDiagnostic
  weakestSubject?: SubjectDiagnostic
  weakAreas: WeakArea[]
  primaryWeakArea?: WeakArea
  forecast: ForecastPoint[]
  riskBuckets: RiskBuckets
  consistencyScore: number
}) {
  const router = useRouter()
  const weakCountDelta = weakAreas.length > 0 ? weakAreas.length : 0

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-[#d9d0ff] bg-gradient-to-br from-[#f1eaff] via-white to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-violet-200/35 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[13px] font-normal text-[#10163f]">
              BLL Readiness Score
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-400">
                i
              </span>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-[52px] font-normal leading-none tracking-[-0.06em] text-violet-700">
                  {currentScore}%
                </div>
                <div
                  className={`mt-4 text-[12px] font-normal ${
                    delta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} pts vs previous active day
                </div>
              </div>

              <div className="h-[86px] w-[145px]">
                <MiniSparkline data={chartData} stroke="#7c3aed" />
              </div>
            </div>
          </div>
        </div>

        <KpiCard icon={<Target size={18} />} title="BLL Score" value={`${safeNumber(dashboard.bllScore)}%`} delta={delta} tone="violet" />
        <KpiCard icon={<FileText size={18} />} title="Rule Attempts" value={safeNumber(dashboard.ruleAttempts).toLocaleString()} delta={safeNumber(dashboard.ruleAttempts)} tone="blue" />
        <KpiCard icon={<CheckCircle2 size={18} />} title="Accuracy" value={`${currentScore}%`} delta={delta} tone="green" />
        <KpiCard icon={<AlertTriangle size={18} />} title="Weak Areas" value={weakAreas.length} delta={weakCountDelta} tone="red" negative />
        <KpiCard icon={<CalendarDays size={18} />} title="Consistency Score" value={`${consistencyScore} / 5`} delta={consistencyScore} tone="purple" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_1.05fr_0.85fr]">
        <GlassCard title="AI Executive Summary" badge="Lexora AI">
          {canUsePremiumAnalytics ? (
            <div>
              <h2 className="text-[18px] font-normal leading-[1.35] tracking-[-0.03em] text-[#0a1038]">
                AI insight engine is not connected yet.
              </h2>

              <div className="mt-7 grid grid-cols-4 gap-4">
                <SummaryMini icon={<TrendingUp size={22} />} title="Main Progress" text={delta >= 0 ? `Your score improved by ${Math.abs(delta)} points recently.` : `Your score dropped by ${Math.abs(delta)} points recently.`} tone="green" />
                <SummaryMini icon={<ShieldCheck size={22} />} title="Biggest Strength" text={strongestSubject ? `${strongestSubject.name} is your strongest subject.` : "No strength confirmed yet."} tone="green" />
                <SummaryMini icon={<AlertTriangle size={22} />} title="Biggest Weakness" text={weakestSubject ? `${weakestSubject.name} needs the most attention.` : "No weak subject confirmed yet."} tone="red" />
                <SummaryMini icon={<Target size={22} />} title="Recommendation" text={primaryWeakArea ? `Focus on ${primaryWeakArea.subject}.` : "Complete more rules for a recommendation."} tone="purple" />
              </div>

              <div className="mt-6 rounded-xl bg-violet-50 p-4">
                <div className="mb-3 text-[12px] font-normal text-[#11183d]">
                  AI Performance Snapshot
                </div>
                <div className="grid grid-cols-4 items-stretch gap-3">
                  <SnapshotMetric label="Accuracy" value={`${currentScore}%`} />
                  <SnapshotMetric label="Strong Areas" value={strongSubjects.length} />
                  <SnapshotMetric label="Consistency" value={`${consistencyScore} / 5`} />
                  <SnapshotMetric label="Weak Risk" value={weakAreas.length > 0 ? "High" : "Low"} danger={weakAreas.length > 0} />
                </div>
              </div>
            </div>
          ) : (
            <PremiumInline text="Premium AI summary will appear here after the insight engine is connected." />
          )}
        </GlassCard>

        <GlassCard title="What’s Driving Your Score">
          <div className="grid grid-cols-2 gap-7">
            <div>
              <div className="mb-3 text-[13px] font-normal text-emerald-700">
                Helping Your Score
              </div>
              <DriverRow icon={<BookOpen size={20} />} title={strongestSubject?.name || "No strong subject yet"} text={strongestSubject ? `${strongestSubject.accuracy}% accuracy` : "Complete more rules to calculate strengths."} value={strongestSubject ? `+${strongestSubject.accuracy}%` : "—"} tone="green" />
              <DriverRow icon={<Zap size={20} />} title="Recent score movement" text={delta >= 0 ? "Recent BLL score is moving up." : "Recent BLL score decreased."} value={`${delta >= 0 ? "+" : "-"}${Math.abs(delta)} pts`} tone={delta >= 0 ? "green" : "red"} />
              <DriverRow icon={<CalendarDays size={20} />} title="Consistency" text="Recent activity is used to measure stability." value={`${consistencyScore}/5`} tone="green" />
            </div>

            <div>
              <div className="mb-3 text-[13px] font-normal text-rose-700">
                Hurting Your Score
              </div>
              <DriverRow icon={<Scale size={20} />} title={weakestSubject?.name || "No weak subject yet"} text={weakestSubject ? `${weakestSubject.accuracy}% accuracy` : "Weak subjects appear after more attempts."} value={weakestSubject ? `-${100 - weakestSubject.accuracy}%` : "—"} tone="red" />
              <DriverRow icon={<AlertTriangle size={20} />} title={primaryWeakArea?.rule || primaryWeakArea?.title || "No weak rule yet"} text={primaryWeakArea?.subject || "Weak rules appear after repeated low recall."} value={primaryWeakArea?.accuracy !== undefined ? `${primaryWeakArea.accuracy}%` : "—"} tone="red" />
              <DriverRow icon={<Clock3 size={20} />} title="Unstable rules" text="Rules below 70% accuracy need repeated recall." value={weakAreas.length.toString()} tone="red" />
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Next Best Move" icon={<Rocket size={18} className="text-violet-700" />}>
          {primaryWeakArea ? (
            <div className="space-y-4">
              <StepCard step="1" title={`Review ${primaryWeakArea.subject}`} subtitle={primaryWeakArea.rule || primaryWeakArea.title || primaryWeakArea.topic || "Focus on rules, exceptions, and common mistakes."} time="25 min" />
              <StepCard step="2" title="Then do targeted rule recall" subtitle="Repeat the rule until recall becomes stable." time="10 min" />
              <button
                type="button"
                onClick={() => router.push("/rule-training")}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 text-[13px] font-normal text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-800"
              >
                Start Recommended Session
                <ArrowRight size={15} />
              </button>
              <p className="text-center text-[12px] font-normal text-slate-500">
                Estimated time: 35 minutes
              </p>
            </div>
          ) : (
            <EmptyCompact text="Complete more rule training to generate your next best move." />
          )}
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <GlassCard title="7-Day Improvement Forecast">
          {canUseBLLAnalytics && chartData.some((point) => point.score > 0) ? (
            <div className="grid grid-cols-[1fr_190px] gap-4">
              <div className="h-[235px]">
                <ResponsiveContainer>
                  <AreaChart data={forecast}>
                    <defs>
                      <linearGradient id="followPlanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor="#7c3aed" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="consistentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor="#0ea5e9" stopOpacity={0.11} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="ignoreWeakGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor="#f43f5e" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef1f6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 400 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 400 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ForecastTooltip />} />
                    <Area name="If you follow the plan" type="monotone" dataKey="followPlan" stroke="#7c3aed" strokeWidth={2} fill="url(#followPlanGradient)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} />
                    <Area name="If you stay consistent" type="monotone" dataKey="consistent" stroke="#0ea5e9" strokeWidth={2} fill="url(#consistentGradient)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} />
                    <Area name="If you ignore weak areas" type="monotone" dataKey="ignoreWeak" stroke="#f43f5e" strokeWidth={2} fill="url(#ignoreWeakGradient)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4 pt-5 text-[12px] font-normal">
                <LegendLine color="bg-violet-700" label="If you follow the plan" value={`${forecast.at(-1)?.followPlan ?? currentScore}%`} />
                <LegendLine color="bg-sky-500" label="If you stay consistent" value={`${forecast.at(-1)?.consistent ?? currentScore}%`} />
                <LegendLine color="bg-rose-500" label="If you ignore weak areas" value={`${forecast.at(-1)?.ignoreWeak ?? currentScore}%`} />
              </div>
            </div>
          ) : (
            <EmptyCompact text="Complete more BLL training to generate a real forecast." />
          )}
        </GlassCard>

        <GlassCard title="Subject Risk Map">
          {canUseBLLAnalytics ? (
            <RiskMap buckets={riskBuckets} />
          ) : (
            <PremiumInline text="Upgrade to Black Letter Law Monthly to unlock subject risk analytics." />
          )}
        </GlassCard>
      </section>
    </div>
  )
}

function TabPlaceholder({
  title,
  canUseBLLAnalytics,
}: {
  title: string
  canUseBLLAnalytics: boolean
}) {
  return (
    <GlassCard title={title}>
      {canUseBLLAnalytics ? (
        <EmptyCompact text="This tab will use the same approved visual system. No fake analytics will be shown here until real backend data exists." />
      ) : (
        <PremiumInline text="Upgrade to unlock this analytics tab." />
      )}
    </GlassCard>
  )
}

function buildSubjectDiagnostics(subjects: BLLSubjectStat[]): SubjectDiagnostic[] {
  return ALL_BLL_SUBJECTS.map((name) => {
    const subject = subjects.find((item) => item.name === name)

    return {
      name,
      accuracy: safeNumber(subject?.accuracy),
      completed: safeNumber(subject?.completed),
      total: safeNumber(subject?.total),
    }
  })
}

function buildRiskBuckets(subjects: SubjectDiagnostic[]): RiskBuckets {
  const attempted = subjects.filter((subject) => subject.completed > 0)

  return {
    safe: attempted.filter((subject) => subject.accuracy >= 80),
    maintenance: attempted.filter((subject) => subject.accuracy >= 70 && subject.accuracy < 80),
    high: attempted.filter((subject) => subject.accuracy >= 60 && subject.accuracy < 70),
    critical: attempted.filter((subject) => subject.accuracy > 0 && subject.accuracy < 60),
  }
}

function buildConsistencyScore(chartData: Array<{ date: string; score: number }>) {
  const activeDays = chartData.filter((point) => point.score > 0).slice(-7).length
  return Math.max(0, Math.min(5, Number(((activeDays / 7) * 5).toFixed(1))))
}

function buildForecast(currentScore: number, delta: number, weakAreaCount: number): ForecastPoint[] {
  const base = Math.max(0, Math.min(100, currentScore || 0))
  const positiveDelta = Math.max(1, Math.min(4, Math.abs(delta || 1)))
  const weakPenalty = weakAreaCount > 0 ? 2 : 1

  return Array.from({ length: 7 }).map((_, index) => {
    const day = index === 0 ? "Today" : `Day ${index}`
    const followPlan = Math.min(100, Math.round(base + index * positiveDelta))
    const consistent = Math.min(100, Math.round(base + index * Math.max(1, positiveDelta / 2)))
    const ignoreWeak = Math.max(0, Math.round(base - index * weakPenalty))

    return {
      day,
      followPlan,
      consistent,
      ignoreWeak,
    }
  })
}

function safeNumber(value: unknown) {
  const numberValue = Number(value ?? 0)
  if (!Number.isFinite(numberValue)) return 0
  return Math.max(0, Math.round(numberValue))
}

function shortDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function rangeLabel(range: string) {
  if (range === "today") return "Today"
  if (range === "7d") return "Last 7 days"
  if (range === "14d") return "Last 14 days"
  if (range === "30d") return "Last 30 days"
  if (range === "90d") return "Last 3 months"
  if (range === "custom") return "Custom range"
  return "All time"
}

function LoadingState({ text }: { text: string }) {
  return (
    <main className="min-h-screen bg-white p-6">
      <div className="rounded-xl border border-[#e5e9f3] bg-white p-5 text-sm font-normal text-slate-500 shadow-sm">
        {text}
      </div>
    </main>
  )
}

function GlassCard({
  title,
  subtitle,
  badge,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#e2e7f1] bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-[16px] font-normal tracking-[-0.02em] text-[#070c2d]">
              {title}
            </h2>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-normal text-slate-400">
              i
            </span>
          </div>

          {subtitle ? (
            <p className="mt-1 text-[12px] font-normal leading-5 text-[#5d6a87]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {badge ? (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-normal text-violet-700">
            {badge}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  )
}

function KpiCard({
  icon,
  title,
  value,
  delta,
  tone,
  negative = false,
}: {
  icon: ReactNode
  title: string
  value: string | number
  delta?: number
  tone: "violet" | "blue" | "green" | "red" | "purple"
  negative?: boolean
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-600"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-600"
        : tone === "red"
          ? "bg-rose-50 text-rose-600"
          : "bg-violet-50 text-violet-700"

  return (
    <div className="rounded-2xl border border-[#e3e8f3] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>

      <div className="text-[12px] font-normal text-[#11183d]">
        {title}
      </div>

      <div className="mt-2 text-[26px] font-normal tracking-[-0.04em] text-[#070c2d]">
        {value}
      </div>

      <div className={`mt-3 text-[12px] font-normal ${negative ? "text-rose-600" : "text-emerald-600"}`}>
        {typeof delta === "number" ? `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}` : "Real data"}
      </div>

      <div className="mt-1 text-[11px] font-normal text-slate-500">
        vs previous period
      </div>
    </div>
  )
}

function SummaryMini({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode
  title: string
  text: string
  tone: "green" | "red" | "purple"
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-rose-600"
        : "text-violet-700"

  return (
    <div className="border-r border-slate-100 last:border-r-0">
      <div className={toneClass}>{icon}</div>
      <div className={`mt-3 text-[11px] font-normal ${toneClass}`}>
        {title}
      </div>
      <p className="mt-2 pr-3 text-[11px] font-normal leading-5 text-[#52617f]">
        {text}
      </p>
      <button type="button" className="mt-3 text-[11px] font-normal text-violet-700">
        View details →
      </button>
    </div>
  )
}

function SnapshotMetric({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string | number
  danger?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] font-normal text-slate-500">{label}</div>
      <div className={`mt-1 text-[14px] font-normal ${danger ? "text-rose-600" : "text-[#10163f]"}`}>
        {value}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-200">
        <div className={`h-1.5 w-2/3 rounded-full ${danger ? "bg-rose-500" : "bg-violet-700"}`} />
      </div>
    </div>
  )
}

function DriverRow({
  icon,
  title,
  text,
  value,
  tone,
}: {
  icon: ReactNode
  title: string
  text: string
  value: string
  tone: "green" | "red"
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-rose-50 text-rose-600"

  return (
    <div className="mb-4 flex items-start gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[12px] font-normal leading-5 text-[#11183d]">
            {title}
          </div>
          <div className={`text-[12px] font-normal ${tone === "green" ? "text-emerald-600" : "text-rose-600"}`}>
            {value}
          </div>
        </div>

        <p className="mt-1 text-[11px] font-normal leading-4 text-[#66728e]">
          {text}
        </p>

        <div className="mt-2 h-1.5 rounded-full bg-slate-200">
          <div className={`h-1.5 w-4/5 rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-rose-500"}`} />
        </div>
      </div>
    </div>
  )
}

function StepCard({
  step,
  title,
  subtitle,
  time,
}: {
  step: string
  title: string
  subtitle: string
  time: string
}) {
  return (
    <div className="rounded-xl bg-violet-50 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-700 text-lg font-normal text-white">
          {step}
        </div>

        <div>
          <div className="text-[13px] font-normal leading-5 text-[#11183d]">
            {title}
          </div>

          <span className="mt-2 inline-flex rounded-md bg-violet-200 px-2 py-0.5 text-[11px] font-normal text-violet-700">
            {time}
          </span>

          <p className="mt-3 text-[12px] font-normal leading-5 text-[#5d6882]">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

function MiniSparkline({
  data,
  stroke,
}: {
  data: Array<{ date: string; score: number }>
  stroke: string
}) {
  const sparkData = data.filter((item) => item.score > 0).slice(-8)

  if (sparkData.length === 0) {
    return <div className="h-full rounded-xl bg-white/60" />
  }

  return (
    <ResponsiveContainer>
      <AreaChart data={sparkData}>
        <Area type="monotone" dataKey="score" stroke={stroke} strokeWidth={2.5} fill="#ede9fe" fillOpacity={0.28} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function RiskMap({ buckets }: { buckets: RiskBuckets }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <RiskColumn title="Safe" text="Strong performance. Keep it up!" tone="green" items={buckets.safe} button="Maintain" />
      <RiskColumn title="Needs Maintenance" text="Performing well, but needs consistent review." tone="yellow" items={buckets.maintenance} button="Review this week" />
      <RiskColumn title="High Risk" text="Focus soon to prevent further score impact." tone="orange" items={buckets.high} button="Focus soon" />
      <RiskColumn title="Critical" text="Immediate focus recommended." tone="red" items={buckets.critical} button="Start today" />
    </div>
  )
}

function RiskColumn({
  title,
  text,
  tone,
  items,
  button,
}: {
  title: string
  text: string
  tone: "green" | "yellow" | "orange" | "red"
  items: SubjectDiagnostic[]
  button: string
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "yellow"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "orange"
          ? "border-orange-100 bg-orange-50 text-orange-700"
          : "border-rose-100 bg-rose-50 text-rose-700"

  return (
    <div className={`flex h-full min-h-[205px] flex-col rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[13px] font-normal">
        <CheckCircle2 size={16} />
        {title}
      </div>

      <p className="mt-2 min-h-[35px] text-[11px] font-normal leading-5">
        {text}
      </p>

      <div className="mt-3 min-h-[70px] flex-1 space-y-2">
        {items.length === 0 ? (
          <div className="text-[11px] font-normal opacity-70">No subjects yet.</div>
        ) : (
          items.slice(0, 3).map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-[12px] font-normal text-[#11183d]">
              <span>{item.name}</span>
              <span>{item.accuracy}%</span>
            </div>
          ))
        )}
      </div>

      <button type="button" className="mt-auto h-9 w-full rounded-lg border border-current bg-white/50 text-[12px] font-normal">
        {button}
      </button>
    </div>
  )
}

function LegendLine({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <div>
        <div className="text-[#11183d]">{label}</div>
        <div className="text-violet-700">{value}</div>
      </div>
    </div>
  )
}

function PremiumInline({ text }: { text: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50 p-5 text-center">
      <div>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-violet-700">
          <Lock size={18} />
        </div>
        <div className="mt-3 text-[13px] font-normal text-[#11183d]">Upgrade required</div>
        <p className="mx-auto mt-2 max-w-sm text-[12px] font-normal leading-5 text-[#5b6680]">{text}</p>
      </div>
    </div>
  )
}

function EmptyCompact({ text }: { text: string }) {
  return (
    <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-[12px] font-normal leading-5 text-slate-500">
      {text}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-xs font-normal text-[#11183d]">{label}</div>
      <div className="mt-1 text-xs font-normal text-violet-700">
        BLL Accuracy: {payload[0]?.value ?? 0}%
      </div>
    </div>
  )
}

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-xs font-normal text-[#11183d]">{label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="mt-1 text-xs font-normal" style={{ color: item.color }}>
          {item.name || item.dataKey}: {item.value}%
        </div>
      ))}
    </div>
  )
}

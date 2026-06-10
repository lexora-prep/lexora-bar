"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Crown,
  Highlighter,
  Keyboard,
  Lock,
  PanelsTopLeft,
  PenLine,
  Sparkles,
  Target,
  TrendingUp,
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

type ModeStats = {
  typing: number
  fillBlank: number
  buzzwords: number
  ordering: number
  flashcard: number
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
  critical?: number
  needsWork?: number
  improving?: number
  mastered?: number
}

type SubscriptionTier = "free" | "bll-monthly" | "premium" | string

type ProfileData = {
  subscription_tier?: SubscriptionTier
  billing_status?: string
}

type SubjectDiagnostic = {
  name: string
  accuracy: number
  completed: number
  total: number
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

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free")
  const [billingStatus, setBillingStatus] = useState("free")

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [bllSubjects, setBLLSubjects] = useState<BLLSubjectStat[]>([])
  const [modeStats, setModeStats] = useState<ModeStats | null>(null)
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
        const [dashRes, bllRes, modeRes, weakRes] = await Promise.all([
          fetch(`/api/dashboard-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/bll-subject-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/bll-mode-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/weak-areas?userId=${userId}`, { cache: "no-store" }),
        ])

        const dashData = await dashRes.json()
        const bllData = await bllRes.json()
        const modeData = await modeRes.json()
        const weakData = await weakRes.json()

        setDashboard(dashData)
        setBLLSubjects(Array.isArray(bllData?.subjects) ? bllData.subjects : [])
        setModeStats(modeData ?? null)
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
    return <LoadingState text="Preparing your analytics..." />
  }

  const hasActivePaidAccess =
    billingStatus === "active" || billingStatus === "trialing"

  const isBLL = hasActivePaidAccess && subscriptionTier === "bll-monthly"
  const isPremium = hasActivePaidAccess && subscriptionTier === "premium"
  const canUseBLLAnalytics = isBLL || isPremium
  const canUsePremiumAnalytics = isPremium

  const tierLabel = isPremium
    ? "Premium"
    : isBLL
      ? "Blackletter Law Monthly"
      : "Free"

  const chartData = trend.map((item) => ({
    date: shortDateLabel(item.date),
    score: Number(item.bll ?? 0),
  }))

  const subjectDiagnostics = buildSubjectDiagnostics(bllSubjects)
  const attemptedSubjects = subjectDiagnostics.filter((item) => item.completed > 0)

  const strongestSubject = [...attemptedSubjects].sort(
    (a, b) => b.accuracy - a.accuracy
  )[0]

  const weakestSubject = [...attemptedSubjects].sort(
    (a, b) => a.accuracy - b.accuracy
  )[0]

  const fourDayCheckIn = buildFourDayCheckIn(trend)
  const modeRows = buildModeRows(modeStats)

  const bestMode = [...modeRows]
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)[0]

  const weakestMode = [...modeRows]
    .filter((row) => row.value > 0)
    .sort((a, b) => a.value - b.value)[0]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_32%),linear-gradient(180deg,#f8fafc,#ffffff)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-out">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
                <Activity size={13} />
                Performance intelligence
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                Analytics
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track Blackletter Law performance, subject accuracy, training-mode behavior, and weak areas from your real study activity.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Current access
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                {isPremium ? (
                  <Crown size={16} className="text-amber-500" />
                ) : (
                  <Lock size={15} className="text-violet-500" />
                )}
                {tierLabel}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="BLL Score"
            value={`${safeNumber(dashboard.bllScore)}%`}
            description="Average score from rule training attempts."
            delta={safeNumber(dashboard.bllScore) - safeNumber(dashboard.prevBLL)}
          />

          <MetricCard
            title="Rule Attempts"
            value={safeNumber(dashboard.ruleAttempts).toLocaleString()}
            description="Total Blackletter Law attempts recorded."
          />

          <MetricCard
            title="Strongest Subject"
            value={strongestSubject?.name || "No data yet"}
            description={
              strongestSubject
                ? `${strongestSubject.accuracy}% accuracy`
                : "Complete more rules to calculate this."
            }
            locked={!canUseBLLAnalytics}
          />

          <MetricCard
            title="Weakest Subject"
            value={weakestSubject?.name || "No data yet"}
            description={
              weakestSubject
                ? `${weakestSubject.accuracy}% accuracy`
                : "Complete more rules to calculate this."
            }
            locked={!canUseBLLAnalytics}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.95fr]">
          <AnalyticsCard
            title="BLL Accuracy Trend"
            subtitle="Real trend from your Blackletter Law attempts."
            badge="BLL"
            locked={!canUseBLLAnalytics}
            lockText="Upgrade to Blackletter Law Monthly to unlock trend analytics."
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <RangeBtn label="Today" value="today" range={range} setRange={setRange} />
              <RangeBtn label="7D" value="7d" range={range} setRange={setRange} />
              <RangeBtn label="14D" value="14d" range={range} setRange={setRange} />
              <RangeBtn label="30D" value="30d" range={range} setRange={setRange} />
              <RangeBtn label="3M" value="90d" range={range} setRange={setRange} />
              <RangeBtn label="Custom" value="custom" range={range} setRange={setRange} />
            </div>

            {range === "custom" && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            )}

            <div className="h-[280px]">
              {chartData.length === 0 ? (
                <EmptyState text="No trend data yet. Complete BLL training attempts to populate this chart." />
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bllAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="BLL Accuracy"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      fill="url(#bllAccuracyGradient)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="4-Day Check-In"
            subtitle="Short-window performance pulse from recent activity."
            badge="Real data"
            locked={!canUseBLLAnalytics}
            lockText="Upgrade to Blackletter Law Monthly to unlock short-window performance checks."
          >
            {fourDayCheckIn.count === 0 ? (
              <EmptyState text="No recent BLL trend data yet." />
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-500">
                    Recent average
                  </div>

                  <div className="mt-2 text-4xl font-semibold tracking-tight text-violet-700">
                    {fourDayCheckIn.average}%
                  </div>

                  <div className="mt-2 text-sm text-violet-700/80">
                    Based on {fourDayCheckIn.count} day{fourDayCheckIn.count === 1 ? "" : "s"} with activity.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp
                      size={18}
                      className={fourDayCheckIn.delta >= 0 ? "text-emerald-500" : "text-rose-500"}
                    />

                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {fourDayCheckIn.delta >= 0 ? "Improving recently" : "Recent drop detected"}
                      </div>

                      <div className="mt-1 text-sm leading-6 text-slate-500">
                        {fourDayCheckIn.delta >= 0
                          ? `Your recent BLL score is up by ${Math.abs(fourDayCheckIn.delta)} points compared with the previous active point.`
                          : `Your recent BLL score is down by ${Math.abs(fourDayCheckIn.delta)} points compared with the previous active point.`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnalyticsCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <AnalyticsCard
            title="Subject Diagnostics"
            subtitle="Accuracy and completion by Blackletter Law subject."
            badge="BLL"
            locked={!canUseBLLAnalytics}
            lockText="Upgrade to Blackletter Law Monthly to unlock subject diagnostics."
          >
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {subjectDiagnostics.map((subject) => (
                <SubjectRow
                  key={subject.name}
                  label={subject.name}
                  value={subject.accuracy}
                  secondary={`${subject.completed} / ${subject.total} rules touched`}
                />
              ))}
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="Training Mode Performance"
            subtitle="Accuracy by study interaction type."
            badge="BLL"
            locked={!canUseBLLAnalytics}
            lockText="Upgrade to Blackletter Law Monthly to unlock training mode analytics."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {modeRows.map((mode) => (
                <ModeCard
                  key={mode.title}
                  icon={mode.icon}
                  title={mode.title}
                  percent={`${mode.value}%`}
                  caption="accuracy"
                  tone={mode.tone}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InsightLine
                icon={<Target size={17} />}
                title="Best mode"
                text={
                  bestMode
                    ? `${bestMode.title} is currently your strongest mode at ${bestMode.value}%.`
                    : "Not enough training mode data yet."
                }
              />

              <InsightLine
                icon={<AlertTriangle size={17} />}
                title="Needs attention"
                text={
                  weakestMode
                    ? `${weakestMode.title} is currently your lowest mode at ${weakestMode.value}%.`
                    : "Not enough training mode data yet."
                }
              />
            </div>
          </AnalyticsCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.95fr]">
          <AnalyticsCard
            title="Weak Areas Snapshot"
            subtitle="Real weak-area records from rule progress."
            badge="BLL"
            locked={!canUseBLLAnalytics}
            lockText="Upgrade to Blackletter Law Monthly to unlock weak-area analytics."
          >
            {weakAreas.length === 0 ? (
              <EmptyState text="No weak areas yet. Weak areas appear after enough rule attempts." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {weakAreas.slice(0, 6).map((item, index) => (
                  <div
                    key={`${item.subject}-${item.ruleId || item.id || index}`}
                    className="group rounded-3xl border border-slate-200 bg-slate-50/80 p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {item.rule || item.title || item.subject}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.subject}
                          {item.topic ? ` • ${item.topic}` : ""}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                        {safeNumber(item.accuracy ?? item.mastery)}%
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Attempts" value={safeNumber(item.attempts)} />
                      <MiniStat label="Priority" value={safeNumber(item.priority)} />
                      <MiniStat label="Mastery" value={safeNumber(item.mastery ?? item.accuracy)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            title="Premium AI Insight"
            subtitle="Reserved for generated AI study guidance."
            badge="Premium"
            locked={!canUsePremiumAnalytics}
            lockText="Premium analytics will include AI-generated direction once the insight engine is connected."
          >
            <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
              <div className="flex items-start gap-3">
                <Sparkles size={20} className="text-amber-600" />

                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    AI insight engine is not connected yet
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This card is intentionally not showing fake AI advice. Once connected, it should generate a real 4-day study direction from subject accuracy, weak areas, trend movement, and training mode performance.
                  </p>
                </div>
              </div>
            </div>
          </AnalyticsCard>
        </section>
      </div>
    </div>
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

function buildModeRows(modeStats: ModeStats | null) {
  return [
    {
      title: "Typing",
      value: safeNumber(modeStats?.typing),
      icon: <Keyboard size={16} />,
      tone: "rose" as const,
    },
    {
      title: "Fill Blank",
      value: safeNumber(modeStats?.fillBlank),
      icon: <PenLine size={16} />,
      tone: "rose" as const,
    },
    {
      title: "Buzzwords",
      value: safeNumber(modeStats?.buzzwords),
      icon: <Highlighter size={16} />,
      tone: "emerald" as const,
    },
    {
      title: "Ordering",
      value: safeNumber(modeStats?.ordering),
      icon: <ArrowUpDown size={16} />,
      tone: "orange" as const,
    },
    {
      title: "Flashcard",
      value: safeNumber(modeStats?.flashcard),
      icon: <PanelsTopLeft size={16} />,
      tone: "violet" as const,
    },
  ]
}

function buildFourDayCheckIn(trend: TrendPoint[]) {
  const activePoints = trend
    .map((item) => ({
      date: item.date,
      score: safeNumber(item.bll),
    }))
    .filter((item) => item.score > 0)
    .slice(-4)

  if (activePoints.length === 0) {
    return {
      count: 0,
      average: 0,
      delta: 0,
    }
  }

  const average = Math.round(
    activePoints.reduce((sum, item) => sum + item.score, 0) / activePoints.length
  )

  const first = activePoints[0]?.score ?? average
  const last = activePoints[activePoints.length - 1]?.score ?? average

  return {
    count: activePoints.length,
    average,
    delta: last - first,
  }
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

function LoadingState({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        {text}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  delta,
  locked = false,
}: {
  title: string
  value: string | number
  description: string
  delta?: number
  locked?: boolean
}) {
  const hasDelta = typeof delta === "number"

  const deltaColor =
    !hasDelta || delta === 0
      ? "text-slate-400"
      : delta > 0
        ? "text-emerald-600"
        : "text-rose-600"

  return (
    <div className="group rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </div>

        {locked ? <Lock size={14} className="text-amber-500" /> : null}
      </div>

      <div className="mt-3 truncate text-2xl font-semibold tracking-tight text-slate-950">
        {locked ? "Locked" : value}
      </div>

      <div className="mt-2 min-h-[36px] text-sm leading-5 text-slate-500">
        {locked ? "Upgrade required to view this metric." : description}
      </div>

      {hasDelta && !locked ? (
        <div className={`mt-3 text-xs font-semibold ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)} pts
        </div>
      ) : null}
    </div>
  )
}

function AnalyticsCard({
  title,
  subtitle,
  badge,
  locked,
  lockText,
  children,
}: {
  title: string
  subtitle: string
  badge: string
  locked?: boolean
  lockText?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_24px_75px_rgba(15,23,42,0.10)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {badge}
        </span>
      </div>

      {locked ? <LockedPanel text={lockText || "Upgrade required."} /> : children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-sm leading-6 text-slate-500">
      {text}
    </div>
  )
}

function SubjectRow({
  label,
  value,
  secondary,
}: {
  label: string
  value: number
  secondary?: string
}) {
  const width = Math.max(0, Math.min(100, value))

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 transition-all duration-300 ease-out hover:border-violet-200 hover:bg-violet-50/30">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">
            {label}
          </div>

          {secondary ? (
            <div className="mt-0.5 text-[11px] text-slate-400">
              {secondary}
            </div>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
          {value}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  percent,
  caption,
  tone,
}: {
  icon: React.ReactNode
  title: string
  percent: string
  caption: string
  tone: "rose" | "emerald" | "orange" | "violet"
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 bg-emerald-50 border-emerald-100"
      : tone === "orange"
        ? "text-orange-600 bg-orange-50 border-orange-100"
        : tone === "violet"
          ? "text-violet-600 bg-violet-50 border-violet-100"
          : "text-rose-600 bg-rose-50 border-rose-100"

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-center transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg">
      <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>
        {icon}
      </div>

      <div className="text-sm font-semibold text-slate-800">
        {title}
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {percent}
      </div>

      <div className="mt-1 text-xs text-slate-400">
        {caption}
      </div>
    </div>
  )
}

function InsightLine({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 transition-all duration-300 ease-out hover:border-violet-200 hover:bg-white">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-violet-600">
          {icon}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">
            {title}
          </div>

          <div className="mt-1 text-sm leading-6 text-slate-500">
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <div className="text-base font-semibold text-slate-900">
        {value}
      </div>

      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
        {label}
      </div>
    </div>
  )
}

function RangeBtn({
  label,
  value,
  range,
  setRange,
}: {
  label: string
  value: string
  range: string
  setRange: (value: string) => void
}) {
  const active = range === value

  return (
    <button
      type="button"
      onClick={() => setRange(value)}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out ${
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  )
}

function LockedPanel({ text }: { text: string }) {
  const router = useRouter()

  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-600">
          <Lock size={18} />
        </div>

        <div className="text-sm font-semibold text-slate-900">
          Upgrade required
        </div>

        <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          {text}
        </div>

        <button
          type="button"
          onClick={() => router.push("/subscription")}
          className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800"
        >
          View plans
        </button>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
      <div className="text-xs font-semibold text-slate-900">
        {label}
      </div>

      <div className="mt-1 text-xs text-violet-600">
        BLL Accuracy: {payload[0]?.value ?? 0}%
      </div>
    </div>
  )
}
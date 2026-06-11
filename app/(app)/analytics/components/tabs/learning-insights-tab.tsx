"use client"

import type { ReactNode } from "react"
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
  Brain,
  CalendarDays,
  Clock3,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type {
  DashboardData,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"
import { GlassCard } from "../shared/glass-card"
import { EmptyCompact } from "../shared/feedback-states"
import {
  ChartTooltip,
  MiniSparkline,
} from "../shared/chart-components"

export default function LearningInsightsTab({
  dashboard,
  chartData,
  currentScore,
  delta,
  canUseBLLAnalytics,
  strongestSubject,
  weakestSubject,
  weakAreas,
  primaryWeakArea,
  consistencyScore,
}: {
  dashboard: DashboardData
  chartData: Array<{ date: string; score: number }>
  currentScore: number
  delta: number
  canUseBLLAnalytics: boolean
  strongestSubject?: SubjectDiagnostic
  weakestSubject?: SubjectDiagnostic
  weakAreas: WeakArea[]
  primaryWeakArea?: WeakArea
  consistencyScore: number
}) {
  const router = useRouter()
  const hasTrendData = chartData.some((point) => point.score > 0)
  const hasLearningData = canUseBLLAnalytics && safeNumber(dashboard.ruleAttempts) > 0

  const learningMessage = strongestSubject
    ? `Your strongest learning signal is ${strongestSubject.name}. Keep using rule recall before moving to new weak areas.`
    : "Start more BLL rule sessions so Lexora can identify how you learn best."

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="relative overflow-hidden rounded-2xl border border-[#dfe6f2] bg-gradient-to-br from-white via-[#fbf8ff] to-[#f5efff] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-2 text-[12px] font-normal text-violet-700">
              <Sparkles size={15} />
              Lexora AI
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Brain size={25} className="text-violet-700" />
              <h2 className="text-[22px] font-medium tracking-[-0.03em] text-[#070b2f]">
                How You Learn Best
              </h2>
            </div>

            <p className="mt-4 max-w-3xl text-[25px] font-normal leading-[1.32] tracking-[-0.045em] text-[#070b2f]">
              Short, focused study sessions with{" "}
              <span className="text-violet-700">active rule recall</span>{" "}
              help you retain rules better.
            </p>

            <p className="mt-4 max-w-2xl text-[14px] font-normal leading-6 text-[#53617e]">
              {learningMessage}
            </p>
          </div>

          <div className="relative flex min-h-[185px] items-center justify-center">
            <div className="absolute h-52 w-52 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="absolute h-56 w-56 rounded-full border border-violet-200/80" />
            <div className="absolute h-36 w-64 -rotate-12 rounded-[100%] border border-violet-300/70" />
            <div className="absolute h-32 w-64 rotate-12 rounded-[100%] border border-violet-200/60" />
            <div className="relative flex h-[132px] w-[132px] items-center justify-center rounded-full bg-gradient-to-br from-violet-300 via-violet-600 to-violet-800 shadow-[0_24px_60px_rgba(124,58,237,0.36)]">
              <Brain size={78} className="text-white drop-shadow-xl" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <LearningTopCard
            icon={<Brain size={25} />}
            label="TOP INSIGHT"
            title="Active Rule Recall"
            text={
              hasLearningData
                ? "Your analytics are based on rule attempts, subject accuracy, and weak-area records."
                : "Complete BLL rule attempts to activate this insight."
            }
            tone="green"
            data={chartData}
          />

          <LearningTopCard
            icon={<Clock3 size={25} />}
            label="REAL SIGNAL"
            title="Recent Score Movement"
            text={
              hasTrendData
                ? delta >= 0
                  ? `Your BLL trend improved by ${Math.abs(delta)} points recently.`
                  : `Your BLL trend dropped by ${Math.abs(delta)} points recently.`
                : "No recent trend data exists for the selected range."
            }
            tone="purple"
            data={chartData}
          />

          <LearningTopCard
            icon={<AlertTriangle size={25} />}
            label="WEAK AREA"
            title={primaryWeakArea?.subject || "Review Weak Areas"}
            text={
              primaryWeakArea
                ? primaryWeakArea.rule || primaryWeakArea.title || primaryWeakArea.topic || "This weak area needs focused review."
                : "No weak-area record exists yet."
            }
            tone="red"
            data={chartData}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <GlassCard
          title="Retention Signal"
          info="This uses real BLL accuracy trend. A true retention curve needs a separate retention endpoint."
        >
          {hasTrendData ? (
            <div className="h-[205px]">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="learningTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="10%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#edf1f7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 400 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 400 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    name="BLL Accuracy"
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#learningTrendGradient)"
                    dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyCompact text="No real BLL trend exists for the selected range." />
          )}

          <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-[12px] font-normal leading-5 text-blue-700">
            Retention insight will become more accurate as more BLL attempts are recorded over time.
          </div>
        </GlassCard>

        <GlassCard
          title="Best Study Pattern"
          info="This ranking uses real available activity. Detailed sequence ranking needs a dedicated session-pattern endpoint."
        >
          <div className="space-y-2.5">
            <PatternRow rank="1" text="Rule Training → Review Weak Areas" badge={weakAreas.length > 0 ? "Best current move" : "Needs data"} active />
            <PatternRow rank="2" text="Rule Bank → Rule Training" badge={strongestSubject ? strongestSubject.name : "Available"} />
            <PatternRow rank="3" text="Weak Areas → Rule Training" badge={weakestSubject ? weakestSubject.name : "Available"} />
            <PatternRow rank="4" text="Flashcards → Rule Review" badge="Available" />
            <PatternRow rank="5" text="Study Plan → Daily Review" badge="Available" />
          </div>

          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-normal leading-5 text-emerald-700">
            Current recommendation is based on weak-area count and subject accuracy.
          </div>
        </GlassCard>

        <GlassCard
          title="Optimal Session Length"
          info="A real optimal session length needs session-duration analytics. Until then, this section is locked."
        >
          <LockedMetric
            title="Session-duration analytics not connected"
            text="Connect real study-session duration data before showing best session length."
            compact
          />
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard
          title="Time of Day Performance"
          badge="Premium"
          info="This requires timestamped session performance grouped by hour. It is locked until that backend exists."
        >
          <LockedMetric
            title="Time-of-day heatmap not connected"
            text="This card needs real hourly performance data before it can show a heatmap."
            compact
          />
        </GlassCard>

        <GlassCard
          title="What Improves Your Score the Most"
          info="This card uses real current signals only: BLL trend, weak areas, and strongest subject."
        >
          <div className="space-y-4">
            <ImpactRow label="Recent BLL score movement" value={Math.max(0, Math.min(100, Math.abs(delta) * 10))} text={`${delta >= 0 ? "+" : "-"}${Math.abs(delta)} pts`} />
            <ImpactRow label="Weak-area pressure" value={Math.max(0, Math.min(100, weakAreas.length * 12))} text={`${weakAreas.length} record${weakAreas.length === 1 ? "" : "s"}`} />
            <ImpactRow label="Strongest subject" value={strongestSubject?.accuracy || 0} text={strongestSubject ? `${strongestSubject.accuracy}%` : "No data"} />
            <ImpactRow label="Consistency" value={Math.round(consistencyScore * 20)} text={`${consistencyScore}/5`} />
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-normal leading-5 text-emerald-700">
            These values are calculated from current real analytics, not generated estimates.
          </div>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard
          title="Consistency Insights"
          info="Consistency is calculated from recent days with real BLL trend activity."
        >
          <div className="flex items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-[11px] border-violet-700 bg-white shadow-inner">
              <div className="text-center">
                <div className="text-[38px] font-normal tracking-[-0.05em] text-[#090f35]">
                  {consistencyScore}
                </div>
                <div className="text-[13px] font-normal text-slate-500">/ 5</div>
              </div>
            </div>

            <div className="space-y-4 text-[13px] font-normal text-[#11183d]">
              <MetricLine icon={<CalendarDays size={18} />} label="Rule attempts" value={safeNumber(dashboard.ruleAttempts).toLocaleString()} />
              <MetricLine icon={<Clock3 size={18} />} label="Current BLL score" value={`${currentScore}%`} />
              <MetricLine icon={<TrendingUp size={18} />} label="Trend" value={delta >= 0 ? "Up" : "Down"} />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-normal leading-5 text-emerald-700">
            Consistency is strongest when you produce real activity across multiple recent days.
          </div>
        </GlassCard>

        <GlassCard
          title="Learning Behavior Mix"
          badge="Premium"
          info="This requires separate behavior tracking across flashcards, reading, active recall, and written explanation."
        >
          <LockedMetric
            title="Behavior-mix analytics not connected"
            text="Connect behavior-level tracking before showing a learning behavior chart."
            compact
          />
        </GlassCard>
      </section>

      <section className="rounded-2xl border border-[#e2e7f1] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-700 text-white">
            <Sparkles size={26} />
          </div>

          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-normal text-[#080d31]">AI Recommendation</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-normal text-violet-700">
                Lexora AI
              </span>
            </div>
            <p className="mt-1 text-[12px] font-normal leading-5 text-[#4d5a78]">
              AI recommendation is locked until the real AI insight endpoint is connected. Current next step uses real weak-area data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/rule-training")}
            className="h-10 rounded-xl bg-violet-700 px-5 text-[13px] font-normal text-white transition hover:bg-violet-800"
          >
            Start Rule Training →
          </button>

          <button
            type="button"
            onClick={() => router.push("/weak-areas")}
            className="h-10 rounded-xl border border-violet-200 bg-white px-5 text-[13px] font-normal text-violet-700 transition hover:bg-violet-50"
          >
            Review Weak Areas
          </button>
        </div>
      </section>
    </div>
  )
}

function LearningTopCard({
  icon,
  label,
  title,
  text,
  tone,
  data,
}: {
  icon: ReactNode
  label: string
  title: string
  text: string
  tone: "green" | "purple" | "red"
  data: Array<{ date: string; score: number }>
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : "bg-violet-50 text-violet-700"

  const labelClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-rose-600"
        : "text-violet-700"

  const stroke = tone === "green" ? "#10b981" : tone === "red" ? "#f43f5e" : "#7c3aed"

  return (
    <div className="rounded-2xl border border-[#e2e7f1] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
        <div>
          <div className={`text-[10px] font-normal ${labelClass}`}>
            {label}
          </div>
          <div className="mt-3 text-[16px] font-medium tracking-[-0.02em] text-[#080d31]">
            {title}
          </div>
          <p className="mt-2 text-[12px] font-normal leading-5 text-[#4d5a78]">
            {text}
          </p>
        </div>
      </div>

      <div className="mt-5 h-10">
        <MiniSparkline data={data} stroke={stroke} />
      </div>
    </div>
  )
}

function PatternRow({
  rank,
  text,
  badge,
  active = false,
}: {
  rank: string
  text: string
  badge: string
  active?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-normal ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-[#11183d]"
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px]">
        {rank}
      </span>
      <span className="min-w-0 flex-1">{text}</span>
      <span className="rounded-md bg-white px-2 py-1 text-[10px]">{badge}</span>
    </div>
  )
}

function LockedMetric({
  title,
  text,
  compact = false,
}: {
  title: string
  text: string
  compact?: boolean
}) {
  return (
    <div className={`flex ${compact ? "min-h-[205px]" : "min-h-[230px]"} items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50 p-6 text-center`}>
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-violet-700">
          <Lock size={20} />
        </div>
        <div className="mt-3 text-[14px] font-normal text-[#11183d]">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-[12px] font-normal leading-5 text-[#5b6680]">
          {text}
        </p>
      </div>
    </div>
  )
}

function ImpactRow({
  label,
  value,
  text,
}: {
  label: string
  value: number
  text: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-normal text-[#11183d]">
        <span>{label}</span>
        <span>{text}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function MetricLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="text-[14px] text-[#11183d]">{value}</div>
      </div>
    </div>
  )
}

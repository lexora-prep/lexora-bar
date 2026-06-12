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
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Rocket,
  Scale,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type {
  ChartPoint,
  DashboardData,
  RiskBuckets,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"
import { GlassCard } from "../shared/glass-card"
import { AnalyticsInterpretation } from "../shared/analytics-interpretation"
import {
  EmptyCompact,
  PremiumInline,
} from "../shared/feedback-states"
import {
  ChartTooltip,
  MiniSparkline,
} from "../shared/chart-components"

type OverviewTabProps = {
  dashboard: DashboardData
  chartData: ChartPoint[]
  trendLoading: boolean
  currentScore: number
  delta: number
  canUseBLLAnalytics: boolean
  canUsePremiumAnalytics: boolean
  strongSubjects: SubjectDiagnostic[]
  strongestSubject?: SubjectDiagnostic
  weakestSubject?: SubjectDiagnostic
  weakAreas: WeakArea[]
  primaryWeakArea?: WeakArea
  riskBuckets: RiskBuckets
  consistencyScore: number
  rangeLabelText: string
}

export default function OverviewTab({
  dashboard,
  chartData,
  trendLoading,
  currentScore,
  delta,
  canUseBLLAnalytics,
  canUsePremiumAnalytics,
  strongSubjects,
  strongestSubject,
  weakestSubject,
  weakAreas,
  primaryWeakArea,
  riskBuckets,
  consistencyScore,
  rangeLabelText,
}: OverviewTabProps) {
  const router = useRouter()

  const weakCountDelta =
    weakAreas.length > 0 ? weakAreas.length : 0

  const hasTrendData = chartData.some(
    (point) => point.score > 0
  )

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use this overview"
        measures="This page separates activity volume, independent recall accuracy, consistency, and current subject risk. A higher attempt count does not automatically mean stronger performance."
        result={
          safeNumber(dashboard.ruleAttempts) === 0
            ? "No scored rule activity is available for the selected range."
            : `Your current independent recall accuracy is ${currentScore}%. ${delta >= 0 ? `It increased by ${Math.abs(delta)} points` : `It decreased by ${Math.abs(delta)} points`} compared with the previous active day. ${weakAreas.length > 0 ? `${weakAreas.length} assessed weak ${weakAreas.length === 1 ? "area requires" : "areas require"} attention.` : "No assessed weak area is currently confirmed."}`
        }
        nextStep={
          primaryWeakArea
            ? `Prioritize ${primaryWeakArea.subject}${primaryWeakArea.topic ? ` — ${primaryWeakArea.topic}` : ""} in your next independent recall session.`
            : "Continue completing independently scored rule attempts so Lexora can identify a reliable priority."
        }
      />
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
                    delta >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {delta >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(delta)} pts vs previous active day
                </div>
              </div>

              <div className="h-[86px] w-[145px]">
                <MiniSparkline
                  data={chartData}
                  stroke="#7c3aed"
                />
              </div>
            </div>
          </div>
        </div>

        <KpiCard
          icon={<Target size={18} />}
          title="BLL Score"
          value={`${safeNumber(dashboard.bllScore)}%`}
          delta={delta}
          tone="violet"
        />

        <KpiCard
          icon={<FileText size={18} />}
          title="Rule Attempts"
          value={safeNumber(
            dashboard.ruleAttempts
          ).toLocaleString()}
          delta={safeNumber(dashboard.ruleAttempts)}
          tone="blue"
        />

        <KpiCard
          icon={<CheckCircle2 size={18} />}
          title="Accuracy"
          value={`${currentScore}%`}
          delta={delta}
          tone="green"
        />

        <KpiCard
          icon={<AlertTriangle size={18} />}
          title="Weak Areas"
          value={weakAreas.length}
          delta={weakCountDelta}
          tone="red"
          negative
        />

        <KpiCard
          icon={<CalendarDays size={18} />}
          title="Consistency Score"
          value={`${consistencyScore} / 5`}
          delta={consistencyScore}
          tone="purple"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_1.05fr_0.85fr]">
        <GlassCard
          title="AI Executive Summary"
          badge="Lexora AI"
          info="This section uses real analytics only. AI text is locked until the real AI insight endpoint is connected."
        >
          {canUsePremiumAnalytics ? (
            <div>
              <h2 className="text-[18px] font-normal leading-[1.35] tracking-[-0.03em] text-[#0a1038]">
                AI insight engine is not connected yet.
              </h2>

              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMini
                  icon={<TrendingUp size={22} />}
                  title="Main Progress"
                  text={
                    delta >= 0
                      ? `Your score improved by ${Math.abs(delta)} points recently.`
                      : `Your score dropped by ${Math.abs(delta)} points recently.`
                  }
                  tone="green"
                  onClick={() =>
                    router.push("/analytics")
                  }
                />

                <SummaryMini
                  icon={<ShieldCheck size={22} />}
                  title="Biggest Strength"
                  text={
                    strongestSubject
                      ? `${strongestSubject.name} is your strongest subject.`
                      : "No strength confirmed yet."
                  }
                  tone="green"
                  onClick={() =>
                    router.push("/rule-bank")
                  }
                />

                <SummaryMini
                  icon={<AlertTriangle size={22} />}
                  title="Biggest Weakness"
                  text={
                    weakestSubject
                      ? `${weakestSubject.name} needs the most attention.`
                      : "No weak subject confirmed yet."
                  }
                  tone="red"
                  onClick={() =>
                    router.push("/weak-areas")
                  }
                />

                <SummaryMini
                  icon={<Target size={22} />}
                  title="Recommendation"
                  text={
                    primaryWeakArea
                      ? `Focus on ${primaryWeakArea.subject}.`
                      : "Complete more rules for a recommendation."
                  }
                  tone="purple"
                  onClick={() =>
                    router.push("/rule-training")
                  }
                />
              </div>

              <div className="mt-6 rounded-xl bg-violet-50 p-4">
                <div className="mb-3 text-[12px] font-normal text-[#11183d]">
                  AI Performance Snapshot
                </div>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <SnapshotMetric
                    label="Accuracy"
                    value={`${currentScore}%`}
                  />

                  <SnapshotMetric
                    label="Strong Areas"
                    value={strongSubjects.length}
                  />

                  <SnapshotMetric
                    label="Consistency"
                    value={`${consistencyScore} / 5`}
                  />

                  <SnapshotMetric
                    label="Weak Risk"
                    value={
                      weakAreas.length > 0
                        ? "High"
                        : "Low"
                    }
                    danger={weakAreas.length > 0}
                  />
                </div>
              </div>
            </div>
          ) : (
            <PremiumInline text="Premium AI summary will appear here after the insight engine is connected." />
          )}
        </GlassCard>

        <GlassCard
          title="What’s Driving Your Score"
          info="This is calculated from your real BLL subjects, latest score movement, and weak-area records."
        >
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-[13px] font-normal text-emerald-700">
                Helping Your Score
              </div>

              <DriverRow
                icon={<BookOpen size={20} />}
                title={
                  strongestSubject?.name ||
                  "No strong subject yet"
                }
                text={
                  strongestSubject
                    ? `${strongestSubject.accuracy}% accuracy`
                    : "Complete more rules to calculate strengths."
                }
                value={
                  strongestSubject
                    ? `+${strongestSubject.accuracy}%`
                    : "—"
                }
                tone="green"
              />

              <DriverRow
                icon={<Zap size={20} />}
                title="Recent score movement"
                text={
                  delta >= 0
                    ? "Recent BLL score is moving up."
                    : "Recent BLL score decreased."
                }
                value={`${delta >= 0 ? "+" : "-"}${Math.abs(delta)} pts`}
                tone={
                  delta >= 0 ? "green" : "red"
                }
              />

              <DriverRow
                icon={<CalendarDays size={20} />}
                title="Consistency"
                text="Recent activity is used to measure stability."
                value={`${consistencyScore}/5`}
                tone="green"
              />
            </div>

            <div>
              <div className="mb-3 text-[13px] font-normal text-rose-700">
                Hurting Your Score
              </div>

              <DriverRow
                icon={<Scale size={20} />}
                title={
                  weakestSubject?.name ||
                  "No weak subject yet"
                }
                text={
                  weakestSubject
                    ? `${weakestSubject.accuracy}% accuracy`
                    : "Weak subjects appear after more attempts."
                }
                value={
                  weakestSubject
                    ? `-${100 - weakestSubject.accuracy}%`
                    : "—"
                }
                tone="red"
              />

              <DriverRow
                icon={<AlertTriangle size={20} />}
                title={
                  primaryWeakArea?.rule ||
                  primaryWeakArea?.title ||
                  "No weak rule yet"
                }
                text={
                  primaryWeakArea?.subject ||
                  "Weak rules appear after repeated low recall."
                }
                value={
                  primaryWeakArea?.accuracy !== undefined
                    ? `${primaryWeakArea.accuracy}%`
                    : "—"
                }
                tone="red"
              />

              <DriverRow
                icon={<Clock3 size={20} />}
                title="Unstable rules"
                text="Rules below 70% accuracy need repeated recall."
                value={weakAreas.length.toString()}
                tone="red"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          title="Next Best Move"
          icon={
            <Rocket
              size={18}
              className="text-violet-700"
            />
          }
          info="This action is based on the highest-priority real weak-area record."
        >
          {primaryWeakArea ? (
            <div className="space-y-4">
              <StepCard
                step="1"
                title={`Review ${primaryWeakArea.subject}`}
                subtitle={
                  primaryWeakArea.rule ||
                  primaryWeakArea.title ||
                  primaryWeakArea.topic ||
                  "Focus on rules, exceptions, and common mistakes."
                }
                time="25 min"
              />

              <StepCard
                step="2"
                title="Then do targeted rule recall"
                subtitle="Repeat the rule until recall becomes stable."
                time="10 min"
              />

              <button
                type="button"
                onClick={() =>
                  router.push("/rule-training")
                }
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

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <GlassCard
          title="BLL Accuracy Trend"
          subtitle={`Real trend from ${rangeLabelText.toLowerCase()}.`}
          info="This chart comes from /api/trend-analytics and only shows real BLL rule-attempt activity."
        >
          {trendLoading ? (
            <EmptyCompact text="Loading selected date range..." />
          ) : canUseBLLAnalytics && hasTrendData ? (
            <div className="h-[195px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="overviewRealTrendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="10%"
                        stopColor="#7c3aed"
                        stopOpacity={0.18}
                      />

                      <stop
                        offset="95%"
                        stopColor="#7c3aed"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#eef1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fontWeight: 400,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 11,
                      fontWeight: 400,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip content={<ChartTooltip />} />

                  <Area
                    name="BLL Accuracy"
                    type="monotone"
                    dataKey="score"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#overviewRealTrendGradient)"
                    dot={{
                      r: 3,
                      strokeWidth: 2,
                      fill: "#fff",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyCompact text="No BLL activity found for this selected date range." />
          )}
        </GlassCard>

        <GlassCard
          title="Subject Risk Map"
          info="Subjects are grouped by real BLL accuracy: safe, maintenance, high risk, and critical."
        >
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
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}
      >
        {icon}
      </div>

      <div className="text-[12px] font-normal text-[#11183d]">
        {title}
      </div>

      <div className="mt-2 text-[26px] font-normal tracking-[-0.04em] text-[#070c2d]">
        {value}
      </div>

      <div
        className={`mt-3 text-[12px] font-normal ${
          negative
            ? "text-rose-600"
            : "text-emerald-600"
        }`}
      >
        {typeof delta === "number"
          ? `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}`
          : "Real data"}
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
  onClick,
}: {
  icon: ReactNode
  title: string
  text: string
  tone: "green" | "red" | "purple"
  onClick: () => void
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

      <div
        className={`mt-3 text-[11px] font-normal ${toneClass}`}
      >
        {title}
      </div>

      <p className="mt-2 pr-3 text-[11px] font-normal leading-5 text-[#52617f]">
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-3 text-[11px] font-normal text-violet-700"
      >
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
      <div className="text-[10px] font-normal text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 text-[14px] font-normal ${
          danger
            ? "text-rose-600"
            : "text-[#10163f]"
        }`}
      >
        {value}
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-slate-200">
        <div
          className={`h-1.5 w-2/3 rounded-full ${
            danger
              ? "bg-rose-500"
              : "bg-violet-700"
          }`}
        />
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
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[12px] font-normal leading-5 text-[#11183d]">
            {title}
          </div>

          <div
            className={`text-[12px] font-normal ${
              tone === "green"
                ? "text-emerald-600"
                : "text-rose-600"
            }`}
          >
            {value}
          </div>
        </div>

        <p className="mt-1 text-[11px] font-normal leading-4 text-[#66728e]">
          {text}
        </p>

        <div className="mt-2 h-1.5 rounded-full bg-slate-200">
          <div
            className={`h-1.5 w-4/5 rounded-full ${
              tone === "green"
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-lg font-normal text-white">
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

function RiskMap({
  buckets,
}: {
  buckets: RiskBuckets
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <RiskColumn
        title="Safe"
        text="Strong performance. Keep it up!"
        tone="green"
        items={buckets.safe}
        button="Maintain"
        href="/rule-bank"
      />

      <RiskColumn
        title="Needs Maintenance"
        text="Performing well, but needs consistent review."
        tone="yellow"
        items={buckets.maintenance}
        button="Review this week"
        href="/study-plan"
      />

      <RiskColumn
        title="High Risk"
        text="Focus soon to prevent further score impact."
        tone="orange"
        items={buckets.high}
        button="Focus soon"
        href="/weak-areas"
      />

      <RiskColumn
        title="Critical"
        text="Immediate focus recommended."
        tone="red"
        items={buckets.critical}
        button="Start today"
        href="/rule-training"
      />
    </div>
  )
}

function RiskColumn({
  title,
  text,
  tone,
  items,
  button,
  href,
}: {
  title: string
  text: string
  tone: "green" | "yellow" | "orange" | "red"
  items: SubjectDiagnostic[]
  button: string
  href: string
}) {
  const router = useRouter()

  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "yellow"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "orange"
          ? "border-orange-100 bg-orange-50 text-orange-700"
          : "border-rose-100 bg-rose-50 text-rose-700"

  return (
    <div
      className={`flex h-full min-h-[205px] flex-col rounded-xl border p-4 ${toneClass}`}
    >
      <div className="flex items-center gap-2 text-[13px] font-normal">
        <CheckCircle2 size={16} />
        {title}
      </div>

      <p className="mt-2 min-h-[35px] text-[11px] font-normal leading-5">
        {text}
      </p>

      <div className="mt-3 min-h-[70px] flex-1 space-y-2">
        {items.length === 0 ? (
          <div className="text-[11px] font-normal opacity-70">
            No subjects yet.
          </div>
        ) : (
          items.slice(0, 3).map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-2 text-[12px] font-normal text-[#11183d]"
            >
              <span>{item.name}</span>
              <span>{item.accuracy}%</span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(href)}
        className="mt-auto h-9 w-full rounded-lg border border-current bg-white/50 text-[12px] font-normal"
      >
        {button}
      </button>
    </div>
  )
}

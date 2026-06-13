"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Rocket,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import type { RecommendedFocusSession } from "@/lib/analytics/recommendation-engine"
import { useRouter } from "next/navigation"
import type {
  ChartPoint,
  DashboardData,
  RiskBuckets,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"
import { EmptyCompact } from "../shared/feedback-states"
import { MiniSparkline } from "../shared/chart-components"

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
  riskBuckets: RiskBuckets
  consistencyScore: number
  rangeLabelText: string
}

type SubjectLike = {
  name?: string
  subject?: string
  accuracy?: number
  weakRules?: number
  weakRuleCount?: number
  riskLevel?: string
}

type RiskItem = {
  subject: string
  accuracy: number
  weakRules: number
  risk: "Low" | "Medium" | "High" | "Critical"
}

type WeakFocusRule = WeakArea & {
  priorityReason?: string
  recommendationReason?: string
  reviewTimingLabel?: string
  reviewTierLabel?: string
  learningStatusLabel?: string
  reviewAvailableNow?: boolean
  failureStreak?: number
  lastScore?: number | null
}

export default function OverviewTab({
  dashboard,
  chartData,
  currentScore,
  delta,
  canUseBLLAnalytics,
  strongSubjects,
  strongestSubject,
  weakestSubject,
  weakAreas,
  riskBuckets,
  consistencyScore,
}: OverviewTabProps) {
  const router = useRouter()
  const [greeting, setGreeting] = useState("Hello")

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours()

      if (hour < 5) {
        setGreeting("Good night")
      } else if (hour < 12) {
        setGreeting("Good morning")
      } else if (hour < 17) {
        setGreeting("Good afternoon")
      } else if (hour < 22) {
        setGreeting("Good evening")
      } else {
        setGreeting("Good night")
      }
    }

    updateGreeting()

    const timer = window.setInterval(updateGreeting, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  const displayName = getDisplayName(dashboard)
  const [weakFocusRule, setWeakFocusRule] = useState<WeakFocusRule | null>(null)
  const [focusSession, setFocusSession] = useState<RecommendedFocusSession | null>(null)
  const [weakFocusCount, setWeakFocusCount] = useState<number | null>(null)
  const [weakFocusLoading, setWeakFocusLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadWeakFocusRule() {
      try {
        setWeakFocusLoading(true)

        const response = await fetch("/api/rules/weak-focus?limit=1", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          setWeakFocusRule(null)
          setFocusSession(null)
          setWeakFocusCount(null)
          return
        }

        const payload = await response.json()
        const rule = payload?.rules?.[0] ?? payload?.weakAreas?.[0] ?? null
        const count =
          typeof payload?.count === "number"
            ? payload.count
            : Array.isArray(payload?.rules)
              ? payload.rules.length
              : Array.isArray(payload?.weakAreas)
                ? payload.weakAreas.length
                : null

        setWeakFocusRule(rule)
        setFocusSession(payload?.focusSession ?? null)
        setWeakFocusCount(count)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setWeakFocusRule(null)
          setFocusSession(null)
          setWeakFocusCount(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setWeakFocusLoading(false)
        }
      }
    }

    loadWeakFocusRule()

    return () => controller.abort()
  }, [])

  const readinessScore = getReadinessScore(dashboard, currentScore)
  const weakRuleCount = weakAreas.length
  const hasTrendData = chartData.some((point) => point.score > 0)
  const topWeakSubjects = getTopWeakSubjects(weakestSubject, weakAreas)
  const focusRule = weakFocusRule
  const focusTitle = focusSession?.title ?? getFocusTitle(focusRule)
  const focusDetail = focusSession?.detail ?? getFocusDetail(focusRule)
  const focusRoute = focusSession?.route ?? buildFocusRoute(focusRule)
  const focusTimingLabel =
    focusSession?.reviewTimingLabel || focusRule?.reviewTimingLabel || null
  const focusQueueCount = focusSession?.queueSize ?? weakFocusCount ?? 0
  const subjectRisks = buildRiskItems(riskBuckets, strongSubjects, weakestSubject)
  const bestRangeLabel = getBestSessionRangeLabel(dashboard)
  const summary = buildSummary({
    recallAccuracy: currentScore,
    delta,
    weakRuleCount,
    consistencyScore,
    topWeakSubjects,
    bestRangeLabel,
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="rounded-2xl border border-[#e5ddfb] bg-gradient-to-br from-[#fbf9ff] via-white to-[#faf7ff] px-5 py-4 shadow-[0_8px_24px_rgba(52,35,110,0.04)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <h2 className="text-[17px] font-normal tracking-[-0.03em] text-[#080d2f]">
              {greeting}{displayName ? `, ${displayName}` : ""} 👋
            </h2>

            <p className="mt-2 max-w-3xl text-[12px] leading-5 text-[#465571]">
              {summary.banner}
            </p>
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-l border-slate-200/80 pl-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Target size={21} />
            </div>

            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                Today&apos;s Focus
              </div>

              <div className="truncate text-[14px] font-normal text-[#10153d]">
                {focusTitle}
              </div>

              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                {focusDetail}
              </p>
            </div>

            <div className="w-[250px]">
              <button
                type="button"
                onClick={() => {
                  if (focusRule) router.push(focusRoute)
                }}
                disabled={!focusRule}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-[12px] font-normal text-white shadow-[0_12px_22px_rgba(124,58,237,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {focusRule ? "Start Today’s Focus Session" : "Focus unavailable"}
                {focusRule ? <ArrowRight size={14} /> : null}
              </button>

              <div className="mt-1 text-center text-[10px] text-slate-500">
                {focusTimingLabel
                  ? `Review timing: ${focusTimingLabel}`
                  : weakFocusLoading
                    ? "Loading focus signal..."
                    : "Review timing appears after enough weak-focus data"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Target size={16} />}
          title="Readiness Score"
          value={`${readinessScore}%`}
          helper="Combined readiness signal from recall performance, weak rules, and recent activity."
          delta={delta}
          tone="violet"
          sparkline={hasTrendData ? chartData : undefined}
        />

        <KpiCard
          icon={<CheckCircle2 size={16} />}
          title="Recall Accuracy"
          value={`${currentScore}%`}
          helper="Correct scored recall attempts divided by total scored recall attempts."
          delta={delta}
          tone="green"
          sparkline={hasTrendData ? chartData : undefined}
        />

        <KpiCard
          icon={<AlertTriangle size={16} />}
          title="Weak Rules"
          value={weakRuleCount}
          helper="Unique weak or unstable rules that need repeated recall."
          delta={weakRuleCount}
          tone="red"
          negative
          sparkline={hasTrendData ? chartData : undefined}
        />

        <KpiCard
          icon={<ShieldCheck size={16} />}
          title="Consistency"
          value={`${consistencyScore} / 5`}
          helper="Recent active-day stability. Higher consistency makes readiness more reliable."
          delta={consistencyScore}
          tone="amber"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_0.92fr]">
        <PremiumCard
          title="Today’s Performance Summary"
          help="A compact rule-based summary from real analytics data."
        >
          <div className="space-y-1">
            <SummaryRow
              icon={<CheckCircle2 size={18} />}
              tone="green"
              title={summary.overallTitle}
              text={summary.overallText}
            />

            <SummaryRow
              icon={delta >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              tone={delta >= 0 ? "green" : "red"}
              title={summary.movementTitle}
              text={summary.movementText}
            />

            <SummaryRow
              icon={<Clock3 size={18} />}
              tone="amber"
              title="Study time quality"
              text={summary.timeText}
            />

            <SummaryRow
              icon={<AlertTriangle size={18} />}
              tone={weakRuleCount > 0 ? "red" : "green"}
              title="Weak rule pressure"
              text={summary.weakText}
            />
          </div>

          <div className="relative mt-3 overflow-hidden rounded-2xl border border-violet-100/80 bg-white/70 px-3 py-2.5 text-[12px] leading-5 text-violet-800 shadow-[0_10px_28px_rgba(124,58,237,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur">
            <div className="pointer-events-none absolute -left-10 -top-12 h-24 w-24 rounded-full bg-violet-100/70 blur-2xl" />
            <div className="pointer-events-none absolute -right-12 bottom-0 h-20 w-20 rounded-full bg-fuchsia-100/60 blur-2xl" />

            <div className="relative flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                <Clock3 size={13} />
              </span>
              <span>{summary.coachingInsight}</span>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard
          title="What’s Driving Your Readiness"
          help="Positive drivers and negative drivers from real score, subject, and weak-rule data."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[12px] font-normal text-emerald-700">
                Helping You
              </div>

              <DriverRow
                icon={<ShieldCheck size={16} />}
                title="Recall accuracy"
                text={`${currentScore}% scored recall accuracy`}
                value={`${currentScore}%`}
                tone="green"
              />

              <DriverRow
                icon={<CalendarDays size={16} />}
                title="Consistency"
                text="Recent activity is stabilizing your score."
                value={`${Math.round((consistencyScore / 5) * 100)}%`}
                tone="green"
              />

              <DriverRow
                icon={<BookOpen size={16} />}
                title={strongestSubject?.name || "Strength signal pending"}
                text={
                  strongestSubject
                    ? `${safeNumber(strongestSubject.accuracy)}% accuracy`
                    : "Requires more scored activity."
                }
                value={strongestSubject ? `${safeNumber(strongestSubject.accuracy)}%` : "—"}
                tone={strongestSubject ? "green" : "neutral"}
              />
            </div>

            <div>
              <div className="mb-2 text-[12px] font-normal text-rose-700">
                Hurting You
              </div>

              <DriverRow
                icon={<AlertTriangle size={16} />}
                title={weakestSubject?.name || "Weak subject"}
                text={
                  weakestSubject
                    ? `${safeNumber(weakestSubject.accuracy)}% accuracy`
                    : "Appears after enough attempts."
                }
                value={weakestSubject ? `${safeNumber(weakestSubject.accuracy)}%` : "—"}
                tone={weakestSubject ? "red" : "neutral"}
              />

              <DriverRow
                icon={<Target size={16} />}
                title={getPrimaryWeakRuleLabel(focusRule ?? undefined)}
                text={
                  focusRule?.subject
                    ? `${focusRule.subject}${focusRule.topic ? ` · ${focusRule.topic}` : ""}`
                    : "Requires real weak-focus data."
                }
                value={
                  typeof (focusRule as any)?.accuracy === "number"
                    ? `${(focusRule as any).accuracy}%`
                    : "—"
                }
                tone={focusRule ? "red" : "neutral"}
              />

              <DriverRow
                icon={<Zap size={16} />}
                title="Weak rules"
                text="Rules below the stability threshold need review."
                value={weakRuleCount.toString()}
                tone={weakRuleCount > 0 ? "red" : "green"}
              />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard
          title="Next Best Move"
          icon={<Rocket size={16} className="text-violet-700" />}
          help="This explains the same focus session shown in the top banner."
        >
          {focusRule ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-violet-100/80 bg-white/75 p-3 shadow-[0_10px_26px_rgba(124,58,237,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur">
                <div className="pointer-events-none absolute -left-12 -top-12 h-28 w-28 rounded-full bg-violet-100/80 blur-2xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-16 w-20 rounded-full bg-fuchsia-100/50 blur-2xl" />

                <div className="relative flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100">
                    <Target size={17} />
                  </span>

                  <div className="min-w-0">
                    <div className="text-[11px] text-violet-700">
                      Focus
                    </div>

                    <div className="mt-1 truncate text-[14px] font-normal text-[#10153d]">
                      {focusTitle}
                    </div>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {focusDetail}
                    </p>
                  </div>
                </div>
              </div>

              <StepRow
                step="1"
                title="Review weak rule"
                text="Read the rule and understand the elements."
              />

              <StepRow
                step="2"
                title="Type from memory"
                text="Reproduce the rule in your own words."
              />

              <StepRow
                step="3"
                title="Retest once"
                text="Check whether recall improves."
              />

              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/75 p-3 text-[11px] leading-5 text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.035),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur">
                <div className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full bg-violet-100/70 blur-xl" />

                <div className="relative">
                  <span className="font-normal text-[#10153d]">
                    Why this works:
                  </span>{" "}
                  {focusSession?.reason ||
                    focusRule.recommendationReason ||
                    focusRule.priorityReason ||
                    `This rule is ranked first in the same weak-focus queue used by Rule Training. Current queue size: ${focusQueueCount}.`}
                </div>
              </div>
            </div>
          ) : (
            <EmptyCompact text="Complete more scored rule attempts to generate today’s focus explanation." />
          )}
        </PremiumCard>
      </section>

      <PremiumCard
        title="Subject Risk Map"
        help="Compact subject risk from current recall and weak-rule signals."
        actionLabel="View all subjects"
      >
        {canUseBLLAnalytics ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
            {subjectRisks.length > 0 ? (
              subjectRisks.map((item) => (
                <SubjectRiskCard key={item.subject} item={item} />
              ))
            ) : (
              <div className="col-span-full">
                <EmptyCompact text="Complete more scored rule attempts to build a subject risk map." />
              </div>
            )}
          </div>
        ) : (
          <EmptyCompact text="BLL analytics are not available for this account or range." />
        )}
      </PremiumCard>
    </div>
  )
}

function PremiumCard({
  title,
  children,
  help,
  icon,
  actionLabel,
}: {
  title: string
  children: ReactNode
  help: string
  icon?: ReactNode
  actionLabel?: string
}) {
  return (
    <section className="rounded-2xl border border-[#e3e8f3] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              {icon}
            </div>
          ) : null}

          <h3 className="truncate text-[15px] font-normal tracking-[-0.02em] text-[#10153d]">
            {title}
          </h3>

          <HelpPopover text={help} />
        </div>

        {actionLabel ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-normal text-violet-700 transition-colors hover:text-violet-900"
          >
            {actionLabel} →
          </button>
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
  helper,
  delta,
  tone,
  negative = false,
  sparkline,
}: {
  icon: ReactNode
  title: string
  value: string | number
  helper: string
  delta?: number
  tone: "violet" | "green" | "red" | "amber"
  negative?: boolean
  sparkline?: ChartPoint[]
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-600"
          : "bg-violet-50 text-violet-700"

  const deltaClass = negative ? "text-rose-600" : "text-emerald-600"

  return (
    <div className="min-h-[96px] rounded-xl border border-[#e3e8f3] bg-white px-3 py-2.5 shadow-[0_5px_14px_rgba(15,23,42,0.025)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_9px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>

        <HelpPopover text={helper} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-normal text-[#11183d]">
        {title}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-[22px] font-normal tracking-[-0.05em] text-[#070c2d]">
            {value}
          </div>

          {typeof delta === "number" ? (
            <div className={`mt-1.5 text-[10px] font-normal ${deltaClass}`}>
              {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}
              <span className="ml-1 text-slate-500">
                vs previous period
              </span>
            </div>
          ) : null}
        </div>

        {sparkline && sparkline.length > 0 ? (
          <div className="h-8 w-14">
            <MiniSparkline
              data={sparkline}
              stroke={
                tone === "red"
                  ? "#ef4444"
                  : tone === "green"
                    ? "#10b981"
                    : "#7c3aed"
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  tone,
  title,
  text,
}: {
  icon: ReactNode
  tone: "green" | "red" | "amber"
  title: string
  text: string
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : "bg-amber-50 text-amber-600"

  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>

      <div>
        <div className="text-[13px] font-normal text-[#11183d]">
          {title}
        </div>

        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
          {text}
        </p>
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
  tone: "green" | "red" | "neutral"
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : "bg-slate-50 text-slate-500"

  const valueClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-rose-600"
        : "text-slate-400"

  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-2.5 last:border-b-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-normal text-[#10153d]">
          {title}
        </div>

        <div className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-500">
          {text}
        </div>
      </div>

      <div className={`shrink-0 text-[11px] font-normal ${valueClass}`}>
        {value}
      </div>
    </div>
  )
}

function StepRow({
  step,
  title,
  text,
}: {
  step: string
  title: string
  text: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100/90 bg-white/70 p-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.035),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(124,58,237,0.07)]">
      <div className="pointer-events-none absolute -left-8 -top-8 h-16 w-16 rounded-full bg-violet-50 blur-xl" />

      <div className="relative flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-800 text-[11px] text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]">
          {step}
        </div>

        <div>
          <div className="text-[12px] font-normal text-[#11183d]">
            {title}
          </div>

          <div className="mt-0.5 text-[10px] leading-4 text-slate-500">
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubjectRiskCard({ item }: { item: RiskItem }) {
  const riskStyle =
    item.risk === "Critical"
      ? "border-rose-100 bg-rose-50/70 text-rose-700"
      : item.risk === "High"
        ? "border-orange-100 bg-orange-50/70 text-orange-700"
        : item.risk === "Medium"
          ? "border-amber-100 bg-amber-50/70 text-amber-700"
          : "border-emerald-100 bg-emerald-50/70 text-emerald-700"

  const barStyle =
    item.risk === "Critical"
      ? "bg-rose-500"
      : item.risk === "High"
        ? "bg-orange-500"
        : item.risk === "Medium"
          ? "bg-amber-500"
          : "bg-emerald-500"

  return (
    <button
      type="button"
      className={`min-h-[62px] rounded-lg border px-2 py-1.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${riskStyle}`}
    >
      <div className="truncate text-[10px] font-normal">
        {item.subject}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px]">
        <span>Risk: {item.risk}</span>
        <span>{item.accuracy}%</span>
      </div>

      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full ${barStyle}`}
          style={{
            width: `${Math.min(100, Math.max(4, item.accuracy))}%`,
          }}
        />
      </div>

      <div className="mt-1.5 truncate text-[9px] opacity-80">
        {item.weakRules > 0
          ? `${item.weakRules} weak ${item.weakRules === 1 ? "rule" : "rules"}`
          : "No confirmed weak rules"}
      </div>
    </button>
  )
}

function HelpPopover({ text }: { text: string }) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-label="How to read this"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors duration-200 hover:border-violet-200 hover:text-violet-700"
      >
        <HelpCircle size={13} />
      </button>

      <div className="pointer-events-none absolute right-0 top-7 z-30 w-64 translate-y-1 rounded-xl border border-violet-100 bg-white p-3 text-left text-[11px] leading-5 text-slate-600 opacity-0 shadow-[0_14px_35px_rgba(15,23,42,0.12)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mb-1 text-[12px] font-normal text-[#10153d]">
          What this means
        </div>

        {text}
      </div>
    </div>
  )
}

function getDisplayName(dashboard: DashboardData) {
  const value =
    (dashboard as any).fullName ??
    (dashboard as any).full_name ??
    (dashboard as any).name ??
    (dashboard as any).profile?.full_name ??
    (dashboard as any).profile?.fullName

  return typeof value === "string" && value.trim()
    ? value.trim()
    : ""
}

function getReadinessScore(
  dashboard: DashboardData,
  currentScore: number
) {
  const value = safeNumber(
    (dashboard as any).readinessScore ??
      (dashboard as any).bllReadinessScore ??
      (dashboard as any).bllReadiness ??
      currentScore
  )

  return Math.max(0, Math.min(100, value))
}

function getBestSessionRangeLabel(dashboard: DashboardData) {
  const label =
    (dashboard as any).bestSessionRangeLabel ??
    (dashboard as any).recommendedSessionLengthLabel ??
    (dashboard as any).recommendedBlockLabel

  return typeof label === "string" && label.trim()
    ? label.trim()
    : null
}

function getFocusTitle(focusRule?: WeakFocusRule | null) {
  if (focusRule?.subject) {
    return `Review ${focusRule.subject} weak rules`
  }

  return "More scored data needed"
}

function getFocusDetail(focusRule?: WeakFocusRule | null) {
  const rule = getPrimaryWeakRuleLabel(focusRule ?? undefined)

  if (focusRule && rule !== "No confirmed priority rule yet") {
    const parts = [
      rule,
      focusRule.reviewTierLabel,
      focusRule.learningStatusLabel,
    ].filter(Boolean)

    return parts.join(" · ")
  }

  return "Complete more scored recall attempts so Lexora can identify a reliable focus."
}

function getPrimaryWeakRuleLabel(focusRule?: WeakArea) {
  if (!focusRule) return "No confirmed priority rule yet"

  return (
    (focusRule as any).rule ||
    (focusRule as any).title ||
    focusRule.topic ||
    "No confirmed priority rule yet"
  )
}

function buildFocusRoute(focusRule?: WeakFocusRule | null) {
  const params = new URLSearchParams()

  params.set("mode", "weak-focus")
  params.set("trainingMode", "weak_focus")

  if (focusRule?.subject) {
    params.set("subject", focusRule.subject)
  }

  const ruleId = focusRule?.ruleId || focusRule?.id

  if (typeof ruleId === "string" && ruleId.trim()) {
    params.set("ruleId", ruleId)
  }

  return `/rule-training?${params.toString()}`
}

function getTopWeakSubjects(
  weakestSubject: SubjectDiagnostic | undefined,
  weakAreas: WeakArea[]
) {
  const subjects = new Map<string, number>()

  if (weakestSubject?.name) {
    subjects.set(weakestSubject.name, 1)
  }

  for (const area of weakAreas) {
    if (!area.subject) continue
    subjects.set(area.subject, (subjects.get(area.subject) ?? 0) + 1)
  }

  return Array.from(subjects.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([subject]) => subject)
}

function buildSummary({
  recallAccuracy,
  delta,
  weakRuleCount,
  consistencyScore,
  topWeakSubjects,
  bestRangeLabel,
}: {
  recallAccuracy: number
  delta: number
  weakRuleCount: number
  consistencyScore: number
  topWeakSubjects: string[]
  bestRangeLabel: string | null
}) {
  const weakSubjectText =
    topWeakSubjects.length > 0
      ? topWeakSubjects.join(" and ")
      : "your weakest subjects"

  const accuracyStrong = recallAccuracy >= 80
  const hasWeakPressure = weakRuleCount > 0

  return {
    banner:
      accuracyStrong && hasWeakPressure
        ? `You’re consistent and your recall accuracy is strong. The current weak-focus queue shows weak rules in ${weakSubjectText}.`
        : accuracyStrong
          ? "Your recall accuracy is strong. Keep practicing consistently and watch for new weak rules as more data comes in."
          : hasWeakPressure
            ? `The current weak-focus queue shows weak rules in ${weakSubjectText}.`
            : "Complete more scored recall attempts so Lexora can identify your strongest opportunities.",
    overallTitle: accuracyStrong
      ? "You’re performing well overall."
      : "Your recall is still building.",
    overallText: accuracyStrong
      ? hasWeakPressure
        ? "Your recall accuracy is currently strong, while weak-rule pressure remains the main measurable issue."
        : "Your recall accuracy is currently strong, and no confirmed weak-rule pressure is shown in this range."
      : "Lexora needs more stable scored recall attempts before confirming a strong performance pattern.",
    movementTitle:
      delta >= 0
        ? "Your accuracy is improving."
        : "Your accuracy recently declined.",
    movementText:
      delta >= 0
        ? `Up ${Math.abs(delta)} points compared with the previous period.`
        : `Down ${Math.abs(delta)} points compared with the previous period. Review weak rules before adding too much new coverage.`,
    timeText: bestRangeLabel
      ? `Your best measured focused block is ${bestRangeLabel}.`
      : "Effective study time appears after session duration and scored recall data are available.",
    weakText:
      weakRuleCount > 0
        ? `${weakRuleCount} weak ${weakRuleCount === 1 ? "rule is" : "rules are"} currently holding your readiness back.`
        : "No confirmed weak rules are currently shown for this range.",
    coachingInsight: bestRangeLabel
      ? `Your measured best focused block is ${bestRangeLabel}.`
      : consistencyScore >= 4
        ? "Your current consistency score is strong based on recorded activity."
        : "Your consistency score needs more recorded active days before a stronger pattern can be confirmed.",
  }
}

function buildRiskItems(
  riskBuckets: RiskBuckets,
  strongSubjects: SubjectDiagnostic[],
  weakestSubject?: SubjectDiagnostic
): RiskItem[] {
  const items: RiskItem[] = []

  const addSubject = (
    subject: SubjectLike | undefined,
    fallbackRisk: RiskItem["risk"]
  ) => {
    if (!subject) return

    const name = subject.name || subject.subject

    if (!name || items.some((item) => item.subject === name)) {
      return
    }

    const accuracy = Math.max(0, Math.min(100, safeNumber(subject.accuracy)))
    const weakRules = Math.max(0, safeNumber(subject.weakRules ?? subject.weakRuleCount))

    items.push({
      subject: name,
      accuracy,
      weakRules,
      risk: subject.riskLevel
        ? normalizeRisk(subject.riskLevel)
        : fallbackRisk,
    })
  }

  const buckets = riskBuckets as any

  for (const item of buckets?.critical ?? []) addSubject(item, "Critical")
  for (const item of buckets?.high ?? []) addSubject(item, "High")
  for (const item of buckets?.maintenance ?? buckets?.medium ?? []) addSubject(item, "Medium")
  for (const item of buckets?.safe ?? buckets?.low ?? []) addSubject(item, "Low")

  addSubject(weakestSubject as any, "Critical")

  for (const subject of strongSubjects) {
    addSubject(subject as any, "Low")
  }

  return items.slice(0, 14)
}

function normalizeRisk(value: string): RiskItem["risk"] {
  const clean = value.toLowerCase()

  if (clean.includes("critical")) return "Critical"
  if (clean.includes("high")) return "High"
  if (clean.includes("medium") || clean.includes("maintenance")) return "Medium"

  return "Low"
}

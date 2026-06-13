"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Keyboard,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"

import type {
  DashboardData,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"
import { AnalyticsInterpretation } from "../shared/analytics-interpretation"
import type { RecommendedFocusSession } from "@/lib/analytics/recommendation-engine"

type ChartPoint = {
  date: string
  score: number
}

type ModeMetric = {
  key: string
  label: string
  count: number
  percentage: number
}

type LearningMetrics = {
  rangeDays: number
  totalAttempts: number
  totalScoredAttempts: number
  modeMix: ModeMetric[]
  topMode: ModeMetric | null
  bestSessionLengthLabel: string | null
  bestSessionAccuracy: number | null
  effectiveStudySeconds: number
  effectiveStudyLabel: string | null
  activeDays: number
  focusScore: number | null
  focusScoreFormula: string
  hasEnoughBehaviorData: boolean
  hasEnoughSessionData: boolean
}

type LearningInsightsTabProps = {
  dashboard: DashboardData
  chartData: ChartPoint[]
  currentScore: number
  delta: number
  canUseBLLAnalytics: boolean
  strongestSubject?: SubjectDiagnostic
  weakestSubject?: SubjectDiagnostic
  weakAreas: WeakArea[]
  consistencyScore: number
}

const MODE_COLORS: Record<string, string> = {
  typing: "#7c3aed",
  ordering: "#3b82f6",
  buzzwords: "#34d399",
  flashcards: "#facc15",
  other: "#cbd5e1",
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)} / 100`
    : "More data needed"
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : "—"
}

function buildConicGradient(modeMix: ModeMetric[]) {
  let cursor = 0
  const parts: string[] = []

  for (const item of modeMix) {
    if (item.percentage <= 0) continue

    const start = cursor
    const end = cursor + item.percentage
    cursor = end

    parts.push(`${MODE_COLORS[item.key] ?? MODE_COLORS.other} ${start}% ${end}%`)
  }

  if (parts.length === 0) {
    return "conic-gradient(#e2e8f0 0% 100%)"
  }

  if (cursor < 100) {
    parts.push(`#e2e8f0 ${cursor}% 100%`)
  }

  return `conic-gradient(${parts.join(", ")})`
}

export default function LearningInsightsTab({
  dashboard,
  chartData,
  currentScore,
  delta,
  canUseBLLAnalytics,
  strongestSubject,
  weakestSubject,
  weakAreas,
  consistencyScore,
}: LearningInsightsTabProps) {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [focusSession, setFocusSession] = useState<RecommendedFocusSession | null>(null)
  const [focusLoading, setFocusLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadMetrics() {
      try {
        setMetricsLoading(true)

        const response = await fetch("/api/analytics/learning-insights?range=30", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          setMetrics(null)
          return
        }

        setMetrics(await response.json())
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMetrics(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setMetricsLoading(false)
        }
      }
    }

    async function loadFocusSession() {
      try {
        setFocusLoading(true)

        const response = await fetch("/api/rules/weak-focus?limit=1", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          setFocusSession(null)
          return
        }

        const payload = await response.json()
        setFocusSession(payload?.focusSession ?? null)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setFocusSession(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setFocusLoading(false)
        }
      }
    }

    loadMetrics()
    loadFocusSession()

    return () => controller.abort()
  }, [])

  const hasTrendData = chartData.some((point) => point.score > 0)
  const hasLearningData =
    canUseBLLAnalytics &&
    safeNumber(dashboard.ruleAttempts) > 0

  const activeDays = chartData
    .filter((point) => point.score > 0)
    .slice(-7).length

  const strongestLabel =
    strongestSubject?.name || "More data needed"

  const weakestLabel =
    focusSession?.subject ||
    weakestSubject?.name ||
    "More data needed"

  const modeMix = metrics?.modeMix ?? []
  const totalModeAttempts = modeMix.reduce((sum, item) => sum + item.count, 0)
  const donutGradient = useMemo(() => buildConicGradient(modeMix), [modeMix])

  const bestSessionLength =
    metrics?.bestSessionLengthLabel || "More data needed"

  const effectiveStudy =
    metrics?.effectiveStudyLabel || "More data needed"

  const topModeLabel =
    metrics?.topMode && metrics.topMode.count > 0
      ? metrics.topMode.label
      : "More data needed"

  const heroSentence =
    metrics?.bestSessionLengthLabel && metrics?.topMode?.count
      ? `You learn best with ${metrics.bestSessionLengthLabel.toLowerCase()}, ${metrics.topMode.label.toLowerCase()} sessions.`
      : "More scored activity is needed before Lexora can identify your strongest learning pattern."

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use learning insights"
        measures="This page uses scored rule attempts, training modes, study-session duration, and the live weak-focus queue. It does not claim a learning pattern when supporting data is missing."
        result={
          hasLearningData
            ? `Your current independent recall accuracy is ${currentScore}%, based on ${safeNumber(dashboard.ruleAttempts).toLocaleString()} recorded attempts. ${activeDays} active ${activeDays === 1 ? "day is" : "days are"} represented in the recent trend.`
            : "There is not enough scored rule activity to identify a reliable learning pattern yet."
        }
        nextStep={
          focusSession
            ? `${focusSession.title}: ${focusSession.detail}.`
            : focusLoading
              ? "Loading the current weak-focus recommendation..."
              : "Complete several independently scored sessions before changing your study routine."
        }
      />

      <section className="overflow-hidden rounded-2xl border border-[#ded8f5] bg-gradient-to-br from-[#fbf9ff] via-white to-[#f8f5ff] px-4 py-3 shadow-[0_8px_22px_rgba(52,35,110,0.045)]">
        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[1.05fr_1.45fr]">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-800 text-white shadow-[0_12px_26px_rgba(109,40,217,0.2)]">
              <Brain size={27} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#10153d]">
                How You Learn Best
              </h2>

              <p className="mt-2 text-[12px] font-normal leading-5 text-[#11163c]">
                {heroSentence}
              </p>

              <p className="mt-1 max-w-xl text-[10px] font-normal leading-4 text-[#56617c]">
                {metrics?.bestSessionAccuracy !== null && metrics?.bestSessionAccuracy !== undefined
                  ? `Your strongest measured session range is based on ${formatPercent(metrics.bestSessionAccuracy)} recorded accuracy in that duration bucket.`
                  : "Session-length conclusions will appear after scored study sessions with duration data are recorded."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <HeroMetric
              icon={<Clock3 size={17} />}
              title="Best Session Length"
              value={bestSessionLength}
              caption={
                metrics?.bestSessionAccuracy !== null && metrics?.bestSessionAccuracy !== undefined
                  ? `${formatPercent(metrics.bestSessionAccuracy)} measured accuracy`
                  : "Needs scored session data"
              }
              tone="violet"
            />

            <HeroMetric
              icon={<Target size={17} />}
              title="Focus Score"
              value={formatScore(metrics?.focusScore)}
              caption={metrics?.focusScore ? "Calculated from scored recall and active-day consistency" : "Needs more scored activity"}
              tone="blue"
            />

            <HeroMetric
              icon={<CheckCircle2 size={17} />}
              title="Effective Study Time"
              value={effectiveStudy}
              caption="Time with scored recall"
              tone="green"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.05fr_1.05fr]">
        <LearningCard
          title="Best Study Pattern"
          subtitle="Follow this cycle when the weak-focus queue is available."
        >
          <div className="space-y-4">
            <PatternStep
              number="1"
              icon={<Brain size={15} />}
              title="Review weak rule"
              text={
                focusSession
                  ? focusSession.ruleTitle
                  : "A weak-focus rule will appear after enough scored data is recorded."
              }
            />
            <PatternStep
              number="2"
              icon={<Keyboard size={15} />}
              title="Type from memory"
              text="Reproduce the rule in your own words before checking the answer."
            />
            <PatternStep
              number="3"
              icon={<CheckCircle2 size={15} />}
              title="Retest once"
              text="Check your answer and repeat the rule if recall is still unstable."
            />

            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-normal leading-4 text-emerald-800">
              Immediate recall plus retest is used as a study pattern. The actual target rule comes from your live weak-focus queue.
            </div>
          </div>
        </LearningCard>

        <LearningCard
          title="Learning Behavior Mix"
          subtitle="Your scored attempts by training method."
        >
          {metricsLoading ? (
            <EmptyLearningState text="Loading real training-mode data..." />
          ) : totalModeAttempts > 0 ? (
            <div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <div className="relative mx-auto h-32 w-32">
                  <div
                    className="h-32 w-32 rounded-full"
                    style={{ background: donutGradient }}
                  />
                  <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <div className="text-[20px] font-semibold tracking-[-0.04em] text-[#10153d]">
                      {totalModeAttempts}
                    </div>
                    <div className="text-[9px] font-normal text-slate-500">
                      Attempts
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {modeMix.map((item) => (
                    <ModeLine key={item.key} item={item} />
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-violet-50 px-3 py-2.5 text-[10px] font-normal leading-4 text-[#46306f]">
                <span className="font-semibold text-violet-700">What this means: </span>
                {topModeLabel !== "More data needed"
                  ? `${topModeLabel} is currently your most recorded training method. Use ordering or buzzwords when you keep missing structure or key terms.`
                  : "Training method mix will appear after scored attempts are recorded."}
              </div>
            </div>
          ) : (
            <EmptyLearningState text="Training method mix will appear after scored attempts are recorded." />
          )}
        </LearningCard>

        <LearningCard
          title="Personalized Learning Recommendation"
          subtitle="Connected to the current weak-focus queue."
        >
          <div className="space-y-4">
            <RecommendationLine
              icon={<Target size={18} />}
              tone="violet"
              title={
                focusSession
                  ? focusSession.title
                  : "No weak-focus rule available yet"
              }
              text={
                focusSession
                  ? focusSession.detail
                  : "Complete more scored recall attempts to unlock a live weak-focus recommendation."
              }
            />

            <RecommendationLine
              icon={<CalendarDays size={15} />}
              tone="green"
              title="Repeat weak rules until stable."
              text={
                focusSession?.reviewTimingLabel ||
                "Review timing will appear after enough review data is recorded."
              }
            />

            <RecommendationLine
              icon={<TrendingUp size={15} />}
              tone="amber"
              title="Retest after review."
              text={
                metrics?.focusScore
                  ? "Focus score is calculated from scored recall and active-day consistency."
                  : "Retest guidance becomes stronger after more scored activity is recorded."
              }
            />

            <div className="rounded-xl bg-violet-50 px-3 py-2.5 text-[10px] font-normal leading-4 text-[#46306f]">
              <span className="font-semibold text-violet-700">Focus on quality, not total time. </span>
              Effective scored recall is what moves this page’s signals.
            </div>
          </div>
        </LearningCard>
      </section>

      <section className="rounded-2xl border border-[#ded8f5] bg-white p-4 shadow-[0_8px_22px_rgba(52,35,110,0.035)]">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-[-0.015em] text-[#10153d]">
            Key Takeaway
          </h3>
          <HelpCircle size={13} className="text-slate-400" />
        </div>

        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <TakeawayStep
              icon={<Clock3 size={17} />}
              title="Short Blocks"
              value={bestSessionLength}
              caption="Measured range"
            />
            <TakeawayStep
              icon={<PenLine size={16} />}
              title="Active Recall"
              value={topModeLabel}
              caption="Primary method"
            />
            <TakeawayStep
              icon={<RotateCcw size={16} />}
              title="Repeat & Retest"
              value={focusSession?.reviewTimingLabel || "Pending"}
              caption="Review signal"
            />
            <TakeawayStep
              icon={<TrendingUp size={16} />}
              title="Improve"
              value={hasTrendData ? `${delta >= 0 ? "+" : ""}${delta} points` : "More data needed"}
              caption="Recent movement"
            />
          </div>

          <div className="rounded-2xl bg-violet-50 px-4 py-3 text-[10px] font-normal leading-4 text-[#46306f] lg:w-64">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-violet-700">
              <Sparkles size={14} />
              Your Goal
            </div>
            {focusSession
              ? `Use the live weak-focus queue for ${focusSession.subject}. Repeat weak rules until recall becomes stable.`
              : "Keep recording scored recall attempts so Lexora can identify a reliable weak-focus path."}
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroMetric({
  icon,
  title,
  value,
  caption,
  tone,
}: {
  icon: React.ReactNode
  title: string
  value: string
  caption: string
  tone: "violet" | "blue" | "green"
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "blue"
        ? "text-blue-600"
        : "text-violet-700"

  return (
    <div className="px-4 py-2">
      <div className={toneClass}>{icon}</div>
      <div className="mt-4 text-[11px] font-normal text-[#11163c]">
        {title}
      </div>
      <div className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[#10153d]">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-normal text-slate-500">
        {caption}
      </div>
    </div>
  )
}

function LearningCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e4e7ef] bg-white p-4 shadow-[0_7px_18px_rgba(15,23,42,0.032)]">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-[-0.015em] text-[#10153d]">
            {title}
          </h3>
          <HelpCircle size={13} className="text-slate-400" />
        </div>
        <p className="mt-1 text-[10px] font-normal text-slate-500">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  )
}

function PatternStep({
  number,
  icon,
  title,
  text,
}: {
  number: string
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="grid grid-cols-[28px_34px_1fr] items-start gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-[11px] font-semibold text-violet-700">
        {number}
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-[#10153d]">
          {title}
        </div>
        <div className="mt-0.5 text-[10px] font-normal leading-4 text-slate-500">
          {text}
        </div>
      </div>
    </div>
  )
}

function ModeLine({ item }: { item: ModeMetric }) {
  return (
    <div className="grid grid-cols-[10px_1fr_auto] items-center gap-2.5 text-[10px]">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: MODE_COLORS[item.key] ?? MODE_COLORS.other }}
      />
      <span className="text-[#30395a]">{item.label}</span>
      <span className="font-semibold text-[#10153d]">{item.percentage}%</span>
    </div>
  )
}

function RecommendationLine({
  icon,
  tone,
  title,
  text,
}: {
  icon: React.ReactNode
  tone: "violet" | "green" | "amber"
  title: string
  text: string
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : "bg-violet-50 text-violet-700"

  return (
    <div className="flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-[#10153d]">
          {title}
        </div>
        <div className="mt-0.5 text-[10px] font-normal leading-4 text-[#56617c]">
          {text}
        </div>
      </div>
    </div>
  )
}

function TakeawayStep({
  icon,
  title,
  value,
  caption,
}: {
  icon: React.ReactNode
  title: string
  value: string
  caption: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-semibold text-[#10153d]">
          {title}
        </div>
        <div className="mt-1 text-[11px] font-normal text-[#30395a]">
          {value}
        </div>
        <div className="mt-0.5 text-[9px] font-normal text-slate-500">
          {caption}
        </div>
      </div>
    </div>
  )
}

function EmptyLearningState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[11px] font-normal text-slate-500">
      {text}
    </div>
  )
}

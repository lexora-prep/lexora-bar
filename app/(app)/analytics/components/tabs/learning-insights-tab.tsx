"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Lock,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { RecommendedFocusSession } from "@/lib/analytics/recommendation-engine"
import type {
  DashboardData,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"
import {
  ChartTooltip,
  MiniSparkline,
} from "../shared/chart-components"
import { AnalyticsHelp, AnalyticsInterpretation } from "../shared/analytics-interpretation"

type ChartPoint = {
  date: string
  score: number
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
  primaryWeakArea?: WeakArea
  consistencyScore: number
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
  primaryWeakArea,
  consistencyScore,
}: LearningInsightsTabProps) {
  const router = useRouter()
  const [focusSession, setFocusSession] = useState<RecommendedFocusSession | null>(null)
  const [focusLoading, setFocusLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

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

    loadFocusSession()

    return () => controller.abort()
  }, [])

  const hasTrendData = chartData.some(
    (point) => point.score > 0
  )

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

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use learning insights"
        measures="This page interprets measured recall patterns, recent score movement, consistency, and available study-session signals. It does not claim a learning preference when the supporting data is missing."
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
      <section className="overflow-hidden rounded-2xl border border-[#ded8f5] bg-gradient-to-br from-[#fbf9ff] via-white to-[#f8f5ff] p-4 shadow-[0_8px_24px_rgba(52,35,110,0.045)]">
        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[1.42fr_0.58fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-100 bg-violet-50 px-2.5 text-[11px] font-normal text-violet-700">
                <Sparkles size={13} />
                Learning Signal
              </span>

              <h2 className="text-[17px] font-normal tracking-[-0.025em] text-[#10153d]">
                How You Learn Best
              </h2>
            </div>

            <p className="mt-3 max-w-2xl text-[18px] font-normal leading-[1.4] tracking-[-0.025em] text-[#11163c] md:text-[20px]">
              Short, focused study sessions with{" "}
              <span className="text-violet-700">
                active rule recall
              </span>{" "}
              help you retain rules better.
            </p>

            <p className="mt-3 max-w-2xl text-[12px] font-normal leading-5 text-[#586580]">
              {hasLearningData
                ? `Your current learning profile is based on ${safeNumber(
                    dashboard.ruleAttempts
                  ).toLocaleString()} rule attempts, subject accuracy, weak-area records, and recent score movement.`
                : "Complete more rule-training sessions so Lexora can identify reliable learning patterns."}
            </p>
          </div>

          <BrainVisual />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <InsightCard
            icon={<Brain size={19} />}
            label="TOP INSIGHT"
            title="Active Rule Recall"
            text={
              hasLearningData
                ? "Rule attempts and weak-area review currently provide your strongest measurable learning signal."
                : "Complete rule attempts to activate this insight."
            }
            tone="green"
            data={chartData}
          />

          <InsightCard
            icon={<Clock3 size={19} />}
            label="RECENT SIGNAL"
            title="Score Movement"
            text={
              hasTrendData
                ? delta >= 0
                  ? `Your recent BLL accuracy improved by ${Math.abs(
                      delta
                    )} points.`
                  : `Your recent BLL accuracy decreased by ${Math.abs(
                      delta
                    )} points.`
                : "No recent score movement is available for this range."
            }
            tone="purple"
            data={chartData}
          />

          <InsightCard
            icon={<RotateCcw size={19} />}
            label="REVIEW PRIORITY"
            title={weakestLabel}
            text={
              primaryWeakArea
                ? primaryWeakArea.rule ||
                  primaryWeakArea.title ||
                  primaryWeakArea.topic ||
                  "This weak area needs focused review."
                : "No confirmed weak rule exists yet."
            }
            tone="red"
            data={chartData}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_0.95fr]">
        <CompactCard
          title="Retention Over Time"
          subtitle="Real BLL accuracy from the selected range"
          info="A true retention comparison requires review-event tracking. Only real recorded BLL accuracy is displayed."
        >
          {hasTrendData ? (
            <div className="h-[175px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#eef1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 9,
                      fontWeight: 400,
                    }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 9,
                      fontWeight: 400,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip content={<ChartTooltip />} />

                  <Line
                    name="BLL Accuracy"
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{
                      r: 2.5,
                      fill: "#ffffff",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <CompactEmpty text="No real BLL trend exists for the selected range." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            tone="blue"
            text="Retention comparisons will become available after review-event tracking is connected."
          />
        </CompactCard>

        <CompactCard
          title="Best Study Pattern"
          subtitle="Current recommended workflow"
          info="This is a practical recommendation based on current weak areas and subject accuracy, not a measured causal ranking."
        >
          <div className="space-y-2">
            <PatternRow
              rank="1"
              text="Review weak rule → Active recall → Retest"
              badge={
                weakAreas.length > 0
                  ? "Best current move"
                  : "Needs data"
              }
              active
            />

            <PatternRow
              rank="2"
              text="Rule bank → Focused rule training"
              badge={strongestLabel}
            />

            <PatternRow
              rank="3"
              text="Weak areas → Targeted recall"
              badge={weakestLabel}
            />

            <PatternRow
              rank="4"
              text="Flashcards → Rule review"
              badge="Available"
            />

            <PatternRow
              rank="5"
              text="Study plan → Daily review"
              badge="Available"
            />
          </div>

          <InsightNote
            icon={<Brain size={14} />}
            tone="green"
            text="Start with your weakest confirmed rule, then test recall immediately."
          />
        </CompactCard>

        <CompactCard
          title="Optimal Session Length"
          info="A reliable session-length recommendation requires real study-session duration and performance data."
        >
          <div className="relative mx-auto mt-1 flex h-[160px] max-w-[260px] items-end justify-center overflow-hidden">
            <div className="absolute top-5 h-[145px] w-[230px] rounded-t-[230px] border-[16px] border-b-0 border-slate-100" />

            <div className="absolute top-5 h-[145px] w-[230px] rounded-t-[230px] border-[16px] border-b-0 border-violet-200 opacity-60 [clip-path:polygon(0_0,55%_0,50%_100%,0_100%)]" />

            <div className="relative mb-6 text-center">
              <Lock
                size={18}
                className="mx-auto text-violet-600"
              />

              <div className="mt-2 text-[18px] font-normal tracking-[-0.03em] text-[#10153d]">
                {hasLearningData ? "25–35 min" : "Awaiting data"}
              </div>

              <div className="mt-1 text-[10px] font-normal text-slate-500">
                {hasLearningData ? "Recommended focus range" : "More scored attempts needed"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-normal text-slate-500">
            <div>
              Short
              <div className="mt-0.5 text-[#1b2348]">
                {hasLearningData ? "Tracked" : "Not measured"}
              </div>
            </div>

            <div>
              Best range
              <div className="mt-0.5 text-[#1b2348]">
                {hasLearningData ? "25–35 min" : "Not measured"}
              </div>
            </div>

            <div>
              Fatigue
              <div className="mt-0.5 text-[#1b2348]">
                {hasLearningData ? "Watch drop-off" : "Not measured"}
              </div>
            </div>
          </div>

          <InsightNote
            icon={<Clock3 size={14} />}
            tone="purple"
            text={hasLearningData ? "Use 25–35 minute blocks as the default until more session-linked performance data is collected." : "Complete more scored rule sessions before displaying a recommended time range."}
          />
        </CompactCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <CompactCard
          title="Time of Day Performance"
          badge="Premium"
          info="This heatmap requires timestamped session results grouped by day and hour."
        >
          <div className="relative">
            <div className="mb-2 flex justify-end gap-1">
              {["Morning", "Afternoon", "Evening"].map(
                (label, index) => (
                  <span
                    key={label}
                    className={`rounded-md px-2 py-1 text-[9px] font-normal ${
                      index === 0
                        ? "bg-blue-500 text-white"
                        : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                )
              )}
            </div>

            <div className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] gap-1">
              <div />

              {[
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun",
              ].map((day) => (
                <div
                  key={day}
                  className="pb-1 text-center text-[9px] font-normal text-slate-500"
                >
                  {day}
                </div>
              ))}

              {[
                "6 AM",
                "9 AM",
                "12 PM",
                "3 PM",
                "6 PM",
                "9 PM",
              ].flatMap((time) => [
                <div
                  key={`${time}-label`}
                  className="flex items-center text-[9px] font-normal text-slate-500"
                >
                  {time}
                </div>,

                ...Array.from({
                  length: 7,
                }).map((_, index) => (
                  <div
                    key={`${time}-${index}`}
                    className="h-7 rounded-[3px] border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/70"
                  />
                )),
              ])}
            </div>

            <div className="absolute inset-x-10 bottom-8 top-8 flex items-center justify-center rounded-xl bg-white/72 backdrop-blur-[1px]">
              <div className="text-center">
                <Lock
                  size={17}
                  className="mx-auto text-blue-600"
                />

                <div className="mt-2 text-[11px] font-normal text-[#182044]">
                  Hourly analytics not connected
                </div>
              </div>
            </div>
          </div>

          <InsightNote
            icon={<Clock3 size={14} />}
            tone="blue"
            text="Lexora will identify your strongest study hours after timestamped performance tracking is available."
          />
        </CompactCard>

        <CompactCard
          title="What Improves Your Score the Most"
          subtitle="Current available BLL signals"
          info="These bars describe current available signals. They are not causal improvement estimates."
        >
          <div className="space-y-3">
            <ImpactRow
              label="Strongest subject accuracy"
              value={strongestSubject?.accuracy || 0}
              text={
                strongestSubject
                  ? `${strongestSubject.accuracy}%`
                  : "No data"
              }
            />

            <ImpactRow
              label="Current BLL accuracy"
              value={currentScore}
              text={`${currentScore}%`}
            />

            <ImpactRow
              label="Recent score movement"
              value={Math.min(
                100,
                Math.abs(delta) * 10
              )}
              text={`${delta >= 0 ? "+" : "-"}${Math.abs(
                delta
              )} pts`}
            />

            <ImpactRow
              label="Consistency"
              value={Math.round(
                consistencyScore * 20
              )}
              text={`${consistencyScore}/5`}
            />

            <ImpactRow
              label="Weak-area pressure"
              value={Math.min(
                100,
                weakAreas.length * 12
              )}
              text={`${weakAreas.length} rule${
                weakAreas.length === 1 ? "" : "s"
              }`}
              danger
            />
          </div>

          <InsightNote
            icon={<TrendingUp size={14} />}
            tone="green"
            text="Active recall and consistent review are the clearest actionable signals currently available."
          />
        </CompactCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.72fr_1.28fr]">
        <CompactCard
          title="Consistency Insights"
          info="Consistency uses recent active BLL trend days."
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div
              className="flex h-[118px] w-[118px] shrink-0 items-center justify-center rounded-full p-[10px]"
              style={{
                background: `conic-gradient(#6d28d9 ${
                  Math.min(
                    100,
                    consistencyScore * 20
                  )
                }%, #ede9fe 0)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                <div className="text-center">
                  <div className="text-[29px] font-normal tracking-[-0.04em] text-[#11163c]">
                    {consistencyScore}
                  </div>

                  <div className="text-[10px] font-normal text-slate-500">
                    / 5
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <MetricLine
                icon={<CalendarDays size={15} />}
                label="Active days in recent range"
                value={`${activeDays} / 7`}
              />

              <MetricLine
                icon={<Target size={15} />}
                label="Current BLL score"
                value={`${currentScore}%`}
              />

              <MetricLine
                icon={<TrendingUp size={15} />}
                label="Recent direction"
                value={
                  delta > 0
                    ? "Improving"
                    : delta < 0
                      ? "Declining"
                      : "Stable"
                }
              />
            </div>
          </div>

          <InsightNote
            icon={<CheckCircle2 size={14} />}
            tone="green"
            text="Consistency becomes more reliable when activity is spread across several days."
          />
        </CompactCard>

        <CompactCard
          title="Learning Behavior Mix"
          badge="Premium"
          subtitle="Behavior-level tracking"
          info="This requires separate tracking for active recall, reading, application, explanation, and passive review."
        >
          <div className="grid min-h-[170px] grid-cols-1 items-center gap-5 md:grid-cols-[0.78fr_1.22fr]">
            <div className="relative mx-auto flex h-[132px] w-[132px] items-center justify-center rounded-full bg-[conic-gradient(#ddd6fe_0_25%,#dbeafe_25%_50%,#d1fae5_50%_70%,#fef3c7_70%_86%,#e5e7eb_86%_100%)] opacity-65">
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white">
                <Lock
                  size={18}
                  className="text-violet-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              {[
                ["Rule recall", "Tracking unavailable", "bg-violet-500"],
                ["Reading and understanding", "Tracking unavailable", "bg-blue-500"],
                ["Active application", "Tracking unavailable", "bg-emerald-500"],
                ["Written explanation", "Tracking unavailable", "bg-amber-400"],
                ["Passive review", "Tracking unavailable", "bg-slate-400"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-[10px] font-normal"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${color}`}
                  />

                  <span className="min-w-0 flex-1 text-[#303b5d]">
                    {label}
                  </span>

                  <span className="text-slate-400">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <InsightNote
            icon={<Brain size={14} />}
            tone="purple"
            text="Behavior mix will appear after each learning mode records separate activity."
          />
        </CompactCard>
      </section>

      <section className="rounded-2xl border border-[#ded8f5] bg-gradient-to-r from-white via-[#fbf9ff] to-[#f7f2ff] p-3 shadow-[0_8px_22px_rgba(52,35,110,0.045)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-800 text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)]">
            <Sparkles size={20} />
          </div>

          <div className="min-w-[210px] flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-normal text-[#11163c]">
                Current Learning Recommendation
              </h3>

              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[9px] font-normal text-violet-700">
                Learning Signal
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-[11px] font-normal leading-4 text-[#56617c]">
              {primaryWeakArea
                ? `Begin with ${primaryWeakArea.subject}: ${
                    primaryWeakArea.rule ||
                    primaryWeakArea.title ||
                    "the current shared weak-focus rule"
                  }. Review it, test active recall, and repeat until recall becomes stable.`
                : "Complete more rule training to generate a reliable personalized recommendation."}
            </p>
          </div>

          <RecommendationChip
            icon={<Brain size={13} />}
            title="Start with"
            value={
              focusSession?.subject ||
              "Weak areas"
            }
          />

          <RecommendationChip
            icon={<Clock3 size={13} />}
            title="Session"
            value={focusSession?.reviewTimingLabel || "Pending"}
          />

          <RecommendationChip
            icon={<RotateCcw size={13} />}
            title="Then"
            value="Retest recall"
          />

          <button
            type="button"
            onClick={() =>
              router.push("/rule-training")
            }
            className="flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-[11px] font-normal text-white shadow-sm transition hover:bg-violet-800"
          >
            Start Recommended Session
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  )
}

function BrainVisual() {
  return (
    <div className="relative hidden min-h-[150px] items-center justify-center lg:flex">
      <div className="absolute h-36 w-36 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="absolute h-32 w-52 -rotate-12 rounded-[100%] border border-violet-200" />
      <div className="absolute h-28 w-52 rotate-12 rounded-[100%] border border-violet-100" />

      <Sparkles
        size={14}
        className="absolute left-[18%] top-[27%] text-violet-400"
      />

      <Sparkles
        size={11}
        className="absolute right-[17%] top-[22%] text-violet-300"
      />

      <Sparkles
        size={9}
        className="absolute right-[23%] bottom-[24%] text-violet-400"
      />

      <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-[40%] bg-gradient-to-br from-violet-200 via-violet-500 to-violet-800 shadow-[0_20px_45px_rgba(109,40,217,0.3)]">
        <Brain
          size={68}
          strokeWidth={1.35}
          className="text-white drop-shadow-lg"
        />
      </div>
    </div>
  )
}

function InsightCard({
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
  data: ChartPoint[]
}) {
  const iconClass =
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

  const stroke =
    tone === "green"
      ? "#10b981"
      : tone === "red"
        ? "#ef4444"
        : "#7c3aed"

  return (
    <div className="rounded-xl border border-[#e5e7ef] bg-white p-3.5 shadow-[0_5px_16px_rgba(15,23,42,0.035)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div
            className={`text-[8px] font-normal tracking-[0.04em] ${labelClass}`}
          >
            {label}
          </div>

          <div className="mt-1.5 truncate text-[13px] font-normal text-[#11163c]">
            {title}
          </div>

          <p className="mt-1 text-[10px] font-normal leading-4 text-[#5c6882]">
            {text}
          </p>
        </div>
      </div>

      <div className="mt-3 h-8">
        <MiniSparkline
          data={data}
          stroke={stroke}
        />
      </div>
    </div>
  )
}

function CompactCard({
  title,
  subtitle,
  badge,
  info,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  info?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#e4e7ef] bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-normal tracking-[-0.015em] text-[#11163c]">
              {title}
            </h3>

            {info ? <AnalyticsHelp text={info} /> : null}

            {badge ? (
              <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[8px] font-normal text-violet-700">
                {badge}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p className="mt-1 text-[9px] font-normal text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
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
      className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[10px] font-normal ${
        active
          ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
          : "bg-slate-50 text-[#2e385a]"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] text-[#4a5673]">
        {rank}
      </span>

      <span className="min-w-0 flex-1">
        {text}
      </span>

      <span className="max-w-[110px] truncate rounded-md bg-white px-1.5 py-0.5 text-[8px] text-slate-500">
        {badge}
      </span>
    </div>
  )
}

function ImpactRow({
  label,
  value,
  text,
  danger = false,
}: {
  label: string
  value: number
  text: string
  danger?: boolean
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-normal">
        <span className="text-[#313b5c]">
          {label}
        </span>

        <span
          className={
            danger
              ? "text-rose-600"
              : "text-[#11163c]"
          }
        >
          {text}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            danger
              ? "bg-rose-400"
              : "bg-emerald-500"
          }`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value)
            )}%`,
          }}
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
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[9px] font-normal text-slate-500">
          {label}
        </div>

        <div className="mt-0.5 text-[12px] font-normal text-[#11163c]">
          {value}
        </div>
      </div>
    </div>
  )
}

function RecommendationChip({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <div className="hidden min-w-[105px] items-center gap-2 rounded-lg border border-violet-100 bg-white px-2.5 py-2 xl:flex">
      <div className="text-violet-700">
        {icon}
      </div>

      <div>
        <div className="text-[8px] font-normal text-slate-400">
          {title}
        </div>

        <div className="mt-0.5 max-w-[90px] truncate text-[9px] font-normal text-[#30395a]">
          {value}
        </div>
      </div>
    </div>
  )
}

function InsightNote({
  icon,
  text,
  tone,
}: {
  icon: ReactNode
  text: string
  tone: "blue" | "green" | "purple"
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-violet-50 text-violet-700"

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[9px] font-normal leading-4 ${className}`}
    >
      <span className="mt-0.5 shrink-0">
        {icon}
      </span>

      <span>{text}</span>
    </div>
  )
}

function CompactEmpty({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex min-h-[175px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[10px] font-normal leading-4 text-slate-500">
      {text}
    </div>
  )
}

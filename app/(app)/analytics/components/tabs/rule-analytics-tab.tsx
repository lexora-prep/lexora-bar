"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
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
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  CircleX,
  FileText,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { RecommendedFocusSession } from "@/lib/analytics/recommendation-engine"

import type {
  ChartPoint,
  DashboardData,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"

import { safeNumber } from "../../lib/analytics-calculations"
import { AnalyticsHelp, AnalyticsInterpretation, FullTextLabel } from "../shared/analytics-interpretation"

type RuleAnalyticsTabProps = {
  dashboard?: DashboardData
  subjects?: SubjectDiagnostic[]
  chartData?: ChartPoint[]
  currentScore: number
  delta: number
  weakAreas?: WeakArea[]
  strongestSubject?: SubjectDiagnostic
  weakestSubject?: SubjectDiagnostic
}

type Tone = "violet" | "green" | "red" | "amber"

type SparkPoint = {
  label: string
  value: number
}

type IncorrectTrendPoint = {
  date: string
  incorrect: number
}

export default function RuleAnalyticsTab({
  dashboard,
  subjects = [],
  chartData = [],
  currentScore = 0,
  delta = 0,
  weakAreas = [],
  strongestSubject,
  weakestSubject,
}: RuleAnalyticsTabProps) {
  const router = useRouter()

  const [subjectsOpen, setSubjectsOpen] = useState(false)
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

  const totalAttempts = safeNumber(dashboard?.ruleAttempts)

  const totalRules = subjects.reduce(
    (sum, subject) => sum + safeNumber(subject.total),
    0
  )

  const completedRules = subjects.reduce(
    (sum, subject) => sum + safeNumber(subject.completed),
    0
  )

  const correctAttempts = Math.round(
    totalAttempts * (currentScore / 100)
  )

  const incorrectAttempts = Math.max(
    0,
    totalAttempts - correctAttempts
  )

  const unattemptedRules = Math.max(
    0,
    totalRules - completedRules
  )

  const attemptedPercent =
    totalRules > 0
      ? Math.round((completedRules / totalRules) * 100)
      : 0

  const unattemptedPercent =
    totalRules > 0
      ? Math.round((unattemptedRules / totalRules) * 100)
      : 0

  const incorrectPercent = Math.max(
    0,
    100 - currentScore
  )

  const incorrectTrend: IncorrectTrendPoint[] =
    chartData
      .filter((point) => point.score > 0)
      .map((point) => ({
        date: point.date,
        incorrect: Math.max(
          0,
          100 - point.score
        ),
      }))

  const weakestRules = [...weakAreas]
    .sort((a, b) => {
      const firstAccuracy =
        typeof a.accuracy === "number"
          ? a.accuracy
          : 100

      const secondAccuracy =
        typeof b.accuracy === "number"
          ? b.accuracy
          : 100

      return firstAccuracy - secondAccuracy
    })
    .slice(0, 5)

  const weakestSubjects = [...subjects]
    .filter(
      (subject) =>
        subject.completed > 0 &&
        subject.accuracy > 0
    )
    .sort(
      (first, second) =>
        first.accuracy - second.accuracy
    )
    .slice(0, 5)

  const subjectComparison = [...subjects]
    .filter(
      (subject) =>
        subject.completed > 0 &&
        Number.isFinite(subject.accuracy)
    )
    .sort(
      (first, second) =>
        first.accuracy - second.accuracy
    )

  const recommendationRule = focusSession?.ruleTitle ?? null

  const recommendationAccuracy =
    typeof focusSession?.accuracy === "number"
      ? safeNumber(focusSession.accuracy)
      : null

  const recommendationAttempts = safeNumber(
    focusSession?.attempts
  )

  const hasRecommendation = Boolean(focusSession)

  const recommendationEvidence =
    recommendationAccuracy !== null
      ? `${recommendationAccuracy}% · ${recommendationAttempts} attempts`
      : recommendationAttempts > 0
        ? `${recommendationAttempts} attempts`
        : "Insufficient data"

  const focusTags = [
    focusSession?.subject,
    focusSession?.topic,
    focusSession?.subtopic,
    strongestSubject?.name,
  ]
    .filter(
      (value): value is string =>
        Boolean(value)
    )
    .slice(0, 4)

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use rule analytics"
        measures="This page separates library coverage from independently scored recall performance. Rules attempted shows activity; recall accuracy shows performance; unattempted rules show remaining coverage."
        result={
          totalAttempts === 0
            ? "No independently scored rule attempts are available for the selected range."
            : `You recorded ${totalAttempts.toLocaleString()} attempts at ${currentScore}% independent recall accuracy. ${weakestRules.length > 0 ? `${weakestRules.length} highest-cost recall ${weakestRules.length === 1 ? "gap is" : "gaps are"} displayed below.` : "No confirmed weak rule is currently available."}`
        }
        nextStep={
          focusSession
            ? `${focusSession.title}: ${focusSession.detail}.`
            : focusLoading
              ? "Loading the current weak-focus recommendation..."
              : "Continue independently scored recall until a reliable rule-level priority can be identified."
        }
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={<FileText size={18} />}
          title="Rules Attempted"
          subtitle={
            totalRules > 0
              ? `out of ${totalRules.toLocaleString()} total rules`
              : "Total rule count unavailable"
          }
          value={completedRules.toLocaleString()}
          footer={`${attemptedPercent}% of rule library`}
          tone="violet"
          data={buildScoreSparkline(
            chartData,
            attemptedPercent
          )}
        />

        <KpiCard
          icon={<Target size={18} />}
          title="Recall Accuracy"
          value={`${currentScore}%`}
          footer={`${delta >= 0 ? "↑" : "↓"} ${Math.abs(
            delta
          )} pts vs previous active day`}
          tone="green"
          data={buildScoreSparkline(
            chartData,
            currentScore
          )}
        />

        <KpiCard
          icon={<CheckCircle2 size={18} />}
          title="Correct Attempts"
          value={correctAttempts.toLocaleString()}
          footer={`${currentScore}% of attempts`}
          tone="green"
          data={buildScoreSparkline(
            chartData,
            currentScore
          )}
        />

        <KpiCard
          icon={<CircleX size={18} />}
          title="Incorrect Attempts"
          value={incorrectAttempts.toLocaleString()}
          footer={`${incorrectPercent}% of attempts`}
          tone="red"
          data={buildInverseSparkline(chartData)}
        />

        <KpiCard
          icon={<CircleMinus size={18} />}
          title="Unattempted Rules"
          subtitle={
            totalRules > 0
              ? `out of ${totalRules.toLocaleString()} total rules`
              : "Total rule count unavailable"
          }
          value={unattemptedRules.toLocaleString()}
          footer={`${unattemptedPercent}% of rule library`}
          tone="amber"
          data={buildFlatSparkline(
            unattemptedPercent
          )}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.92fr_1fr_1.18fr]">
        <CompactCard
          title="Error Analysis"
          info="Error-cause analytics require a stored reason for each incorrect attempt."
        >
          <CompactEmpty text="No error-cause data has been recorded yet. Lexora will not display invented error categories or percentages." />
        </CompactCard>

        <CompactCard
          title="Difficulty Performance"
          info="Difficulty analytics require a stored difficulty value for each rule."
        >
          <CompactEmpty text="No real rule-difficulty data is available yet." />
        </CompactCard>

        <CompactCard
          title="Training Method Performance"
          info="Method-level analytics require attempts to store their actual training mode."
        >
          <CompactEmpty text="No real training-method data is available yet." />
        </CompactCard>

      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.92fr_1fr_1.18fr]">
        <CompactCard
          title="Subject Accuracy Comparison"
          info="This comparison uses real attempted-rule counts and real subject accuracy."
        >
          {subjectComparison.length > 0 ? (
            <div className="space-y-2">
              {subjectComparison
                .slice(0, 6)
                .map((subject, index) => (
                  <div
                    key={subject.name}
                    className="grid min-h-8 grid-cols-[20px_minmax(0,1fr)_48px] items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-normal ${
                        index === 0
                          ? "bg-rose-50 text-rose-600"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[9px] font-normal text-[#30395a]">
                          {subject.name}
                        </span>

                        <span className="shrink-0 text-[8px] font-normal text-slate-400">
                          {subject.completed} attempted
                        </span>
                      </div>

                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${
                            subject.accuracy < 70
                              ? "bg-rose-400"
                              : subject.accuracy < 80
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                subject.accuracy
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <span
                      className={`text-right text-[9px] font-normal ${
                        subject.accuracy < 70
                          ? "text-rose-600"
                          : subject.accuracy < 80
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {subject.accuracy}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <CompactEmpty text="No real subject-comparison data exists yet." />
          )}

          {weakestSubject && strongestSubject ? (
            <InsightNote
              icon={<Brain size={14} />}
              tone="violet"
              text={`${weakestSubject.name} is currently your lowest confirmed subject at ${weakestSubject.accuracy}%. ${strongestSubject.name} is currently your highest at ${strongestSubject.accuracy}%.`}
            />
          ) : null}
        </CompactCard>

        <CompactCard
          title="Highest-Cost Recall Gaps"
          info="These are assessed rules creating the greatest current recall cost because of low accuracy, repeated misses, or both. The list does not include untouched rules."
        >
          {weakestRules.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_68px_56px] gap-2 px-2 text-[8px] font-normal text-slate-400">
                <span>Rule and context</span>

                <span className="text-center">
                  Accuracy
                </span>

                <span className="text-right">
                  Attempts
                </span>
              </div>

              {weakestRules.map((area) => (
                <div
                  key={
                    area.ruleId ||
                    area.id ||
                    `${area.subject}-${area.title}`
                  }
                  className="grid min-h-10 grid-cols-[minmax(0,1fr)_68px_56px] items-start gap-2 border-b border-slate-100 px-2.5 py-2.5 text-[9px] font-normal last:border-b-0"
                >
                  <FullTextLabel
                    primary={area.rule || area.title || "Untitled rule"}
                    secondary={[area.subject, area.topic, area.subtopic]
                      .filter(Boolean)
                      .join(" · ")}
                  />

                  <div className="text-center text-rose-600">
                    {typeof area.accuracy ===
                    "number"
                      ? `${area.accuracy}%`
                      : "—"}
                  </div>

                  <div className="text-right text-slate-500">
                    {safeNumber(area.attempts)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CompactEmpty text="No confirmed weak rules exist yet." />
          )}

          <InsightNote
            icon={<AlertTriangle size={14} />}
            tone="red"
            text="Review the first rule before moving down the list. A rule remains high priority only when recorded evidence shows low independent recall or repeated misses."
          />
        </CompactCard>

        <CompactCard
          title="Recent Incorrect Trend"
          info="This converts real daily accuracy into an incorrect percentage."
        >
          {incorrectTrend.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={incorrectTrend}
                  margin={{
                    top: 10,
                    right: 10,
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

                  <Tooltip
                    content={
                      <IncorrectTooltip />
                    }
                  />

                  <Line
                    name="Incorrect Recall"
                    type="monotone"
                    dataKey="incorrect"
                    stroke="#dc2626"
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
            <CompactEmpty text="No incorrect-trend data exists for this range." />
          )}

          <InsightNote
            icon={
              delta >= 0 ? (
                <TrendingDown size={14} />
              ) : (
                <TrendingUp size={14} />
              )
            }
            tone={
              delta >= 0 ? "green" : "red"
            }
            text={
              delta >= 0
                ? `Incorrect recall decreased as accuracy improved by ${Math.abs(
                    delta
                  )} points.`
                : `Incorrect recall increased as accuracy fell by ${Math.abs(
                    delta
                  )} points.`
            }
          />
        </CompactCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-[#ded8f5] bg-gradient-to-r from-[#fbf9ff] to-white p-3.5 shadow-[0_7px_20px_rgba(52,35,110,0.04)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Brain size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-normal text-[#11163c]">
                  Rule Insight
                </h3>

                <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[8px] font-normal text-violet-700">
                  <Sparkles size={9} />
                  Real activity
                </span>
              </div>

              <p className="mt-2 text-[11px] font-normal leading-5 text-[#30395a]">
                {focusSession ? (
                  <>
                    {focusSession.subject} contains the current top rule in the shared weak-focus queue:{" "}
                    {focusSession.ruleTitle}.
                    {recommendationAccuracy !== null
                      ? ` Recorded accuracy is ${recommendationAccuracy}% across ${recommendationAttempts} attempts.`
                      : recommendationAttempts > 0
                        ? ` It has ${recommendationAttempts} recorded attempts.`
                        : ""}
                  </>
                ) : weakestSubject ? (
                  <>
                    {weakestSubject.name} is currently
                    your lowest confirmed subject at{" "}
                    {weakestSubject.accuracy}% accuracy
                    across {weakestSubject.completed}{" "}
                    attempted rules.
                  </>
                ) : (
                  "Complete more rule attempts to generate a reliable rule-level insight."
                )}
              </p>

              {focusTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {focusTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-violet-50 px-2 py-1 text-[8px] font-normal text-violet-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ded8f5] bg-white p-3.5 shadow-[0_7px_20px_rgba(52,35,110,0.04)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Target size={21} />
            </div>

            <div className="min-w-[210px] flex-1">
              <h3 className="text-[13px] font-normal text-[#11163c]">
                Recommended Next Step
              </h3>

              <p className="mt-1 text-[11px] font-normal leading-4 text-[#30395a]">
                {focusSession ? (
                  <>
                    Start weak-focus recall for{" "}
                    {focusSession.subject}:{" "}
                    {focusSession.ruleTitle}.
                  </>
                ) : focusLoading ? (
                  "Loading the current weak-focus recommendation."
                ) : (
                  "Not enough real rule-level data exists to generate a targeted session."
                )}
              </p>
            </div>

            <RecommendationMetric
              label="Focus area"
              value={
                focusSession
                  ? focusSession.subject
                  : "Insufficient data"
              }
            />

            <RecommendationMetric
              label="Current evidence"
              value={
                hasRecommendation
                  ? recommendationEvidence
                  : "Insufficient data"
              }
            />

            <button
              type="button"
              disabled={!focusSession}
              onClick={() => {
                if (!focusSession?.route) return
                router.push(focusSession.route)
              }}
              className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-[10px] font-normal transition ${
                focusSession
                  ? "border-violet-600 bg-white text-violet-700 hover:bg-violet-50"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              Start Recommended Session
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </section>

      {weakestSubjects.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-[#e5e7ef] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.025)]">
          <button
            type="button"
            aria-expanded={subjectsOpen}
            onClick={() =>
              setSubjectsOpen(
                (current) => !current
              )
            }
            className="flex min-h-[50px] w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-200 hover:bg-[#fcfbff]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
              <TrendingDown size={14} />
            </div>

            <div className="min-w-[165px]">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-normal text-[#171d42]">
                  Lowest Subject Accuracy
                </h3>

                <span
                  title="Based only on real attempted-subject data."
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 text-[8px] font-normal text-slate-400"
                >
                  i
                </span>
              </div>

              <p className="mt-0.5 text-[8px] font-normal text-slate-400">
                {weakestSubjects.length} attempted{" "}
                {weakestSubjects.length === 1
                  ? "subject"
                  : "subjects"}
              </p>
            </div>

            {!subjectsOpen ? (
              <>
                <div className="hidden h-7 w-px bg-slate-100 sm:block" />

                <div className="flex min-w-0 max-w-[380px] flex-1 items-center gap-3">
                  <span className="max-w-[150px] truncate text-[9px] font-normal text-[#30395a]">
                    {weakestSubjects[0]?.name}
                  </span>

                  <div className="hidden h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-rose-50 sm:block">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            weakestSubjects[0]
                              ?.accuracy ?? 0
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="shrink-0 text-[9px] font-normal text-rose-600">
                    {weakestSubjects[0]
                      ?.accuracy ?? 0}
                    %
                  </span>

                  {weakestSubjects.length > 1 ? (
                    <span className="hidden shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[8px] font-normal text-slate-500 md:inline-flex">
                      +{weakestSubjects.length - 1} more
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1 text-[8px] font-normal text-slate-400">
                Full subject list
              </div>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[9px] font-normal text-violet-700">
              <span className="hidden sm:inline">
                {subjectsOpen
                  ? "Hide subjects"
                  : "View subjects"}
              </span>

              <ChevronDown
                size={13}
                className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  subjectsOpen
                    ? "rotate-180"
                    : "rotate-0"
                }`}
              />
            </div>
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              subjectsOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={`border-t border-slate-100 bg-[#fdfcff] px-4 transition-[padding,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  subjectsOpen
                    ? "translate-y-0 py-3"
                    : "-translate-y-2 py-0"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {weakestSubjects.map(
                    (subject, index) => (
                      <div
                        key={subject.name}
                        className="flex h-9 w-[168px] items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 shadow-[0_2px_7px_rgba(15,23,42,0.025)]"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[8px] font-normal ${
                            index === 0
                              ? "bg-rose-50 text-rose-600"
                              : "bg-violet-50 text-violet-600"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-[8px] font-normal text-[#30395a]">
                              {subject.name}
                            </span>

                            <span
                              className={`shrink-0 text-[8px] font-normal ${
                                subject.accuracy < 70
                                  ? "text-rose-600"
                                  : subject.accuracy < 80
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                              }`}
                            >
                              {subject.accuracy}%
                            </span>
                          </div>

                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                subject.accuracy < 70
                                  ? "bg-rose-400"
                                  : subject.accuracy < 80
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                              }`}
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    subject.accuracy
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function KpiCard({
  icon,
  title,
  subtitle,
  value,
  footer,
  tone,
  data,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  value: string
  footer: string
  tone: Tone
  data: SparkPoint[]
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-600"
          : "bg-violet-50 text-violet-700"

  const stroke =
    tone === "green"
      ? "#10b981"
      : tone === "red"
        ? "#dc2626"
        : tone === "amber"
          ? "#f59e0b"
          : "#7c3aed"

  return (
    <div className="rounded-2xl border border-[#e4e7ef] bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-normal text-[#273153]">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-0.5 truncate text-[8px] font-normal text-slate-400">
              {subtitle}
            </div>
          ) : null}

          <div className="mt-2 text-[22px] font-normal tracking-[-0.04em] text-[#11163c]">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1 text-[8px] font-normal text-slate-500">
          {footer}
        </div>

        <div className="h-8 w-20 shrink-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={1.8}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function CompactCard({
  title,
  info,
  children,
}: {
  title: string
  info?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#e4e7ef] bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[13px] font-normal tracking-[-0.015em] text-[#11163c]">
          {title}
        </h3>

        {info ? <AnalyticsHelp text={info} /> : null}
      </div>

      {children}
    </section>
  )
}


function InsightNote({
  icon,
  text,
  tone,
}: {
  icon: ReactNode
  text: string
  tone: "violet" | "green" | "red"
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "bg-rose-50 text-rose-700"
        : "bg-violet-50 text-violet-700"

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[9px] font-normal leading-4 ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">
        {icon}
      </span>

      <span>{text}</span>
    </div>
  )
}

function RecommendationMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="hidden min-w-[105px] xl:block">
      <div className="text-[8px] font-normal text-slate-400">
        {label}
      </div>

      <div className="mt-1 max-w-[150px] break-words text-[9px] font-normal leading-4 text-[#30395a]">
        {value}
      </div>
    </div>
  )
}

function CompactEmpty({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex min-h-[165px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[10px] font-normal leading-4 text-slate-500">
      {text}
    </div>
  )
}

function IncorrectTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{
    value?: number
  }>
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-[9px] font-normal text-[#30395a]">
        {label}
      </div>

      <div className="mt-1 text-[9px] font-normal text-rose-600">
        Incorrect recall:{" "}
        {payload[0]?.value ?? 0}%
      </div>
    </div>
  )
}

function buildScoreSparkline(
  chartData: ChartPoint[],
  fallback: number
): SparkPoint[] {
  const activeData = chartData
    .filter((point) => point.score > 0)
    .slice(-7)
    .map((point) => ({
      label: point.date,
      value: point.score,
    }))

  if (activeData.length > 0) {
    return activeData
  }

  return buildFlatSparkline(fallback)
}

function buildInverseSparkline(
  chartData: ChartPoint[]
): SparkPoint[] {
  const activeData = chartData
    .filter((point) => point.score > 0)
    .slice(-7)
    .map((point) => ({
      label: point.date,
      value: Math.max(
        0,
        100 - point.score
      ),
    }))

  if (activeData.length > 0) {
    return activeData
  }

  return buildFlatSparkline(0)
}

function buildFlatSparkline(
  value: number
): SparkPoint[] {
  return Array.from(
    {
      length: 7,
    },
    (_, index) => ({
      label: String(index + 1),
      value,
    })
  )
}

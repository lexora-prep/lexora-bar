"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import {
  ArrowRight,
  BarChart3,
  Check,
  CircleAlert,
  Lightbulb,
  Scale,
  Target,
  Trophy,
  Wrench,
} from "lucide-react"

import type {
  StrengthSubjectAnalytics,
  StrengthsWeaknessesAnalyticsData,
  WeakRuleAnalytics,
} from "../../types"
import { GlassCard } from "../shared/glass-card"
import { AnalyticsInterpretation } from "../shared/analytics-interpretation"
import { LoadingState } from "../shared/loading-state"
import { EmptyCompact } from "../shared/feedback-states"

type StrengthsWeaknessesTabProps = {
  data: StrengthsWeaknessesAnalyticsData | null
  loading: boolean
  error: string | null
}

export default function StrengthsWeaknessesTab({
  data,
  loading,
  error,
}: StrengthsWeaknessesTabProps) {
  const router = useRouter()

  if (loading) {
    return <LoadingState compact text="Loading strengths and weaknesses..." />
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-[11px] font-normal text-rose-700">
        {error ||
          "Strengths and weaknesses analytics could not be loaded."}
      </div>
    )
  }

  const hasAnyAnalysis =
    data.summary.totalScoredAttempts > 0

  function startWeakFocus(rule: WeakRuleAnalytics) {
    const params = new URLSearchParams({
      mode: "weak_focus",
      ruleId: rule.ruleId,
      subject: rule.subjectName,
      autoStart: "1",
      returnTo: "/analytics",
    })

    if (rule.topicName) {
      params.set("topic", rule.topicName)
    }

    if (rule.subtopicName) {
      params.set("subtopic", rule.subtopicName)
    }

    router.push(`/rule-training?${params.toString()}`)
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use strengths and weaknesses"
        measures="Strengths and weaknesses are based on independently scored attempts, current mastery, and minimum evidence thresholds. Study-only exposure is not treated as proof of strength or weakness."
        result={
          !hasAnyAnalysis
            ? "No independently scored attempts are available for this analysis."
            : `${data.summary.strongSubjectCount} confirmed ${data.summary.strongSubjectCount === 1 ? "strength" : "strengths"}, ${data.summary.weakSubjectCount} weak ${data.summary.weakSubjectCount === 1 ? "subject" : "subjects"}, and ${data.summary.highPriorityRuleCount} high-priority ${data.summary.highPriorityRuleCount === 1 ? "rule" : "rules"} are recorded for this range.`
        }
        nextStep={
          data.nextBestAction
            ? `Start with ${data.nextBestAction.subjectName} — ${data.nextBestAction.title}. Complete an independent recall attempt before reviewing the answer.`
            : "Complete more independently scored attempts before selecting a targeted weakness session."
        }
      />
      <section className="rounded-2xl border border-[#e4e7ef] bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-[15px] font-normal tracking-[-0.015em] text-[#11163c]">
            Your Performance at a Glance
          </h2>

          <p className="mt-1 text-[9px] font-normal text-slate-500">
            Based on real scored rule activity for {data.range.label.toLowerCase()}.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryMetric
            icon={<Trophy size={20} />}
            iconClass="bg-emerald-50 text-emerald-600"
            label="Strong Areas"
            value={data.summary.strongSubjectCount}
            unit={
              data.summary.strongSubjectCount === 1
                ? "subject"
                : "subjects"
            }
            description={`Shown from the first scored attempt. Confirmed after ${data.thresholds.confirmedSubjectAttempts}+ attempts.`}
          />

          <SummaryMetric
            icon={<Wrench size={20} />}
            iconClass="bg-amber-50 text-amber-600"
            label="Needs Work"
            value={data.summary.weakSubjectCount}
            unit={
              data.summary.weakSubjectCount === 1
                ? "subject"
                : "subjects"
            }
            description={`Shown from the first scored attempt. Confirmed after ${data.thresholds.confirmedSubjectAttempts}+ attempts.`}
          />

          <SummaryMetric
            icon={<Target size={20} />}
            iconClass="bg-rose-50 text-rose-600"
            label="High Priority"
            value={data.summary.highPriorityRuleCount}
            unit={
              data.summary.highPriorityRuleCount === 1
                ? "topic"
                : "topics"
            }
            description={`Rules below 50% average score. Confirmed after ${data.thresholds.confirmedRuleAttempts}+ attempts.`}
          />
        </div>
      </section>

      {!hasAnyAnalysis ? (
        <GlassCard title="Strengths and Weaknesses">
          <EmptyCompact text="Complete scored rule-training attempts to generate this analysis. No sample data is displayed." />
        </GlassCard>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.82fr_1.38fr]">
            <GlassCard
              title="Your Strengths"
              info={`Subjects appear from the first scored attempt. Results become confirmed after ${data.thresholds.confirmedSubjectAttempts} attempts.`}
            >
              {data.strengths.length > 0 ? (
                <div>
                  <div className="grid grid-cols-[1fr_150px_42px] gap-3 border-b border-slate-100 pb-2 text-[8px] font-normal text-slate-400">
                    <span>Subject</span>
                    <span>Accuracy</span>
                    <span className="text-right">Score</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {data.strengths.slice(0, 6).map((subject) => (
                      <SubjectRow
                        key={subject.subjectId || subject.name}
                        subject={subject}
                        tone="strength"
                      />
                    ))}
                  </div>

                  <InsightStrip
                    tone="green"
                    icon={<Check size={13} />}
                    text="These subjects currently meet the strength threshold using the latest stored learning level for each practiced rule."
                  />
                </div>
              ) : (
                <EmptyCompact
                  text={`No subject currently has a learning level of at least ${data.thresholds.strongSubjectAccuracy}%.`}
                />
              )}
            </GlassCard>

            <GlassCard
              title="Your Weaknesses"
              info={`Weak rules use current mastery when learning-engine evidence exists. Historical averages remain visible as context. Results become confirmed after ${data.thresholds.confirmedRuleAttempts} attempts.`}
            >
              {data.weaknesses.length > 0 ? (
                <div>
                  <div className="hidden grid-cols-[52px_1.5fr_125px_72px_1.2fr] gap-3 border-b border-slate-100 pb-2 text-[8px] font-normal text-slate-400 md:grid">
                    <span>Priority</span>
                    <span>Area</span>
                    <span>Current Level</span>
                    <span>Impact</span>
                    <span>Recommended Action</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {data.weaknesses.slice(0, 8).map((item) => (
                      <WeaknessRow
                        key={item.ruleId}
                        item={item}
                      />
                    ))}
                  </div>

                  <InsightStrip
                    tone="rose"
                    icon={<Lightbulb size={13} />}
                    text={
                      data.summary.highPriorityRuleCount > 0
                        ? `${data.summary.highPriorityRuleCount} ${
                            data.summary.highPriorityRuleCount === 1
                              ? "rule requires"
                              : "rules require"
                          } immediate attention based on current learning status.`
                        : "No displayed rule is currently below the high-priority threshold."
                    }
                  />
                </div>
              ) : (
                <EmptyCompact
                  text={`No scored rule currently has a weak learning status or a recorded average below ${data.thresholds.weakRuleAccuracy}%.`}
                />
              )}
            </GlassCard>
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.78fr_1.05fr_0.95fr]">
            <GlassCard
              title="Weakness Impact"
              info="The percentage is the share of the recorded performance gap attributable to the displayed weak rules. It is not a predicted bar-exam score loss."
            >
              {data.weaknessImpact.shareOfRecordedMisses !== null ? (
                <div className="flex min-h-[180px] items-center gap-5">
                  <ImpactDonut
                    percentage={data.weaknessImpact.shareOfRecordedMisses}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-normal leading-4 text-[#30395a]">
                      Your displayed weak rules account for{" "}
                      <span className="text-rose-600">
                        {data.weaknessImpact.shareOfRecordedMisses}%
                      </span>{" "}
                      of the recorded performance gap.
                    </div>

                    <div className="mt-3 space-y-2 text-[8px] font-normal text-slate-500">
                      <DataLine
                        label="Weak-rule gap points"
                        value={String(data.weaknessImpact.displayedWeakDeficit)}
                      />
                      <DataLine
                        label="All gap points"
                        value={String(data.weaknessImpact.totalScoreDeficit)}
                      />
                      <DataLine
                        label="Top 3 share"
                        value={
                          data.weaknessImpact.topThreeShareOfRecordedMisses === null
                            ? "—"
                            : `${data.weaknessImpact.topThreeShareOfRecordedMisses}%`
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyCompact text="No recorded performance gap exists in this date range." />
              )}
            </GlassCard>

            <GlassCard
              title="Priority Focus This Week"
              info="The order is calculated from each rule's current learning level and its share of the recorded performance gap."
            >
              {data.priorityFocus.length > 0 ? (
                <div>
                  <div className="divide-y divide-slate-100">
                    {data.priorityFocus.map((item) => (
                      <PriorityFocusRow
                        key={item.ruleId}
                        item={item}
                      />
                    ))}
                  </div>

                  <InsightStrip
                    tone="violet"
                    icon={<Lightbulb size={13} />}
                    text="This order updates automatically when new scored attempts are recorded."
                  />
                </div>
              ) : (
                <EmptyCompact text="No priority rules are available for this date range." />
              )}
            </GlassCard>

            <GlassCard
              title="Why These Topics Matter"
              info="Every statement is calculated from the current weakness records."
            >
              {data.whyTopicsMatter.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.whyTopicsMatter.map((item, index) => (
                    <ReasonRow
                      key={item.key}
                      icon={
                        index === 0 ? (
                          <Target size={15} />
                        ) : index === 1 ? (
                          <BarChart3 size={15} />
                        ) : (
                          <Scale size={15} />
                        )
                      }
                      iconClass={
                        index === 0
                          ? "bg-rose-50 text-rose-600"
                          : index === 1
                            ? "bg-blue-50 text-blue-600"
                            : "bg-violet-50 text-violet-600"
                      }
                      title={item.title}
                      text={item.text}
                    />
                  ))}
                </div>
              ) : (
                <EmptyCompact text="More scored weak-rule activity is required for topic-level findings." />
              )}
            </GlassCard>
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <GlassCard
              title="Next Best Action"
              info="The recommendation uses the highest calculated weakness priority in this date range."
            >
              {data.nextBestAction ? (
                <div className="flex min-h-[122px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <Target size={22} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[9px] font-normal text-slate-400">
                        Start with
                      </div>

                      <div className="mt-1 truncate text-[13px] font-normal text-[#11163c]">
                        {data.nextBestAction.title}
                      </div>

                      <div className="mt-1 text-[9px] font-normal text-slate-500">
                        {data.nextBestAction.subjectName} ·{" "}
                        {data.nextBestAction.accuracy}% {data.nextBestAction.usesLearningEngine ? "current mastery" : "recorded average"} ·{" "}
                        {formatImpact(data.nextBestAction.impactPercentage)} impact
                      </div>

                      <div className={`mt-1 text-[8px] font-normal ${trendTextClass(data.nextBestAction.trend)}`}>
                        Latest {data.nextBestAction.latestScore}%
                        {data.nextBestAction.previousAccuracy !== null
                          ? ` · Historical average ${data.nextBestAction.historicalAccuracy}% · ${formatAccuracyChange(data.nextBestAction.accuracyChange)}`
                          : " · First scored attempt"}
                        {` · ${trendLabel(data.nextBestAction.trend)}`}
                      </div>

                      <div className="mt-2 flex items-start gap-2 text-[9px] font-normal leading-4 text-[#46516f]">
                        <Check
                          size={12}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />
                        <span>{data.nextBestAction.recommendation}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startWeakFocus(data.nextBestAction!)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[9px] font-normal text-white transition hover:bg-violet-700"
                  >
                    Start Now
                    <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <EmptyCompact text="A next action will appear after a rule meets the weakness criteria." />
              )}
            </GlassCard>

            <GlassCard
              title="Coaching Note"
              info="The note is generated from the current highest-priority rule and its recorded misses."
            >
              {data.coachingNote ? (
                <div className="grid min-h-[122px] grid-cols-1 gap-4 sm:grid-cols-[1fr_0.95fr]">
                  <div className="text-[9px] font-normal leading-4 text-[#46516f]">
                    {data.coachingNote.summary}
                  </div>

                  <div className="space-y-2">
                    {data.coachingNote.steps.map((step) => (
                      <CoachingLine key={step} text={step} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyCompact text="A coaching note will appear after a priority weakness is identified." />
              )}
            </GlassCard>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryMetric({
  icon,
  iconClass,
  label,
  value,
  unit,
  description,
}: {
  icon: ReactNode
  iconClass: string
  label: string
  value: number
  unit: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 first:pl-0 last:pr-0 sm:py-0">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-normal text-[#273153]">
          {label}
        </div>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[20px] font-normal tracking-[-0.04em] text-[#11163c]">
            {value}
          </span>
          <span className="text-[9px] font-normal text-slate-500">
            {unit}
          </span>
        </div>

        <div className="mt-0.5 truncate text-[8px] font-normal text-slate-400">
          {description}
        </div>
      </div>
    </div>
  )
}

function SubjectRow({
  subject,
  tone,
}: {
  subject: StrengthSubjectAnalytics
  tone: "strength" | "weakness"
}) {
  const barClass =
    tone === "strength"
      ? "bg-[linear-gradient(90deg,#dcfce7_0%,#86efac_55%,#4ade80_100%)]"
      : "bg-[linear-gradient(90deg,#ffe4e6_0%,#fecdd3_55%,#fb7185_100%)]"

  const scoreClass =
    tone === "strength" ? "text-emerald-700" : "text-rose-700"

  return (
    <div className="grid grid-cols-[1fr_150px_42px] items-center gap-3 py-2.5 text-[9px] font-normal">
      <div className="min-w-0">
        <div className="truncate text-[#30395a]">{subject.name}</div>
        <div className="mt-0.5 text-[8px] text-slate-400">
          {subject.attempts} scored {subject.attempts === 1 ? "attempt" : "attempts"}
          <span className={confidenceClass(subject.confidence)}>
            {subject.confidence === "confirmed" ? "Confirmed" : "Early data"}
          </span>
        </div>
        <div className="mt-1 text-[7px] font-normal text-slate-400">
          Historical average {subject.historicalAccuracy}%
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${subject.accuracy}%` }}
        />
      </div>

      <span className={`text-right tabular-nums ${scoreClass}`}>
        {subject.accuracy}%
      </span>
    </div>
  )
}

function WeaknessRow({ item }: { item: WeakRuleAnalytics }) {
  return (
    <div className="grid grid-cols-1 gap-2 py-2.5 md:grid-cols-[52px_1.5fr_125px_72px_1.2fr] md:items-center md:gap-3">
      <div className="flex items-center gap-2">
        <span className={priorityRankClass(item.priority)}>
          #{item.priorityRank}
        </span>
        <span className="text-[8px] font-normal text-slate-400 md:hidden">
          Priority
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[9px] font-normal text-[#11163c]">
          {item.title}
        </div>
        <div className="mt-0.5 truncate text-[8px] font-normal text-slate-400">
          {item.subjectName}
          <span className={confidenceClass(item.confidence)}>
            {item.confidence === "confirmed" ? "Confirmed" : "Early data"}
          </span>
        </div>
        {item.usesLearningEngine && (
          <div className="mt-1 text-[7px] font-normal text-blue-600">
            {formatLearningStatus(item.learningStatus)}
            {item.masteryConfidence > 0
              ? ` · Mastery confidence ${item.masteryConfidence}%`
              : ""}
          </div>
        )}
        <div className={`mt-1 text-[7px] font-normal ${trendTextClass(item.trend)}`}>
          Latest {item.latestScore}%
          {item.previousAccuracy !== null
            ? ` · Historical average ${item.historicalAccuracy}% · ${formatAccuracyChange(item.accuracyChange)}`
            : " · First scored attempt"}
          {` · ${trendLabel(item.trend)}`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-8 shrink-0 text-[8px] font-normal tabular-nums text-[#30395a]">
          {item.accuracy}%
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={priorityBarClass(item.priority)}
            style={{ width: `${item.accuracy}%` }}
          />
        </div>
      </div>

      <span className="text-[9px] font-normal tabular-nums text-rose-600">
        {formatImpact(item.impactPercentage)}
      </span>

      <div className="text-[8px] font-normal leading-4 text-slate-500">
        {item.recommendation}
      </div>
    </div>
  )
}

function ImpactDonut({ percentage }: { percentage: number }) {
  const safe = Math.max(0, Math.min(100, percentage))

  return (
    <div
      className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#fb7185 0% ${safe}%, #eef2f7 ${safe}% 100%)`,
      }}
    >
      <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[22px] font-normal tracking-[-0.04em] text-[#11163c]">
          {safe}%
        </span>
        <span className="mt-0.5 text-[8px] font-normal text-slate-400">
          of gap
        </span>
      </div>
    </div>
  )
}

function PriorityFocusRow({ item }: { item: WeakRuleAnalytics }) {
  return (
    <div className="grid grid-cols-[54px_1fr_auto] items-center gap-3 py-2.5">
      <span className={priorityRankClass(item.priority)}>
        #{item.priorityRank}
      </span>

      <div className="min-w-0">
        <div className="truncate text-[9px] font-normal text-[#11163c]">
          {item.title}
        </div>
        <div className="mt-0.5 truncate text-[8px] font-normal text-slate-400">
          {item.subjectName} · {item.attempts} scored {item.attempts === 1 ? "attempt" : "attempts"}
        </div>
        <div className={`mt-1 text-[7px] font-normal ${trendTextClass(item.trend)}`}>
          Latest {item.latestScore}% · Historical {item.historicalAccuracy}% · {trendLabel(item.trend)}
        </div>
      </div>

      <div className="text-right">
        <div className="text-[9px] font-normal text-[#30395a]">
          {item.accuracy}%
        </div>
        <div className="mt-0.5 text-[8px] font-normal text-rose-500">
          {formatImpact(item.impactPercentage)}
        </div>
      </div>
    </div>
  )
}

function ReasonRow({
  icon,
  iconClass,
  title,
  text,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[9px] font-normal text-[#11163c]">
          {title}
        </div>
        <div className="mt-1 text-[8px] font-normal leading-4 text-slate-500">
          {text}
        </div>
      </div>
    </div>
  )
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="tabular-nums text-[#11163c]">{value}</span>
    </div>
  )
}

function CoachingLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-[8px] font-normal leading-4 text-[#46516f]">
      <Check
        size={11}
        className="mt-0.5 shrink-0 text-emerald-600"
      />
      <span>{text}</span>
    </div>
  )
}

function InsightStrip({
  tone,
  icon,
  text,
}: {
  tone: "green" | "rose" | "amber" | "violet"
  icon: ReactNode
  text: string
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-violet-50 text-violet-700"

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[8px] font-normal leading-4 ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function priorityRankClass(priority: WeakRuleAnalytics["priority"]) {
  const color =
    priority === "critical"
      ? "bg-rose-600 text-white"
      : priority === "high"
        ? "bg-orange-500 text-white"
        : "bg-amber-50 text-amber-700"

  return `inline-flex h-6 min-w-8 items-center justify-center rounded-md px-2 text-[8px] font-normal ${color}`
}

function priorityBarClass(priority: WeakRuleAnalytics["priority"]) {
  const color =
    priority === "critical"
      ? "bg-[linear-gradient(90deg,#ffe4e6_0%,#fecdd3_55%,#fb7185_100%)]"
      : priority === "high"
        ? "bg-[linear-gradient(90deg,#ffedd5_0%,#fdba74_55%,#fb923c_100%)]"
        : "bg-[linear-gradient(90deg,#fef9c3_0%,#fde68a_55%,#fbbf24_100%)]"

  return `h-full rounded-full ${color}`
}

function confidenceClass(confidence: "early" | "confirmed") {
  return confidence === "confirmed"
    ? "ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[7px] text-emerald-700"
    : "ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[7px] text-amber-700"
}

function formatAccuracyChange(value: number | null) {
  if (value === null) return "No prior baseline"
  if (value > 0) return `+${value} pts`
  if (value < 0) return `${value} pts`
  return "0 pts"
}

function formatLearningStatus(value: string) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function trendLabel(trend: WeakRuleAnalytics["trend"]) {
  return trend === "improving"
    ? "Improving"
    : trend === "declining"
      ? "Declining"
      : trend === "stable"
        ? "Stable"
        : "New data"
}

function trendTextClass(trend: WeakRuleAnalytics["trend"]) {
  return trend === "improving"
    ? "text-emerald-600"
    : trend === "declining"
      ? "text-rose-600"
      : trend === "stable"
        ? "text-blue-600"
        : "text-slate-400"
}

function formatImpact(value: number) {
  const absolute = Math.abs(value).toFixed(1)
  return `−${absolute}%`
}

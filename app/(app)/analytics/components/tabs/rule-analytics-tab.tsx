"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  ScrollText,
} from "lucide-react"
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

import type {
  ChartPoint,
  DashboardData,
  SubjectDiagnostic,
  WeakArea,
} from "../../types"
import { safeNumber } from "../../lib/analytics-calculations"

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
  correct: number
  subjects: string[]
}

type RankedWeakRule = WeakArea & {
  scoreDrag: number
  displayRule: string
  displaySubject: string
  displayAccuracy: number | null
  displayAttempts: number
}

export default function RuleAnalyticsTab({
  dashboard,
  subjects = [],
  chartData = [],
  currentScore = 0,
  delta = 0,
  weakAreas = [],
}: RuleAnalyticsTabProps) {
  const totalAttempts = safeNumber(dashboard?.ruleAttempts)

  const totalRules = subjects.reduce(
    (sum, subject) => sum + safeNumber(subject.total),
    0
  )

  const practicedRules = subjects.reduce(
    (sum, subject) => sum + safeNumber(subject.completed),
    0
  )

  const unattemptedRules = Math.max(0, totalRules - practicedRules)

  const practicedPercent =
    totalRules > 0 ? Math.round((practicedRules / totalRules) * 100) : 0

  const unattemptedPercent =
    totalRules > 0 ? Math.round((unattemptedRules / totalRules) * 100) : 0

  const subjectRows = subjects
    .map((subject) => {
      const total = safeNumber(subject.total)
      const practiced = safeNumber(subject.completed)
      const remaining = Math.max(0, total - practiced)
      const accuracy =
        Number.isFinite(Number(subject.accuracy)) ? safeNumber(subject.accuracy) : 0

      const weakCount = weakAreas.filter(
        (area) => area.subject === subject.name
      ).length

      return {
        ...subject,
        total,
        practiced,
        remaining,
        accuracy,
        weakCount,
        practicedPercent:
          total > 0 ? Math.round((practiced / total) * 100) : 0,
        status: getSubjectStatus(accuracy, weakCount, practiced),
      }
    })
    .sort((a, b) => {
      if (b.weakCount !== a.weakCount) return b.weakCount - a.weakCount
      return a.accuracy - b.accuracy
    })

  const rankedWeakRules: RankedWeakRule[] = weakAreas
    .map((area) => {
      const accuracy =
        typeof area.accuracy === "number" && Number.isFinite(area.accuracy)
          ? area.accuracy
          : null
      const attempts = safeNumber(area.attempts)
      const scoreDrag =
        accuracy === null
          ? 0
          : -Number((((100 - accuracy) * Math.max(attempts, 1)) / 1000).toFixed(1))

      return {
        ...area,
        scoreDrag,
        displayRule:
          area.rule ||
          area.title ||
          "Untitled rule",
        displaySubject:
          area.subject ||
          "Unassigned",
        displayAccuracy: accuracy,
        displayAttempts: attempts,
      }
    })
    .sort((a, b) => a.scoreDrag - b.scoreDrag)
    .slice(0, 5)

  const incorrectTrend: IncorrectTrendPoint[] = chartData
    .filter((point) => safeNumber(point.score) > 0)
    .map((point) => {
      const correct = safeNumber(point.score)

      return {
        date: point.date,
        incorrect: Math.max(0, 100 - correct),
        correct,
        subjects: extractTrendSubjects(point),
      }
    })

  const weakestSubjectNames = subjectRows
    .filter((subject) => subject.practiced > 0 && subject.accuracy > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.weakCount - a.weakCount)
    .slice(0, 2)
    .map((subject) => subject.name)

  const recentTrendMessage =
    delta >= 0
      ? `Incorrect attempts decreased as accuracy improved by ${Math.abs(delta)} points over the selected range.`
      : `Incorrect attempts increased as accuracy fell by ${Math.abs(delta)} points over the selected range.`

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ClipboardList size={16} />}
          title="Practiced Rules"
          value={`${practicedRules.toLocaleString()} / ${totalRules.toLocaleString()}`}
          footer={`${practicedPercent}% of rule library`}
          tone="violet"
          help="Shows how many rules you have practiced compared with the total rules available in your selected jurisdiction and exam system."
          tooltipLabel="Practiced rules"
          tooltipSuffix="% coverage"
          sparkline={buildScoreSparkline(chartData, practicedPercent)}
        />

        <KpiCard
          icon={<CheckCircle2 size={16} />}
          title="Recall Accuracy"
          value={`${currentScore}%`}
          footer={`${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)} pts vs previous period`}
          tone="green"
          help="Shows your independently scored recall accuracy for rule practice in the selected range."
          tooltipLabel="Recall accuracy"
          tooltipSuffix="%"
          sparkline={buildScoreSparkline(chartData, currentScore)}
        />

        <KpiCard
          icon={<AlertTriangle size={16} />}
          title="Weak Rules"
          value={rankedWeakRules.length.toLocaleString()}
          footer={
            rankedWeakRules.length > 0
              ? "Need repeated recall"
              : "No confirmed weak rules"
          }
          tone="red"
          help="Shows confirmed weak rules from your recorded attempts. A rule becomes weak when real recall evidence shows low accuracy or repeated misses."
          tooltipLabel="Incorrect recall"
          tooltipSuffix="%"
          sparkline={buildInverseSparkline(chartData)}
        />

        <KpiCard
          icon={<FileText size={16} />}
          title="Unattempted Rules"
          value={unattemptedRules.toLocaleString()}
          footer={`${unattemptedPercent}% of rule library remaining`}
          tone="amber"
          help="Shows how many rules remain untouched in the selected rule library. This is coverage, not accuracy."
          sparkline={buildFlatSparkline(unattemptedPercent)}
          progress={unattemptedPercent}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.08fr_1fr]">
        <Panel
          title="Subject Coverage & Accuracy"
          subtitle="See how much you’ve studied in each subject and how you’re performing."
          info="This table uses your real subject coverage and recall performance. Practiced means rules with recorded activity. Accuracy is calculated from scored recall. Weak rules are confirmed by recorded low recall or repeated misses."
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-[0.34fr_1.42fr_0.9fr_0.75fr_0.7fr_0.75fr_0.8fr] border-b border-slate-100 px-3 py-2 text-[10px] font-normal text-slate-500">
              <span />
              <span>Subject</span>
              <span>Practiced</span>
              <span>Accuracy</span>
              <span>Weak Rules</span>
              <span>Remaining</span>
              <span>Status</span>
            </div>

            {subjectRows.length > 0 ? (
              subjectRows.map((subject) => (
                <SubjectCoverageRow key={subject.name} subject={subject} />
              ))
            ) : (
              <EmptyRow text="No subject performance data exists for this range." />
            )}
          </div>

          {weakestSubjectNames.length > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-[11px] font-normal leading-5 text-[#46306f]">
              <HelpCircle size={14} className="mt-0.5 shrink-0 text-violet-700" />
              <span>
                {weakestSubjectNames.join(" and ")} currently show the lowest confirmed performance signals in this range.
              </span>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-3">
          <Panel
            title="Rules Hurting Your Score Most"
            subtitle="These rules have the biggest impact on your readiness score."
            info="This list uses real weak-rule evidence. Score drag estimates which rules are currently pulling down readiness the most based on low recall and attempt count. Accuracy shows recorded recall performance for that rule."
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1.35fr_0.7fr_0.55fr_0.55fr_0.45fr] border-b border-slate-100 px-3 py-2 text-[10px] font-normal text-slate-500">
                <span>Rule</span>
                <span>Subject</span>
                <span className="text-right">Score Drag</span>
                <span className="text-right">Accuracy</span>
                <span className="text-right">Attempts</span>
              </div>

              {rankedWeakRules.length > 0 ? (
                rankedWeakRules.map((rule, index) => (
                  <WeakRuleRow key={rule.ruleId || rule.id || `${rule.displaySubject}-${rule.displayRule}`} rule={rule} index={index} />
                ))
              ) : (
                <EmptyRow text="No confirmed weak rules exist for this range." />
              )}
            </div>

            {rankedWeakRules.length > 0 ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] font-normal leading-5 text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    These rules are causing the largest score drag. Review and retest them before expanding coverage.
                  </span>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Recent Incorrect Trend"
            subtitle="Trend of incorrect attempts over time."
            info="This chart converts real daily recall accuracy into incorrect recall. Hover on a point to see incorrect recall, correct recall, and subject labels when the underlying daily data includes them."
          >
            {incorrectTrend.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={incorrectTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="incorrectFade" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#eef1f6" vertical={false} />

                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fontWeight: 400 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={18}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fontWeight: 400 }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip content={<IncorrectTooltip />} />

                      <Area
                        type="monotone"
                        dataKey="incorrect"
                        stroke="#e11d48"
                        strokeWidth={2}
                        fill="url(#incorrectFade)"
                        dot={{
                          r: 2.8,
                          fill: "#ffffff",
                          stroke: "#e11d48",
                          strokeWidth: 1.4,
                        }}
                        activeDot={{
                          r: 4.2,
                          fill: "#ffffff",
                          stroke: "#e11d48",
                          strokeWidth: 1.8,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl bg-rose-50 px-3 py-3 text-[11px] font-normal leading-5 text-[#30395a]">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-rose-600">
                    {delta >= 0 ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  </div>
                  <div className={delta >= 0 ? "text-emerald-700" : "text-rose-700"}>
                    {delta >= 0 ? "Incorrect attempts decreased" : "Incorrect attempts increased"}
                  </div>
                  <p className="mt-2">{recentTrendMessage}</p>
                </div>
              </div>
            ) : (
              <EmptyCard text="No incorrect-trend data exists for this range." />
            )}
          </Panel>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  icon,
  title,
  value,
  footer,
  tone,
  sparkline,
  progress,
  help,
  tooltipLabel,
  tooltipSuffix,
}: {
  icon: ReactNode
  title: string
  value: string
  footer: string
  tone: Tone
  sparkline: SparkPoint[]
  progress?: number
  help?: string
  tooltipLabel?: string
  tooltipSuffix?: string
}) {
  const toneClass = getTone(tone)

  return (
    <div className="rounded-2xl border border-[#e4e7ef] bg-white p-3.5 shadow-[0_7px_18px_rgba(15,23,42,0.032)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass.icon}`}>
          {icon}
        </div>

        <InfoTooltip text={help || "This KPI is calculated from your real rule-practice data for the selected range."} />
      </div>

      <div className="mt-2 text-[12px] font-normal text-[#10153d]">
        {title}
      </div>

      <div className="mt-1 text-[22px] font-semibold tracking-[-0.035em] text-[#10153d]">
        {value}
      </div>

      <div className={`mt-1 text-[10px] font-normal ${toneClass.text}`}>
        {footer}
      </div>

      {typeof progress === "number" ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : (
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <Tooltip
                cursor={false}
                content={
                  <KpiSparkTooltip
                    label={tooltipLabel || title}
                    suffix={tooltipSuffix || ""}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={toneClass.stroke}
                strokeWidth={2}
                dot={{ r: 2, fill: "#ffffff", stroke: toneClass.stroke, strokeWidth: 1.2 }}
                activeDot={{ r: 4, fill: "#ffffff", stroke: toneClass.stroke, strokeWidth: 1.8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle size={13} className="cursor-help text-slate-400 transition group-hover:text-violet-600" />
      <span className="pointer-events-none absolute right-0 top-5 z-20 w-56 translate-y-1 rounded-xl border border-violet-100 bg-white px-3 py-2 text-[10px] font-normal leading-4 text-[#30395a] opacity-0 shadow-[0_14px_32px_rgba(52,35,110,0.14)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

function KpiSparkTooltip({
  active,
  payload,
  label,
  suffix,
}: any & {
  label: string
  suffix: string
}) {
  if (!active || !payload?.length) return null

  const value = payload[0]?.value

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[10px] shadow-[0_14px_32px_rgba(52,35,110,0.14)]">
      <div className="font-normal text-[#10153d]">{payload[0]?.payload?.label || "Point"}</div>
      <div className="mt-1 text-violet-700">
        {label}: {value}{suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  info,
  children,
}: {
  title: string
  subtitle: string
  info?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e4e7ef] bg-white p-3.5 shadow-[0_7px_18px_rgba(15,23,42,0.032)]">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold tracking-[-0.015em] text-[#10153d]">
            {title}
          </h3>
          <InfoTooltip text={info || "This section is calculated from your real rule-practice data for the selected range."} />
        </div>
        <p className="mt-1 text-[10px] font-normal text-slate-500">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  )
}

function SubjectCoverageRow({
  subject,
  index,
}: {
  subject: SubjectDiagnostic & {
    total: number
    practiced: number
    remaining: number
    accuracy: number
    weakCount: number
    practicedPercent: number
    status: {
      label: string
      tone: Tone | "blue"
    }
  }
  index: number
}) {
  const accuracyTone =
    subject.accuracy >= 85
      ? "text-emerald-600"
      : subject.accuracy >= 70
        ? "text-[#10153d]"
        : "text-rose-600"

  return (
    <div className="grid min-h-[42px] grid-cols-[0.34fr_1.42fr_0.9fr_0.75fr_0.7fr_0.75fr_0.8fr] items-center border-b border-slate-100 px-3 py-2 text-[11px] font-normal last:border-b-0">
      <div>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-[10px] text-slate-500">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 pr-2">
        <span className="line-clamp-2 text-[#10153d]" title={subject.name}>
          {subject.name}
        </span>
      </div>

      <div>
        <div className="text-[#10153d]">
          {subject.practiced} / {subject.total}
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600"
            style={{ width: `${Math.max(0, Math.min(100, subject.practicedPercent))}%` }}
          />
        </div>
      </div>

      <div className={accuracyTone}>{subject.accuracy}%</div>

      <div className={subject.weakCount > 0 ? "text-rose-600" : "text-emerald-600"}>
        {subject.weakCount}
      </div>

      <div className="text-[#10153d]">{subject.remaining}</div>

      <div className={getStatusTextClass(subject.status.tone)}>
        {subject.status.label}
      </div>
    </div>
  )
}

function WeakRuleRow({
  rule,
  index,
}: {
  rule: RankedWeakRule
  index: number
}) {
  const accuracy = rule.displayAccuracy

  return (
    <div className="grid min-h-[48px] grid-cols-[1.55fr_0.85fr_0.65fr_1.05fr_0.42fr] items-center border-b border-slate-100 px-3 py-2 text-[11px] font-normal last:border-b-0">
      <div className="flex min-w-0 items-center gap-2 pr-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[10px] text-rose-600">
          {index + 1}
        </span>
        <span className="line-clamp-2 text-[#10153d]" title={rule.displayRule}>
          {rule.displayRule}
        </span>
      </div>

      <div className="min-w-0 pr-3">
        <span className="line-clamp-2 text-violet-700" title={rule.displaySubject}>
          {rule.displaySubject}
        </span>
      </div>

      <div className="text-right text-rose-600">
        {rule.scoreDrag.toFixed(1)}%
      </div>

      <div className="flex items-center justify-end gap-3">
        {accuracy === null ? (
          <span className="text-slate-400">—</span>
        ) : (
          <>
            <span className={accuracy < 50 ? "text-rose-600" : "text-[#10153d]"}>
              {accuracy}%
            </span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <span
                className={accuracy < 50 ? "block h-full rounded-full bg-rose-500" : "block h-full rounded-full bg-emerald-500"}
                style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
              />
            </span>
          </>
        )}
      </div>

      <div className="text-right text-[#10153d]">
        {rule.displayAttempts}
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-3 py-6 text-center text-[11px] font-normal text-slate-500">
      {text}
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[11px] font-normal text-slate-500">
      {text}
    </div>
  )
}

function extractTrendSubjects(point: ChartPoint): string[] {
  const raw = point as any

  const directSubjects =
    raw.subjects ||
    raw.subjectNames ||
    raw.subject_labels ||
    raw.subjectLabels

  if (Array.isArray(directSubjects)) {
    return directSubjects
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 4)
  }

  if (typeof directSubjects === "string") {
    return directSubjects
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4)
  }

  const subject = raw.subject || raw.subjectName

  if (typeof subject === "string" && subject.trim()) {
    return [subject.trim()]
  }

  return []
}

function IncorrectTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as IncorrectTrendPoint | undefined
  const subjects = point?.subjects?.length ? point.subjects.join(", ") : "Subject detail not recorded for this point"

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[10px] shadow-[0_14px_32px_rgba(52,35,110,0.14)]">
      <div className="font-normal text-[#10153d]">{label}</div>

      <div className="mt-1 text-rose-600">
        Incorrect recall: {point?.incorrect ?? payload[0].value}%
      </div>

      <div className="mt-0.5 text-emerald-600">
        Correct recall: {point?.correct ?? "—"}%
      </div>

      <div className="mt-1 max-w-[220px] text-slate-500">
        Subjects: {subjects}
      </div>
    </div>
  )
}

function getSubjectStatus(
  accuracy: number,
  weakCount: number,
  practiced: number
): { label: string; tone: Tone | "blue" } {
  if (practiced <= 0) return { label: "Unstarted", tone: "blue" }
  if (weakCount >= 6 || accuracy < 50) return { label: "High Priority", tone: "red" }
  if (weakCount >= 3 || accuracy < 70) return { label: "Needs Attention", tone: "red" }
  if (weakCount > 0 || accuracy < 85) return { label: "Moderate", tone: "amber" }
  return { label: "Strong", tone: "green" }
}

function getStatusTextClass(tone: Tone | "blue") {
  switch (tone) {
    case "red":
      return "text-rose-600"
    case "amber":
      return "text-amber-600"
    case "green":
      return "text-emerald-600"
    case "blue":
      return "text-blue-600"
    default:
      return "text-slate-500"
  }
}

function getTone(tone: Tone) {
  switch (tone) {
    case "green":
      return {
        icon: "bg-emerald-50 text-emerald-600",
        text: "text-emerald-600",
        stroke: "#10b981",
      }
    case "red":
      return {
        icon: "bg-rose-50 text-rose-600",
        text: "text-rose-600",
        stroke: "#e11d48",
      }
    case "amber":
      return {
        icon: "bg-amber-50 text-amber-600",
        text: "text-amber-600",
        stroke: "#f59e0b",
      }
    case "violet":
    default:
      return {
        icon: "bg-violet-50 text-violet-700",
        text: "text-violet-700",
        stroke: "#7c3aed",
      }
  }
}

function buildScoreSparkline(
  chartData: ChartPoint[],
  fallback: number
): SparkPoint[] {
  const points = chartData
    .filter((point) => safeNumber(point.score) > 0)
    .slice(-12)
    .map((point) => ({
      label: point.date,
      value: safeNumber(point.score),
    }))

  if (points.length > 1) return points

  return Array.from({ length: 8 }, (_, index) => ({
    label: String(index + 1),
    value: fallback,
  }))
}

function buildInverseSparkline(chartData: ChartPoint[]): SparkPoint[] {
  const points = chartData
    .filter((point) => safeNumber(point.score) > 0)
    .slice(-12)
    .map((point) => ({
      label: point.date,
      value: Math.max(0, 100 - safeNumber(point.score)),
    }))

  if (points.length > 1) return points

  return Array.from({ length: 8 }, (_, index) => ({
    label: String(index + 1),
    value: 0,
  }))
}

function buildFlatSparkline(value: number): SparkPoint[] {
  return Array.from({ length: 8 }, (_, index) => ({
    label: String(index + 1),
    value,
  }))
}

"use client"

import { useState, type ReactNode } from "react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  Circle,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  LoaderCircle,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type {
  ProgressHistoryAnalyticsData,
  ProgressHistoryEvent,
  ProgressMilestone,
  ReadinessTrendPoint,
} from "../../types"
import { EmptyCompact } from "../shared/feedback-states"
import { LoadingState } from "../shared/loading-state"
import { AnalyticsHelp, AnalyticsInterpretation } from "../shared/analytics-interpretation"

type ProgressHistoryTabProps = {
  data: ProgressHistoryAnalyticsData | null
  loading: boolean
  error: string | null
  appliedRange: string
  appliedStartDate?: string
  appliedEndDate?: string
  onRefresh: () => void
}

type TrendRange = "7d" | "14d" | "30d" | "custom"
type ExportFormat = "pdf" | "xlsx"

export default function ProgressHistoryTab({
  data,
  loading,
  error,
  appliedRange,
  appliedStartDate = "",
  appliedEndDate = "",
  onRefresh,
}: ProgressHistoryTabProps) {
  const [trendRange, setTrendRange] = useState<TrendRange>("30d")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  if (loading && !data) {
    return <LoadingState compact text="Loading Progress History" />
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-[11px] font-normal text-rose-700">
        {error || "Progress history could not be loaded."}
      </div>
    )
  }

  const trendData = (() => {
    if (trendRange !== "custom") {
      return data.readinessTrend[trendRange]
    }

    if (!customStart || !customEnd) return []

    const startTime = new Date(`${customStart}T00:00:00`).getTime()
    const endTime = new Date(`${customEnd}T23:59:59.999`).getTime()

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
      return []
    }

    return data.readinessTrend.all.filter((point) => {
      const pointTime = new Date(point.date).getTime()
      return pointTime >= startTime && pointTime <= endTime
    })
  })()

  const exportParams = new URLSearchParams({
    range: appliedRange,
    timezoneOffset: String(new Date().getTimezoneOffset()),
  })

  if (
    appliedRange === "custom" &&
    appliedStartDate &&
    appliedEndDate
  ) {
    exportParams.set("start", appliedStartDate)
    exportParams.set("end", appliedEndDate)
  }

  async function downloadReport(format: ExportFormat) {
    try {
      setExporting(format)
      setExportError(null)

      const response = await fetch(
        `/api/progress-history/export?${exportParams.toString()}&format=${format}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || "The report could not be exported.")
      }

      const blob = await response.blob()
      const disposition = response.headers.get("content-disposition") ?? ""
      const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition)
      const fallbackName = `lexora-progress-${new Date().toISOString().slice(0, 10)}.${format}`
      const filename = filenameMatch?.[1] || fallbackName
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setExportError(
        downloadError instanceof Error
          ? downloadError.message
          : "The report could not be exported."
      )
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AnalyticsInterpretation
        title="How to use progress history"
        measures="This page shows how recorded readiness and subject performance changed over time. A movement is meaningful only when the period contains enough scored attempts."
        result={
          data.summary.currentReadiness === null
            ? "No readiness score is available for the selected range."
            : `Current recorded readiness is ${data.summary.currentReadiness}%. ${data.summary.change === null ? "A prior-period comparison is not available." : data.summary.change >= 0 ? `Readiness increased by ${Math.abs(data.summary.change)} points.` : `Readiness decreased by ${Math.abs(data.summary.change)} points.`}`
        }
        nextStep={
          data.improvement.recommendedAction ||
          "Review the periods with the largest decline, then compare the related subject and rule-level records before changing your study plan."
        }
      />
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <HistoryCard
          number="1."
          title="Overall Progress"
          subtitle={`Track how your recorded BLL readiness changed during ${data.range.label.toLowerCase()}.`}
        >
          {data.summary.currentReadiness !== null ? (
            <div>
              <div className="grid grid-cols-[142px_1fr] items-center gap-5">
                <ReadinessRing value={data.summary.currentReadiness} />

                <div className="min-w-0">
                  <ChangeMetric value={data.summary.change} />
                  <div className="mt-2 text-[9px] font-normal leading-4 text-slate-500">
                    {data.summary.previousReadiness === null
                      ? "A preceding-period comparison is not available yet."
                      : `Recorded readiness changed from ${data.summary.previousReadiness}% to ${data.summary.currentReadiness}%.`}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-[180px] min-w-0">
                {data.overallProgress.some((point) => point.score !== null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.overallProgress}
                      margin={{ top: 18, right: 10, left: -18, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient id="overallStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="55%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                        <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} />
                          <stop offset="58%" stopColor="#c4b5fd" stopOpacity={0.11} />
                          <stop offset="100%" stopColor="#ede9fe" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eef1f6" vertical={false} />
                      <XAxis
                        dataKey="shortLabel"
                        tick={{ fontSize: 8, fontWeight: 400 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 8, fontWeight: 400 }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip content={<ProgressTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        connectNulls={false}
                        stroke="url(#overallStroke)"
                        strokeWidth={2.2}
                        fill="url(#overallFill)"
                        dot={{
                          r: 3,
                          fill: "#ffffff",
                          stroke: "#8b5cf6",
                          strokeWidth: 1.8,
                        }}
                        activeDot={{
                          r: 4,
                          fill: "#ffffff",
                          stroke: "#7c3aed",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] font-normal text-slate-400">
                    More historical periods are needed for the progress chart.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyCompact text="Complete scored rule attempts to build your overall progress history." />
          )}
        </HistoryCard>

        <HistoryCard
          number="2."
          title="Milestones"
          subtitle="Track milestones calculated from your real rule activity and mastery records."
        >
          <div className="relative">
            <span className="absolute bottom-4 left-[10px] top-4 w-px bg-slate-200" />
            <div className="divide-y divide-slate-100">
              {data.milestones.map((milestone) => (
                <MilestoneRow key={milestone.key} milestone={milestone} />
              ))}
            </div>
          </div>
        </HistoryCard>
      </section>

      <HistoryCard
        number="3."
        title="Subject Progress Over Time"
        subtitle="Recorded rule-attempt accuracy by subject across four periods."
      >
        {data.subjectProgress.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[8px] font-normal text-slate-400">
                  <th className="pb-2 font-normal">Subject</th>
                  {data.overallProgress.map((period) => (
                    <th key={period.key} className="pb-2 text-center font-normal">
                      {period.shortLabel}
                    </th>
                  ))}
                  <th className="pb-2 text-center font-normal">Change</th>
                </tr>
              </thead>

              <tbody>
                {data.subjectProgress.map((subject, index) => (
                  <tr
                    key={subject.subjectId ?? subject.subjectName}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${subjectIconClass(index)}`}
                        >
                          <BookOpenCheck size={12} />
                        </span>
                        <span className="truncate text-[9px] font-normal text-[#273153]">
                          {subject.subjectName}
                        </span>
                      </div>
                    </td>

                    {subject.periods.map((period) => (
                      <td
                        key={period.key}
                        className="px-2 py-2.5 text-center text-[9px] font-normal tabular-nums text-[#30395a]"
                        title={`${period.attempts} scored attempts`}
                      >
                        {period.score === null ? "—" : `${period.score}%`}
                      </td>
                    ))}

                    <td className="px-2 py-2.5 text-center text-[9px] font-normal">
                      <ChangeCell value={subject.change} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyCompact text="Subject progress will appear after scored attempts are recorded in this date range." />
        )}
      </HistoryCard>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <HistoryCard
          number="4."
          title="Readiness Trend"
          subtitle="Your recorded BLL rule score over time."
          action={
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {([
                ["7d", "7D"],
                ["14d", "2W"],
                ["30d", "30D"],
                ["custom", "Custom"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTrendRange(key)
                    setShowCustomRange(key === "custom")
                  }}
                  className={`rounded-md px-2.5 py-1 text-[8px] font-normal transition ${
                    trendRange === key
                      ? "bg-violet-600 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {showCustomRange ? (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
              <label className="min-w-[138px] flex-1">
                <span className="mb-1 block text-[8px] font-normal text-slate-500">Start date</span>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-normal text-[#273153] outline-none focus:border-violet-300"
                />
              </label>
              <label className="min-w-[138px] flex-1">
                <span className="mb-1 block text-[8px] font-normal text-slate-500">End date</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-normal text-[#273153] outline-none focus:border-violet-300"
                />
              </label>
            </div>
          ) : null}

          {trendData.length > 0 ? (
            <>
              <div className="h-[215px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 16, right: 14, left: -18, bottom: 2 }}
                  >
                    <defs>
                      <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="58%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28} />
                        <stop offset="55%" stopColor="#c4b5fd" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f5f3ff" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef1f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8, fontWeight: 400 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 8, fontWeight: 400 }}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<ReadinessTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="url(#trendStroke)"
                      strokeWidth={2.2}
                      fill="url(#trendFill)"
                      dot={{
                        r: 2.7,
                        fill: "#ffffff",
                        stroke: "#8b5cf6",
                        strokeWidth: 1.6,
                      }}
                      activeDot={{
                        r: 4,
                        fill: "#ffffff",
                        stroke: "#7c3aed",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <InsightStrip
                tone={
                  data.improvement.status === "declining"
                    ? "rose"
                    : data.improvement.status === "improving"
                      ? "green"
                      : "violet"
                }
                icon={
                  data.improvement.status === "declining" ? (
                    <TrendingDown size={13} />
                  ) : (
                    <TrendingUp size={13} />
                  )
                }
                text={
                  data.improvement.periodChange === null
                    ? "A preceding-period comparison will appear after enough history exists."
                    : `Recorded readiness ${
                        data.improvement.periodChange >= 0 ? "increased" : "decreased"
                      } by ${Math.abs(data.improvement.periodChange)} percentage points versus the preceding period.`
                }
              />
            </>
          ) : (
            <EmptyCompact
              text={
                trendRange === "custom" && (!customStart || !customEnd)
                  ? "Choose a start and end date to display a custom readiness trend."
                  : "No readiness trend exists for the selected range."
              }
            />
          )}
        </HistoryCard>

        <HistoryCard
          number="5."
          title="Recent History"
          subtitle="Your recent recorded study activity."
        >
          {data.recentHistory.length > 0 ? (
            <div>
              <div className="divide-y divide-slate-100">
                {data.recentHistory.slice(0, 5).map((event) => (
                  <HistoryEventRow key={event.id} event={event} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[9px] font-normal text-violet-700 transition hover:bg-violet-100"
              >
                View all history
                <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <EmptyCompact text="Recent activity will appear after a scored rule, study, or flashcard session is completed." />
          )}
        </HistoryCard>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <HistoryCard
          number="6."
          title="Export Your Progress"
          subtitle="Download reports generated from the same real analytics shown on this page."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ExportButton
              icon={<FileText size={16} />}
              iconClass="bg-rose-50 text-rose-600"
              title="PDF report"
              description="Premium visual report"
              loading={exporting === "pdf"}
              disabled={exporting !== null}
              onClick={() => void downloadReport("pdf")}
            />

            <ExportButton
              icon={<FileSpreadsheet size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              title="Excel workbook"
              description="Styled tables and activity sheets"
              loading={exporting === "xlsx"}
              disabled={exporting !== null}
              onClick={() => void downloadReport("xlsx")}
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="mt-2 flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/55 px-3 py-3 text-left transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              {loading ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-normal text-[#11163c]">
                {loading ? "Refreshing progress data" : "Refresh progress data"}
              </span>
              <span className="mt-0.5 block text-[8px] font-normal text-slate-400">
                Pull the latest attempts and completed sessions from the database.
              </span>
            </span>
          </button>

          {exportError ? (
            <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[8px] font-normal text-rose-700">
              {exportError}
            </div>
          ) : null}
        </HistoryCard>

        <HistoryCard
          number="7."
          title="Improvement Note"
          subtitle="A deterministic summary generated only from measured performance data."
          tone="green"
        >
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[96px_1fr]">
            <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              {data.improvement.status === "declining" ? (
                <TrendingDown size={40} strokeWidth={1.5} />
              ) : (
                <TrendingUp size={40} strokeWidth={1.5} />
              )}
            </div>

            <div>
              <div className="text-[15px] font-normal leading-5 text-emerald-700">
                {data.improvement.title}
              </div>

              <p className="mt-2 text-[9px] font-normal leading-4 text-[#46516f]">
                {data.improvement.message}
              </p>

              <div className="mt-3 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5">
                <div className="text-[8px] font-normal text-emerald-700">Recommended next action</div>
                <div className="mt-1 text-[9px] font-normal leading-4 text-[#30395a]">
                  {data.improvement.recommendedAction}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ImprovementMetric
                  icon={<BarChart3 size={14} />}
                  value={
                    data.improvement.periodChange === null
                      ? "—"
                      : `${data.improvement.periodChange > 0 ? "+" : ""}${data.improvement.periodChange} pts`
                  }
                  label="vs preceding period"
                />

                <ImprovementMetric
                  icon={<Target size={14} />}
                  value={
                    data.improvement.averageWeeklyChange === null
                      ? "—"
                      : `${data.improvement.averageWeeklyChange > 0 ? "+" : ""}${data.improvement.averageWeeklyChange} pts`
                  }
                  label="average period change"
                />

                <ImprovementMetric
                  icon={<Flame size={14} />}
                  value={String(data.improvement.activeDayStreak)}
                  label="active-day streak"
                />
              </div>
            </div>
          </div>
        </HistoryCard>
      </section>

      {historyOpen ? (
        <HistoryModal
          events={data.recentHistory}
          rangeLabel={data.range.label}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </div>
  )
}

function HistoryCard({
  number,
  title,
  subtitle,
  children,
  action,
  tone = "default",
}: {
  number: string
  title: string
  subtitle: string
  children: ReactNode
  action?: ReactNode
  tone?: "default" | "green"
}) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-[0_6px_18px_rgba(15,23,42,0.035)] ${
        tone === "green"
          ? "border-emerald-100 bg-gradient-to-br from-emerald-50/55 via-white to-white"
          : "border-[#e4e7ef] bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-normal text-[#11163c]">{number}</span>
            <h3 className="text-[13px] font-normal tracking-[-0.015em] text-[#11163c]">
              {title}
            </h3>
          </div>
          <p className="mt-1 text-[8px] font-normal leading-4 text-slate-500">{subtitle}</p>
          <div className="mt-1.5">
            <AnalyticsHelp text={subtitle} />
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function ReadinessRing({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div
      className="relative flex h-[126px] w-[126px] shrink-0 items-center justify-center rounded-full shadow-[0_10px_28px_rgba(124,58,237,0.09)]"
      style={{
        background: `conic-gradient(#8b5cf6 0% ${safeValue}%, #ede9fe ${safeValue}% 100%)`,
      }}
    >
      <div className="flex h-[90px] w-[90px] flex-col items-center justify-center rounded-full bg-white">
        <div className="text-[24px] font-normal tracking-[-0.04em] text-[#11163c]">
          {safeValue}%
        </div>
        <div className="mt-1 text-[8px] font-normal text-slate-400">BLL readiness</div>
      </div>
    </div>
  )
}

function ChangeMetric({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="text-[12px] font-normal text-slate-400">No prior comparison</div>
  }

  const positive = value >= 0

  return (
    <div className="flex items-center gap-2">
      {positive ? (
        <ArrowUp size={17} className="text-emerald-600" />
      ) : (
        <ArrowDown size={17} className="text-rose-600" />
      )}
      <span
        className={`text-[21px] font-normal tracking-[-0.04em] ${
          positive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {positive ? "+" : ""}
        {value} pts
      </span>
    </div>
  )
}

function MilestoneRow({ milestone }: { milestone: ProgressMilestone }) {
  const completed = milestone.status === "completed"
  const inProgress = milestone.status === "in_progress"

  return (
    <div className="relative grid grid-cols-[28px_1fr_auto] items-start gap-3 py-2.5">
      <span
        className={`relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
          completed
            ? "bg-emerald-600 text-white"
            : inProgress
              ? "border-2 border-violet-500 bg-white text-violet-600"
              : "border border-slate-200 bg-slate-50 text-slate-300"
        }`}
      >
        {completed ? <Check size={11} /> : <Circle size={7} fill="currentColor" />}
      </span>

      <div className="min-w-0">
        <div
          className={`text-[8px] font-normal ${
            completed
              ? "text-emerald-700"
              : inProgress
                ? "text-violet-700"
                : "text-slate-500"
          }`}
        >
          {completed ? "Completed" : inProgress ? "In Progress" : "Not reached"}
        </div>
        <div className="mt-0.5 text-[9px] font-normal text-[#11163c]">{milestone.label}</div>
        <div className="mt-1 text-[8px] font-normal leading-4 text-slate-400">
          {milestone.detail}
        </div>
      </div>

      <span className="pt-1 text-[8px] font-normal text-slate-400">
        {milestone.date ? formatDate(milestone.date) : ""}
      </span>
    </div>
  )
}

function ChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const positive = value > 0
  const negative = value < 0

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 tabular-nums ${
        positive ? "text-emerald-600" : negative ? "text-rose-600" : "text-slate-400"
      }`}
    >
      {positive ? <ArrowUp size={10} /> : negative ? <ArrowDown size={10} /> : null}
      {positive ? "+" : ""}
      {value} pts
    </span>
  )
}

function HistoryEventRow({ event }: { event: ProgressHistoryEvent }) {
  const icon =
    event.type === "rule_improved" ? (
      <TrendingUp size={14} />
    ) : event.type === "flashcards" ? (
      <BookOpenCheck size={14} />
    ) : event.type === "study_session" ? (
      <CalendarCheck2 size={14} />
    ) : (
      <Target size={14} />
    )

  const iconClass =
    event.type === "rule_improved"
      ? "bg-emerald-50 text-emerald-600"
      : event.type === "flashcards"
        ? "bg-violet-50 text-violet-600"
        : event.type === "study_session"
          ? "bg-blue-50 text-blue-600"
          : "bg-amber-50 text-amber-600"

  return (
    <div className="grid grid-cols-[32px_1fr_auto] items-start gap-3 py-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[9px] font-normal text-[#11163c]">{event.title}</div>
        <div className="mt-1 text-[8px] font-normal leading-4 text-slate-500">
          {event.detail}
        </div>
      </div>
      <span className="pt-1 text-[8px] font-normal text-slate-400">
        {formatRelativeTime(event.timestamp)}
      </span>
    </div>
  )
}

function HistoryModal({
  events,
  rangeLabel,
  onClose,
}: {
  events: ProgressHistoryEvent[]
  rangeLabel: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Progress history details"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-[13px] font-normal text-[#11163c]">Complete Recent History</div>
            <div className="mt-1 text-[8px] font-normal text-slate-400">
              {events.length} recorded events · {rangeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Close history"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-2">
          <div className="divide-y divide-slate-100">
            {events.map((event) => (
              <HistoryEventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExportButton({
  icon,
  iconClass,
  title,
  description,
  loading,
  disabled,
  onClick,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  description: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left transition hover:border-violet-100 hover:bg-violet-50/30 disabled:cursor-wait disabled:opacity-70"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        {loading ? <LoaderCircle size={15} className="animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-normal text-[#11163c]">{title}</span>
        <span className="mt-0.5 block text-[8px] font-normal text-slate-400">{description}</span>
      </span>
      <Download size={14} className="shrink-0 text-violet-600" />
    </button>
  )
}

function ImprovementMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5">
      <div className="flex items-center gap-2 text-emerald-600">
        {icon}
        <span className="text-[12px] font-normal">{value}</span>
      </div>
      <div className="mt-1 text-[8px] font-normal text-slate-400">{label}</div>
    </div>
  )
}

function InsightStrip({
  tone,
  icon,
  text,
}: {
  tone: "green" | "rose" | "violet"
  icon: ReactNode
  text: string
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : "bg-violet-50 text-violet-700"

  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[8px] font-normal leading-4 ${toneClass}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ProgressTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: { label: string; score: number | null; attempts: number } }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <TooltipBox>
      <div className="text-[9px] font-normal text-[#30395a]">{point.label}</div>
      <div className="mt-1 text-[9px] font-normal text-violet-700">
        Score: {point.score === null ? "—" : `${point.score}%`}
      </div>
      <div className="mt-1 text-[8px] font-normal text-slate-500">Attempts: {point.attempts}</div>
    </TooltipBox>
  )
}

function ReadinessTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: ReadinessTrendPoint }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <TooltipBox>
      <div className="text-[9px] font-normal text-[#30395a]">{point.label}</div>
      <div className="mt-1 text-[9px] font-normal text-violet-700">Readiness: {point.score}%</div>
      <div className="mt-1 text-[8px] font-normal text-slate-500">
        Rolling attempts: {point.attempts}
      </div>
    </TooltipBox>
  )
}

function TooltipBox({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">{children}</div>
}

function subjectIconClass(index: number) {
  const classes = [
    "bg-fuchsia-50 text-fuchsia-600",
    "bg-rose-50 text-rose-600",
    "bg-amber-50 text-amber-600",
    "bg-blue-50 text-blue-600",
    "bg-violet-50 text-violet-600",
    "bg-emerald-50 text-emerald-600",
  ]
  return classes[index % classes.length]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const difference = Date.now() - date.getTime()
  const minutes = Math.floor(difference / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

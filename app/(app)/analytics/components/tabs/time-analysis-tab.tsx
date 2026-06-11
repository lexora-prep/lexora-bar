"use client"
import { LoadingState } from "../shared/loading-state"

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Brain,
  CalendarDays,
  Check,
  Clock3,
  Crosshair,
  Lightbulb,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react"

type TimeAnalysisTabProps = {
  appliedRange: string
  appliedStartDate?: string
  appliedEndDate?: string
}

type DailyStudyPoint = {
  date: string
  seconds: number
  sessions: number
}

type SessionLengthPoint = {
  key: string
  label: string
  sessions: number
  scoredSessions: number
  accuracy: number | null
  averageDurationMinutes: number | null
}

type FocusTimelinePoint = {
  id: string
  date: string
  dateLabel: string
  minutes: number
  score: number
}

type BestDayPoint = {
  dayIndex: number
  label: string
  shortLabel: string
  attempts: number
  accuracy: number | null
}

type ScatterPoint = {
  id: string
  minutes: number
  accuracy: number
  date: string
}

type AllocationPoint = {
  mode: string
  label: string
  seconds: number
  sessions: number
  percentage: number
}

type EfficiencyPoint = {
  key: string
  label: string
  sessions: number
  scoredSessions: number
  accuracy: number | null
  averageDurationMinutes: number | null
  status:
    | "best"
    | "good"
    | "average"
    | "low"
    | "unavailable"
}

type Recommendation = {
  bestRangeLabel: string
  bestRangeAccuracy: number | null
  blockMinutes: number
  blocksPerDay: number | null
  totalMinutesPerDay: number
  bestDayLabel: string | null
  bestDayAccuracy: number | null
  scoredSessions: number
}

type TimeAnalyticsData = {
  range: {
    key: string
    start: string
    end: string
  }
  summary: {
    totalSeconds: number
    effectiveSeconds: number
    sessionCount: number
    effectiveSessionCount: number
    scoredSessionCount: number
    focusScore: number | null
    averageSessionSeconds: number
  }
  dailyStudy: DailyStudyPoint[]
  sessionLength: SessionLengthPoint[]
  focusTimeline: FocusTimelinePoint[]
  bestDays: BestDayPoint[]
  scatter: ScatterPoint[]
  allocation: AllocationPoint[]
  efficiency: EfficiencyPoint[]
  recommendation: Recommendation | null
}

const PIE_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#cbd5e1",
  "#f9a8d4",
]

export default function TimeAnalysisTab({
  appliedRange,
  appliedStartDate = "",
  appliedEndDate = "",
}: TimeAnalysisTabProps) {
  const [data, setData] = useState<TimeAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          range: appliedRange,
          timezoneOffset: String(new Date().getTimezoneOffset()),
        })

        if (
          appliedRange === "custom" &&
          appliedStartDate &&
          appliedEndDate
        ) {
          params.set("start", appliedStartDate)
          params.set("end", appliedEndDate)
        }

        const response = await fetch(
          `/api/time-analytics?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          const body = await response.json().catch(() => null)

          throw new Error(
            body?.error || "Time analytics could not be loaded."
          )
        }

        const result = (await response.json()) as TimeAnalyticsData
        setData(result)
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return
        }

        setData(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Time analytics could not be loaded."
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      controller.abort()
    }
  }, [appliedRange, appliedStartDate, appliedEndDate])

  const totalStudySparkline = useMemo(
    () =>
      data?.dailyStudy.map((point) => ({
        label: point.date,
        value: point.seconds / 60,
      })) ?? [],
    [data]
  )

  const sessionSparkline = useMemo(
    () =>
      data?.dailyStudy.map((point) => ({
        label: point.date,
        value: point.sessions,
      })) ?? [],
    [data]
  )

  const sessionLengthData = useMemo(
    () =>
      data?.sessionLength.filter(
        (point) =>
          point.accuracy !== null && point.scoredSessions > 0
      ) ?? [],
    [data]
  )

  const bestDaysData = useMemo(
    () =>
      data?.bestDays.filter(
        (day) => day.accuracy !== null && day.attempts > 0
      ) ?? [],
    [data]
  )

  if (loading) {
    return <LoadingState compact text="Loading time analytics..." />
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-[11px] font-normal text-rose-700">
        {error || "Time analytics could not be loaded."}
      </div>
    )
  }

  const bestSessionBucket = sessionLengthData
    .slice()
    .sort((a, b) => Number(b.accuracy) - Number(a.accuracy))[0]

  const bestDay = bestDaysData
    .slice()
    .sort((a, b) => Number(b.accuracy) - Number(a.accuracy))[0]

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Clock3 size={18} />}
          title="Total Study Time"
          subtitle="Recorded session time"
          value={formatDuration(data.summary.totalSeconds)}
          footer={`${data.summary.sessionCount} recorded sessions`}
          tone="violet"
          data={totalStudySparkline}
        />

        <KpiCard
          icon={<Target size={18} />}
          title="Effective Study Time"
          subtitle="Sessions containing real activity"
          value={formatDuration(data.summary.effectiveSeconds)}
          footer={`${data.summary.effectiveSessionCount} active sessions`}
          tone="green"
          data={totalStudySparkline}
        />

        <KpiCard
          icon={<Crosshair size={18} />}
          title="Focus Score"
          subtitle="Derived from scored session accuracy"
          value={
            data.summary.focusScore === null
              ? "—"
              : `${data.summary.focusScore} /100`
          }
          footer={
            data.summary.scoredSessionCount > 0
              ? `${data.summary.scoredSessionCount} scored sessions`
              : "No scored sessions yet"
          }
          tone="blue"
          data={data.focusTimeline.map((point) => ({
            label: point.dateLabel,
            value: point.score,
          }))}
        />

        <KpiCard
          icon={<CalendarDays size={18} />}
          title="Study Sessions"
          subtitle="Completed session records"
          value={String(data.summary.sessionCount)}
          footer={
            data.summary.averageSessionSeconds > 0
              ? `${formatDuration(
                  data.summary.averageSessionSeconds
                )} average`
              : "No duration recorded"
          }
          tone="amber"
          data={sessionSparkline}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <CompactCard
          title="Best Session Length"
          info="Accuracy is calculated from real scored study sessions grouped by duration."
        >
          {sessionLengthData.length > 0 ? (
            <div className="h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sessionLengthData}
                  margin={{
                    top: 14,
                    right: 10,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="sessionLine"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#c4b5fd" />
                      <stop offset="55%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#eef1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
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
                  />

                  <Tooltip content={<SessionLengthTooltip />} />

                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="url(#sessionLine)"
                    strokeWidth={2.4}
                    dot={{
                      r: 3.2,
                      fill: "#ffffff",
                      stroke: "#6d28d9",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 4.5,
                      fill: "#ffffff",
                      stroke: "#6d28d9",
                      strokeWidth: 2.4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <CompactEmpty text="Complete scored study sessions with recorded durations to identify your best session length." />
          )}

          <InsightNote
            icon={<Check size={14} />}
            text={
              bestSessionBucket
                ? `Your highest recorded session accuracy is ${bestSessionBucket.accuracy}% in the ${bestSessionBucket.label} range.`
                : "A best-performing session range will appear after enough scored sessions are recorded."
            }
            tone="green"
          />
        </CompactCard>

        <CompactCard
          title="Focus Over Time"
          info="Each point represents the real accuracy recorded for a scored study session."
        >
          {data.focusTimeline.length > 0 ? (
            <div className="h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.focusTimeline}
                  margin={{
                    top: 14,
                    right: 10,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="focusLine"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#bfdbfe" />
                      <stop offset="52%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#eef1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip content={<FocusTooltip />} />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="url(#focusLine)"
                    strokeWidth={2.4}
                    dot={{
                      r: 2.8,
                      fill: "#ffffff",
                      stroke: "#0284c7",
                      strokeWidth: 1.9,
                    }}
                    activeDot={{
                      r: 4.5,
                      fill: "#ffffff",
                      stroke: "#0284c7",
                      strokeWidth: 2.4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <CompactEmpty text="No scored study-session history exists for this selected date range." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            text={
              data.focusTimeline.length > 0
                ? `${data.focusTimeline.length} real scored sessions are included in this trend.`
                : "The trend will appear after session-level scored activity is recorded."
            }
            tone="violet"
          />
        </CompactCard>

        <CompactCard
          title="Best Days to Study"
          info="Average rule-recall score by the user's local weekday."
        >
          {bestDaysData.length > 0 ? (
            <div className="h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.bestDays}
                  margin={{
                    top: 14,
                    right: 4,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="dayBar"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#dbeafe" />
                      <stop offset="48%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#eef1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip content={<BestDayTooltip />} />

                  <Bar
                    dataKey="accuracy"
                    radius={[6, 6, 1, 1]}
                  >
                    {data.bestDays.map((day) => (
                      <Cell
                        key={day.label}
                        fill={
                          day.accuracy === null
                            ? "#eef2f7"
                            : "url(#dayBar)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <CompactEmpty text="Complete rule attempts on multiple days to identify your strongest study days." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            text={
              bestDay
                ? `${bestDay.label} currently has your highest recorded rule accuracy at ${bestDay.accuracy}%.`
                : "Your strongest weekday will appear after enough rule attempts are recorded."
            }
            tone="violet"
          />
        </CompactCard>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.8fr_1.08fr]">
        <CompactCard
          title="Time vs Accuracy"
          info="Each point represents one real scored study session."
        >
          {data.scatter.length > 0 ? (
            <div className="h-[205px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{
                    top: 12,
                    right: 12,
                    left: -16,
                    bottom: 2,
                  }}
                >
                  <defs>
                    <radialGradient id="scatterPoint" cx="35%" cy="30%" r="75%">
                      <stop offset="0%" stopColor="#f5f3ff" />
                      <stop offset="46%" stopColor="#ddd6fe" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </radialGradient>
                  </defs>

                  <CartesianGrid stroke="#eef1f6" />

                  <XAxis
                    type="number"
                    dataKey="minutes"
                    name="Study time"
                    unit=" min"
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    type="number"
                    dataKey="accuracy"
                    name="Accuracy"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fontWeight: 400 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={<ScatterTooltip />}
                  />

                  <Scatter data={data.scatter} fill="url(#scatterPoint)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <CompactEmpty text="Scored sessions with recorded duration are required for time-versus-accuracy analysis." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            text={
              data.scatter.length > 0
                ? `${data.scatter.length} real session records are shown.`
                : "This chart does not display placeholder session points."
            }
            tone="violet"
          />
        </CompactCard>

        <CompactCard
          title="Time Allocation"
          info="Recorded session duration grouped by the real session mode."
        >
          {data.allocation.length > 0 &&
          data.summary.totalSeconds > 0 ? (
            <div className="grid grid-cols-[145px_1fr] items-center gap-3">
              <div className="h-[175px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {data.allocation.map((item, index) => {
                        const color =
                          PIE_COLORS[index % PIE_COLORS.length]

                        return (
                          <linearGradient
                            key={item.mode}
                            id={`allocation-${index}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ffffff"
                              stopOpacity={0.82}
                            />
                            <stop
                              offset="42%"
                              stopColor={color}
                              stopOpacity={0.58}
                            />
                            <stop
                              offset="100%"
                              stopColor={color}
                              stopOpacity={0.9}
                            />
                          </linearGradient>
                        )
                      })}
                    </defs>

                    <Pie
                      data={data.allocation}
                      dataKey="seconds"
                      nameKey="label"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth={2}
                    >
                      {data.allocation.map((item, index) => (
                        <Cell
                          key={item.mode}
                          fill={`url(#allocation-${index})`}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {data.allocation.map((item, index) => (
                  <div
                    key={item.mode}
                    className="flex items-center gap-2 text-[9px] font-medium"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                      style={{
                        backgroundColor:
                          PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />

                    <span className="min-w-0 flex-1 truncate text-[#30395a]">
                      {item.label}
                    </span>

                    <span className="shrink-0 text-slate-500">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CompactEmpty text="No recorded session duration exists for time-allocation analysis." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            text={
              data.allocation[0]
                ? `${data.allocation[0].label} currently accounts for the largest share of recorded study time.`
                : "Time allocation will appear after study sessions record duration and mode."
            }
            tone="violet"
          />
        </CompactCard>

        <CompactCard
          title="Time Efficiency"
          info="Real scored-session accuracy grouped into broader duration ranges."
        >
          {data.efficiency.some(
            (item) => item.accuracy !== null
          ) ? (
            <div className="space-y-3 py-1">
              {data.efficiency.map((item) => (
                <EfficiencyRow key={item.key} item={item} />
              ))}
            </div>
          ) : (
            <CompactEmpty text="No scored sessions with recorded duration are available for efficiency analysis." />
          )}

          <InsightNote
            icon={<Lightbulb size={14} />}
            text={
              bestSessionBucket
                ? `${bestSessionBucket.label} is currently your strongest recorded duration range.`
                : "Efficiency recommendations will appear only after real scored sessions exist."
            }
            tone="violet"
          />
        </CompactCard>
      </section>

      <section className="rounded-2xl border border-[#ded8f5] bg-gradient-to-r from-[#fbf9ff] via-white to-[#fbf9ff] px-4 py-3.5 shadow-[0_7px_20px_rgba(52,35,110,0.04)]">
        {data.recommendation ? (
          <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_1.3fr_0.85fr]">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Brain size={28} />
              </div>

              <div>
                <div className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[8px] font-normal text-violet-700">
                  <Sparkles size={9} />
                  Lexora Insight
                </div>

                <p className="mt-2 text-[13px] font-normal leading-5 text-[#11163c]">
                  Study in{" "}
                  {data.recommendation.bestRangeLabel}{" "}
                  focused blocks.
                </p>

                <p className="mt-1 text-[9px] font-normal text-slate-500">
                  Based on{" "}
                  {data.recommendation.scoredSessions}{" "}
                  scored sessions.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-violet-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-normal text-[#11163c]">
                <TimerReset
                  size={15}
                  className="text-violet-600"
                />
                Recommended Daily Plan
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <PlanMetric
                  value={
                    data.recommendation.blocksPerDay
                      ? String(data.recommendation.blocksPerDay)
                      : "1"
                  }
                  label="Focused blocks"
                />

                <span className="text-[12px] text-slate-300">×</span>

                <PlanMetric
                  value={`${data.recommendation.blockMinutes} min`}
                  label="Per block"
                />

                <span className="text-[12px] text-slate-300">=</span>

                <PlanMetric
                  value={`${data.recommendation.totalMinutesPerDay} min`}
                  label="Daily target"
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-normal text-[#11163c]">
                Why this fits your data
              </div>

              <div className="mt-2 space-y-2">
                <EvidenceRow
                  text={`${data.recommendation.bestRangeLabel}: ${data.recommendation.bestRangeAccuracy ?? "—"}% recorded accuracy`}
                />

                {data.recommendation.bestDayLabel ? (
                  <EvidenceRow
                    text={`${data.recommendation.bestDayLabel}: ${data.recommendation.bestDayAccuracy ?? "—"}% recorded accuracy`}
                  />
                ) : null}

                <EvidenceRow
                  text={`${data.recommendation.scoredSessions} scored sessions analyzed`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Brain size={21} />
            </div>

            <div>
              <div className="text-[12px] font-normal text-[#11163c]">
                Personalized time recommendation
              </div>

              <p className="mt-1 text-[9px] font-normal text-slate-500">
                Complete scored sessions with recorded duration before Lexora recommends a study block length.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

type SparkPoint = {
  label: string
  value: number
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
  subtitle: string
  value: string
  footer: string
  tone: "violet" | "green" | "blue" | "amber"
  data: SparkPoint[]
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "blue"
        ? "bg-blue-50 text-blue-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-600"
          : "bg-violet-50 text-violet-700"

  const stroke =
    tone === "green"
      ? "#10b981"
      : tone === "blue"
        ? "#2563eb"
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

          <div className="mt-0.5 truncate text-[8px] font-normal text-slate-400">
            {subtitle}
          </div>

          <div className="mt-2 text-[21px] font-normal tracking-[-0.04em] text-[#11163c]">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1 text-[8px] font-normal text-slate-500">
          {footer}
        </div>

        <div className="h-8 w-20 shrink-0">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <defs>
                  <linearGradient
                    id={`spark-${tone}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
                    <stop offset="55%" stopColor={stroke} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={1} />
                  </linearGradient>
                </defs>

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={`url(#spark-${tone})`}
                  strokeWidth={1.8}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
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

        {info ? (
          <span
            title={info}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 text-[8px] font-normal text-slate-400"
          >
            i
          </span>
        ) : null}
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
  tone: "violet" | "green"
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-violet-50 text-violet-700"

  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[9px] font-normal leading-4 ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function EfficiencyRow({
  item,
}: {
  item: EfficiencyPoint
}) {
  const width = item.accuracy ?? 0

  const barClass =
    item.status === "best" || item.status === "good"
      ? "bg-[linear-gradient(90deg,#dcfce7_0%,#86efac_55%,#4ade80_100%)]"
      : item.status === "average"
        ? "bg-[linear-gradient(90deg,#fef9c3_0%,#fde68a_55%,#fbbf24_100%)]"
        : item.status === "low"
          ? "bg-[linear-gradient(90deg,#ffe4e6_0%,#fecdd3_55%,#fb7185_100%)]"
          : "bg-slate-200"

  const badgeClass =
    item.status === "best"
      ? "bg-emerald-50 text-emerald-700"
      : item.status === "good"
        ? "bg-blue-50 text-blue-700"
        : item.status === "average"
          ? "bg-amber-50 text-amber-700"
          : item.status === "low"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-50 text-slate-400"

  const badgeLabel =
    item.status === "best"
      ? "Best"
      : item.status === "good"
        ? "Good"
        : item.status === "average"
          ? "Average"
          : item.status === "low"
            ? "Low"
            : "No data"

  return (
    <div className="grid grid-cols-[90px_1fr_42px_54px] items-center gap-3 text-[9px] font-normal">
      <span className="text-[#30395a]">{item.label}</span>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <span className="text-right text-[#30395a]">
        {item.accuracy === null ? "—" : `${item.accuracy}%`}
      </span>

      <span
        className={`rounded-md px-2 py-1 text-center text-[8px] ${badgeClass}`}
      >
        {badgeLabel}
      </span>
    </div>
  )
}

function PlanMetric({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="min-w-[78px]">
      <div className="text-[18px] font-normal tracking-[-0.03em] text-[#11163c]">
        {value}
      </div>

      <div className="mt-0.5 text-[8px] font-normal text-slate-400">
        {label}
      </div>
    </div>
  )
}

function EvidenceRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-[9px] font-normal text-[#46516f]">
      <Check
        size={12}
        className="mt-0.5 shrink-0 text-emerald-600"
      />
      <span>{text}</span>
    </div>
  )
}

function CompactEmpty({ text }: { text: string }) {
  return (
    <div className="flex min-h-[205px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[10px] font-normal leading-4 text-slate-500">
      {text}
    </div>
  )
}

function SessionLengthTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: SessionLengthPoint }>
}) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  return (
    <TooltipBox>
      <TooltipTitle>{point.label}</TooltipTitle>
      <TooltipLine>Accuracy: {point.accuracy ?? "—"}%</TooltipLine>
      <TooltipLine>
        Scored sessions: {point.scoredSessions}
      </TooltipLine>
    </TooltipBox>
  )
}

function FocusTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: FocusTimelinePoint }>
}) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  return (
    <TooltipBox>
      <TooltipTitle>{point.dateLabel}</TooltipTitle>
      <TooltipLine>Accuracy: {point.score}%</TooltipLine>
      <TooltipLine>Duration: {point.minutes} min</TooltipLine>
    </TooltipBox>
  )
}

function BestDayTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: BestDayPoint }>
}) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  return (
    <TooltipBox>
      <TooltipTitle>{point.label}</TooltipTitle>
      <TooltipLine>Accuracy: {point.accuracy ?? "—"}%</TooltipLine>
      <TooltipLine>Rule attempts: {point.attempts}</TooltipLine>
    </TooltipBox>
  )
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: ScatterPoint }>
}) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  return (
    <TooltipBox>
      <TooltipLine>Duration: {point.minutes} min</TooltipLine>
      <TooltipLine>Accuracy: {point.accuracy}%</TooltipLine>
    </TooltipBox>
  )
}

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: AllocationPoint }>
}) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  return (
    <TooltipBox>
      <TooltipTitle>{point.label}</TooltipTitle>
      <TooltipLine>Time: {formatDuration(point.seconds)}</TooltipLine>
      <TooltipLine>Share: {point.percentage}%</TooltipLine>
    </TooltipBox>
  )
}

function TooltipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {children}
    </div>
  )
}

function TooltipTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[9px] font-normal text-[#30395a]">
      {children}
    </div>
  )
}

function TooltipLine({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 text-[9px] font-normal text-violet-700">
      {children}
    </div>
  )
}

function formatDuration(secondsValue: number) {
  const seconds = Math.max(0, Math.round(secondsValue))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  return "0m"
}

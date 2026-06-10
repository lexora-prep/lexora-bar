"use client"

import type { ReactNode } from "react"
import { Lock } from "lucide-react"

export function StudyPanelSection({
  children,
  compact = false,
}: {
  children: ReactNode
  compact?: boolean
}) {
  return (
    <section className={`border-b border-[#D6E4FF] px-5 ${compact ? "py-4" : "py-5"}`}>
      {children}
    </section>
  )
}

export function PanelField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3">
      <div className="pt-2 text-[12px] font-medium text-[#7F9CC0]">
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function OverviewRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: "violet" | "amber"
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#D6E4FF]/60 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#7F9CC0]">
        <span className="text-[#9EB9DF]">{icon}</span>
        {label}
      </div>
      <span className="font-mono text-[13px] font-semibold text-slate-800">
        {value}
      </span>
    </div>
  )
}

export function ProgressLine({
  label,
  value,
  percent,
  tone,
}: {
  label: string
  value: string
  percent: number
  tone: "violet" | "amber"
}) {
  const fill =
    tone === "violet"
      ? "bg-[#7C5CFC] shadow-[0_0_14px_rgba(124,92,252,0.55)]"
      : "bg-[#EF9F27] shadow-[0_0_14px_rgba(239,159,39,0.5)]"

  const valueClass = tone === "violet" ? "text-[#7C5CFC]" : "text-amber-700"

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className={`font-mono text-[13px] font-semibold ${valueClass}`}>
          {value}
        </span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-[#E8EFFF]">
        <div
          className={`relative h-full overflow-hidden rounded-full ${fill} transition-all duration-1000 ease-out before:absolute before:inset-0 before:translate-x-[-100%] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] before:animate-[progressShimmer_2s_ease-in-out_infinite]`}
          style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
        />
      </div>
    </div>
  )
}

export function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <div>{value}</div>
    </div>
  )
}

export function PremiumBadge({ onClick }: { onClick?: () => void }) {
  const content = (
    <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      Coming soon
      <span>🔒</span>
    </span>
  )

  if (!onClick) return content

  return (
    <button type="button" onClick={onClick}>
      {content}
    </button>
  )
}

export function MetricCard({
  title,
  value,
  suffix,
  subtitle,
  progress,
  accent,
  locked = false,
  premiumTag = false,
  delta,
  deltaMode,
  onClickLocked,
}: {
  title: string
  value: string
  suffix?: string
  subtitle: string
  progress: number
  accent: "blue" | "violet" | "emerald"
  locked?: boolean
  premiumTag?: boolean
  delta?: number | null
  deltaMode: "goal" | "average"
  onClickLocked?: () => void
}) {
  const palette =
    accent === "blue"
      ? { bar: "from-blue-500 to-sky-400" }
      : accent === "violet"
        ? { bar: "from-violet-500 to-fuchsia-400" }
        : { bar: "from-emerald-500 to-teal-400" }

  const deltaClass =
    typeof delta === "number"
      ? delta >= 0
        ? "text-emerald-600"
        : "text-rose-600"
      : "text-slate-400"

  const clickable = Boolean(onClickLocked && locked)

  return (
    <button
      type="button"
      onClick={clickable ? onClickLocked : undefined}
      className={`w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-3 text-left ${
        clickable
          ? "transition hover:border-amber-300 hover:bg-amber-50/20"
          : ""
      }`}
    >
      <div className="mb-2 flex min-h-[20px] items-start justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.11em] text-slate-400">
          {title}
        </span>

        {premiumTag && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-700">
            <Lock size={9} />
            Coming Soon
          </span>
        )}
      </div>

      <div className="mb-2 flex min-h-[42px] items-end">
        <div
          className={`text-[21px] font-bold tracking-[-0.04em] ${
            locked ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {value}
          {suffix ? (
            <span className="ml-1 text-[12px] font-medium text-slate-400">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex min-h-[34px] items-start justify-between gap-3">
        <span className="max-w-[70%] text-[10px] leading-4 text-slate-500">
          {subtitle}
        </span>

        <span className={`text-right text-[10px] font-semibold ${deltaClass}`}>
          {typeof delta === "number"
            ? `${delta >= 0 ? "↗ +" : "↘ "}${delta.toFixed(0)}% ${
                deltaMode === "goal" ? "goal" : "avg"
              }`
            : ""}
        </span>
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-[5px] rounded-full bg-gradient-to-r ${palette.bar}`}
          style={{ width: `${locked ? 0 : Math.max(0, Math.min(progress, 100))}%` }}
        />
      </div>
    </button>
  )
}

export function AnalyticsRowNoPercent({
  name,
  completed,
  total,
  progressWidth,
  level,
}: {
  name: string
  completed: number
  total: number
  progressWidth: number
  level: string
}) {
  const tone =
    level === "Strong"
      ? "strong"
      : level === "Progressing"
        ? "good"
        : level === "Building"
          ? "mid"
          : "weak"

  const toneClasses =
    tone === "strong"
      ? {
          dot: "bg-emerald-400",
          bar: "from-emerald-400 to-emerald-500",
          badge: "bg-emerald-50 text-emerald-700",
        }
      : tone === "good"
        ? {
            dot: "bg-blue-400",
            bar: "from-blue-400 to-blue-500",
            badge: "bg-blue-50 text-blue-700",
          }
        : tone === "mid"
          ? {
              dot: "bg-amber-400",
              bar: "from-amber-400 to-orange-500",
              badge: "bg-amber-50 text-amber-700",
            }
          : {
              dot: "bg-rose-400",
              bar: "from-rose-400 to-rose-500",
              badge: "bg-rose-50 text-rose-700",
            }

  return (
    <div className="grid grid-cols-[minmax(160px,2fr)_94px_120px_90px] items-center gap-2 border-b border-slate-200 px-4 py-2 transition hover:bg-slate-50">
      <div className="flex items-center gap-2.5 font-medium text-[12px]">
        <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} />
        <span>{name}</span>
      </div>

      <div className="text-[11px] text-slate-500">
        <span className="font-semibold text-violet-600">{completed}</span> /{" "}
        {total}
      </div>

      <div>
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-[5px] rounded-full bg-gradient-to-r ${toneClasses.bar}`}
            style={{
              width: `${Math.max(0, Math.min(progressWidth, 100))}%`,
            }}
          />
        </div>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${toneClasses.badge}`}
        >
          {level}
        </span>
      </div>
    </div>
  )
}

export function ChartCard({
  icon,
  title,
  subtitle,
  children,
  premium = false,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  premium?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_-24px_rgba(15,23,42,0.25)]">
      {premium && (
        <>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl" />
        </>
      )}

      <div className="relative mb-1 flex items-center gap-2 text-[13px] font-semibold">
        <span className="text-violet-500">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="relative mb-3 text-[11px] text-slate-500">{subtitle}</div>
      <div className="relative">{children}</div>
    </div>
  )
}

export function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[190px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  )
}

export function LockedChartCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/40 text-center transition hover:bg-amber-50"
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Lock size={16} />
      </div>
      <div className="text-[13px] font-semibold text-slate-800">
        Coming soon
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        This practice module is not active yet.
      </div>
    </button>
  )
}

export function CompactCompareMetric({
  label,
  you,
  avg,
  top,
  accent,
  locked = false,
}: {
  label: string
  you: number | null
  avg: number | null
  top: number | null
  accent: "blue" | "violet"
  locked?: boolean
}) {
  const userBar =
    accent === "blue"
      ? "bg-[linear-gradient(90deg,#3b82f6,#2563eb)]"
      : "bg-[linear-gradient(90deg,#8b5cf6,#7c3aed)]"

  const avgBar =
    accent === "blue"
      ? "bg-[linear-gradient(90deg,#cbd5e1,#94a3b8)]"
      : "bg-[linear-gradient(90deg,#ddd6fe,#a78bfa)]"

  const hasAvg = avg !== null && avg !== undefined && Number.isFinite(Number(avg))
  const hasTop = top !== null && top !== undefined && Number.isFinite(Number(top))
  const safeYou = Math.max(0, Math.min(you ?? 0, 100))
  const safeAvg = hasAvg ? Math.max(0, Math.min(Number(avg), 100)) : 0
  const difference = hasAvg ? (you ?? 0) - Number(avg) : null

  return (
    <div className="space-y-2 px-0 py-0">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-slate-700">{label}</span>

        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Lock size={10} />
            Coming Soon
          </span>
        ) : (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-emerald-600">
              You: {you ?? 0}%
            </span>
            <span className="text-slate-500">
              Avg: {hasAvg ? `${Number(avg)}%` : "N/A"}
            </span>
            <span className="text-orange-500">
              Top: {hasTop ? `${Number(top)}%` : "N/A"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-[6px] overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-[6px] rounded-full ${userBar}`}
            style={{
              width: `${locked ? 0 : safeYou}%`,
            }}
          />
        </div>

        {!locked && hasAvg && (
          <div className="h-[6px] overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-[6px] rounded-full ${avgBar}`}
              style={{ width: `${safeAvg}%` }}
            />
          </div>
        )}
      </div>

      <div className="text-[11px] leading-5 text-slate-500">
        {locked ? (
          <span className="premium-glow-text font-medium">
            State comparison coming soon
          </span>
        ) : difference === null ? (
          "Not enough state data yet"
        ) : (
          `Difference: ${difference >= 0 ? "+" : ""}${difference.toFixed(
            0
          )}% vs state avg`
        )}
      </div>
    </div>
  )
}

export function SimpleLineChart({
  labels,
  seriesA,
  seriesB,
}: {
  labels: string[]
  seriesA: number[]
  seriesB: number[]
}) {
  const width = 720
  const height = 240
  const padLeft = 18
  const padRight = 18
  const padTop = 18
  const padBottom = 34

  const all = [...seriesA, ...seriesB]
  const minVal = Math.min(...all)
  const maxVal = Math.max(...all)
  const min = Math.max(0, Math.floor((minVal - 8) / 5) * 5)
  const max = Math.min(100, Math.ceil((maxVal + 8) / 5) * 5 || 100)
  const usableMax = max === min ? max + 1 : max

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom
  const xStep = chartW / Math.max(labels.length - 1, 1)

  function y(v: number) {
    return padTop + (1 - (v - min) / (usableMax - min)) * chartH
  }

  function x(i: number) {
    return padLeft + i * xStep
  }

  function buildSmoothPath(values: number[]) {
    if (values.length === 0) return ""

    if (values.length === 1) {
      return `M ${x(0)} ${y(values[0])}`
    }

    let d = `M ${x(0)} ${y(values[0])}`

    for (let i = 0; i < values.length - 1; i++) {
      const x0 = x(i)
      const y0 = y(values[i])
      const x1 = x(i + 1)
      const y1 = y(values[i + 1])
      const cx1 = x0 + (x1 - x0) / 2
      const cy1 = y0
      const cx2 = x0 + (x1 - x0) / 2
      const cy2 = y1
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x1} ${y1}`
    }

    return d
  }

  function buildAreaPath(values: number[]) {
    if (values.length === 0) return ""
    const line = buildSmoothPath(values)
    const endX = x(values.length - 1)
    const startX = x(0)
    const baseY = padTop + chartH
    return `${line} L ${endX} ${baseY} L ${startX} ${baseY} Z`
  }

  const pathA = buildSmoothPath(seriesA)
  const areaA = buildAreaPath(seriesA)

  const yTicks = 4
  const tickValues = Array.from({ length: yTicks }, (_, i) => {
    const ratio = i / (yTicks - 1)
    return Math.round(max - ratio * (max - min))
  })

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_35%_0%,rgba(139,92,246,0.10),transparent_22%)]" />

      <svg viewBox={`0 0 ${width} ${height}`} className="relative h-[240px] w-full">
        <defs>
          <linearGradient id="trendStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4F7BFF" />
            <stop offset="55%" stopColor="#5B8CFF" />
            <stop offset="100%" stopColor="#7C5CFF" />
          </linearGradient>

          <linearGradient id="trendFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,123,255,0.28)" />
            <stop offset="55%" stopColor="rgba(99,102,241,0.12)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
          </linearGradient>

          <filter id="trendGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="trendSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="blur2" />
            <feColorMatrix
              in="blur2"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.22 0"
            />
          </filter>
        </defs>

        {tickValues.map((v, i) => {
          const yy = padTop + (chartH / (yTicks - 1)) * i
          return (
            <line
              key={`${v}-${i}`}
              x1={padLeft}
              x2={width - padRight}
              y1={yy}
              y2={yy}
              stroke={
                i === yTicks - 1
                  ? "rgba(148,163,184,0.18)"
                  : "rgba(148,163,184,0.12)"
              }
              strokeWidth="1"
            />
          )
        })}

        {seriesB.length > 0 && (
          <path
            d={buildSmoothPath(seriesB)}
            fill="none"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <path d={areaA} fill="url(#trendFillGradient)" />

        <path
          d={pathA}
          fill="none"
          stroke="url(#trendStrokeGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trendGlow)"
        />

        <path
          d={pathA}
          fill="none"
          stroke="rgba(99,102,241,0.30)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#trendSoftGlow)"
        />

        {seriesA.map((v, i) => {
          const cx = x(i)
          const cy = y(v)
          const isLast = i === seriesA.length - 1
          const shouldShow = isLast || i === Math.floor(seriesA.length / 2) || i === 0

          if (!shouldShow) return null

          return (
            <g key={`${v}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={isLast ? 13 : 9}
                fill="rgba(79,123,255,0.16)"
              />
              <circle
                cx={cx}
                cy={cy}
                r={isLast ? 8 : 6}
                fill="#4F7BFF"
                stroke="#ffffff"
                strokeWidth={isLast ? 4 : 3}
              />
              <title>{`You: ${v}%${seriesB[i] !== undefined ? ` | Avg: ${seriesB[i]}%` : ""}`}</title>
            </g>
          )
        })}

        {labels.map((label, i) => {
          const isLast = i === labels.length - 1
          return (
            <text
              key={`${label}-${i}`}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isLast ? 700 : 500}
              fill={isLast ? "#4F7BFF" : "#94a3b8"}
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export function SimpleBarChart({
  rows,
  showAverage = true,
}: {
  rows: { name: string; value: number; avg: number | null }[]
  showAverage?: boolean
}) {
  const width = 640
  const height = 190
  const pad = 20
  const chartHeight = height - pad * 2
  const barWidth = showAverage ? 16 : 28
  const groupGap = showAverage ? 20 : 26
  const startX = 34

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full">
        {[0, 25, 50, 75, 100].map((v) => {
          const yy = height - pad - (v / 100) * chartHeight
          return (
            <g key={v}>
              <line
                x1={pad}
                x2={width - pad}
                y1={yy}
                y2={yy}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth="1"
              />
              <text x={6} y={yy + 3} fontSize="10" fill="#94a3b8">
                {v}
              </text>
            </g>
          )
        })}

        {rows.slice(0, 7).map((row, i) => {
          const x =
            startX + i * (showAverage ? barWidth * 2 + groupGap : barWidth + groupGap)
          const yourH = (row.value / 100) * chartHeight
          const avgH = row.avg !== null ? (row.avg / 100) * chartHeight : 0

          return (
            <g key={row.name}>
              <rect
                x={x}
                y={height - pad - yourH}
                width={barWidth}
                height={yourH}
                rx="3"
                fill="rgba(123,143,232,0.88)"
              >
                <title>{`${row.name} | You: ${row.value}%${
                  row.avg !== null ? ` | State avg: ${row.avg}%` : ""
                }`}</title>
              </rect>

              {showAverage && row.avg !== null && (
                <rect
                  x={x + barWidth + 5}
                  y={height - pad - avgH}
                  width={barWidth}
                  height={avgH}
                  rx="3"
                  fill="rgba(58,64,85,0.9)"
                >
                  <title>{`${row.name} | State avg: ${row.avg}%`}</title>
                </rect>
              )}

              <text
                x={showAverage ? x + barWidth + 2 : x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {shortSubject(row.name)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function QuickStartCard({
  title,
  subtitle,
  onClick,
  locked = false,
}: {
  title: string
  subtitle: string
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-between rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50"
    >
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span>{title}</span>
          {locked && <Lock size={12} className="text-amber-500" />}
        </div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>
      <div className="text-lg text-slate-400">›</div>
    </button>
  )
}

export function WeekStat({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
      <div className="text-[16px] font-medium tracking-[-0.02em] text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-slate-400">
        {label}
      </div>
    </div>
  )
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function shortSubject(name: string) {
  if (name === "Civil Procedure") return "Civil"
  if (name === "Constitutional Law") return "Con"
  if (name === "Criminal Law and Procedure") return "Crim"
  if (name === "Real Property") return "Real"
  if (name === "Business Associations") return "BA"
  return name.split(" ")[0]
}

export function shortDateLabel(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
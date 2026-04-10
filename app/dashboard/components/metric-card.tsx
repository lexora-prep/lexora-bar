"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  progress?: number
  accent: "emerald" | "blue"
  delta?: number | null
  deltaMode: "goal" | "average"
}

export function MetricCard({
  title,
  value,
  subtitle,
  progress,
  accent,
  delta,
  deltaMode,
}: MetricCardProps) {
  const accentBorder =
    accent === "emerald" ? "border-l-emerald-500" : "border-l-blue-500"

  const barClass =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : "bg-gradient-to-r from-blue-500 to-blue-400"

  const deltaPositive = typeof delta === "number" && delta >= 0
  const deltaClass = deltaPositive ? "text-emerald-600" : "text-rose-500"

  return (
    <div
      className={`rounded-xl border-l-4 ${accentBorder} bg-white p-5 shadow-sm border border-slate-200`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>

      {typeof progress === "number" && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barClass} transition-all duration-500`}
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">{subtitle}</span>

        {typeof delta === "number" && (
          <span className={`flex items-center gap-1 font-semibold ${deltaClass}`}>
            {deltaPositive ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {deltaPositive ? "+" : ""}
            {delta.toFixed(0)}% {deltaMode === "goal" ? "to goal" : "vs avg"}
          </span>
        )}
      </div>
    </div>
  )
}

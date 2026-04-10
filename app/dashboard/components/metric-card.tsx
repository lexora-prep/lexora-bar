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
  const deltaClass = deltaPositive ? "text-emerald-400" : "text-rose-400"

  return (
    <div
      className={`rounded-xl border-l-2 ${accentBorder} bg-card p-4 border border-border`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>

      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>

      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barClass} transition-all duration-500`}
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{subtitle}</span>

        {typeof delta === "number" && (
          <span className={`flex items-center gap-1 font-medium ${deltaClass}`}>
            {deltaPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {deltaPositive ? "+" : ""}
            {delta.toFixed(0)}% {deltaMode === "goal" ? "to goal" : "vs avg"}
          </span>
        )}
      </div>
    </div>
  )
}

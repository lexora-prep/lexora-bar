"use client"

interface CompactCompareRowProps {
  label: string
  value: number
  avg: number
  top: number
  diffLabel: string
  accent: "emerald" | "blue"
  locked?: boolean
}

export function CompactCompareRow({
  label,
  value,
  avg,
  top,
  diffLabel,
  accent,
  locked = false,
}: CompactCompareRowProps) {
  const barClass =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : "bg-gradient-to-r from-blue-500 to-blue-400"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-medium text-emerald-400">{diffLabel}</span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute h-full rounded-full ${barClass} transition-all duration-300`}
          style={{ width: `${locked ? 0 : Math.min(value, 100)}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/50"
          style={{ left: `${locked ? 0 : Math.min(avg, 100)}%` }}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {locked
          ? "Upgrade to Premium to access MBE analytics"
          : `You: ${value}% | Avg: ${avg}% | Top: ${top}%`}
      </div>
    </div>
  )
}

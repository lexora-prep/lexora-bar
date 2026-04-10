"use client"

interface SubjectProgressRowProps {
  name: string
  leftBadge: string
  rightBadge: string
  value: number
  accent: "emerald" | "blue"
  footer?: string
  avg?: number
}

export function SubjectProgressRow({
  name,
  leftBadge,
  rightBadge,
  value,
  accent,
  footer,
  avg,
}: SubjectProgressRowProps) {
  const badgeClass =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-blue-500/15 text-blue-400"

  const barClass =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : "bg-gradient-to-r from-blue-500 to-blue-400"

  return (
    <div className="rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary/70">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{name}</span>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
          >
            {leftBadge}
          </span>

          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
          >
            {rightBadge}
          </span>
        </div>
      </div>

      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute h-full rounded-full ${barClass} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />

        {typeof avg === "number" && (
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/50"
            style={{ left: `${Math.min(avg, 100)}%` }}
          />
        )}
      </div>

      {footer && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">{footer}</div>
      )}
    </div>
  )
}

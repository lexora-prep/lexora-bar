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
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-blue-50 text-blue-700 border border-blue-200"

  const barClass =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : "bg-gradient-to-r from-blue-500 to-blue-400"

  return (
    <div className="rounded-lg bg-slate-50 p-4 transition-colors hover:bg-slate-100">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-800">{name}</span>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {leftBadge}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {rightBadge}
          </span>
        </div>
      </div>

      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`absolute h-full rounded-full ${barClass} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />

        {typeof avg === "number" && (
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-600"
            style={{ left: `${Math.min(avg, 100)}%` }}
          />
        )}
      </div>

      {footer && (
        <div className="mt-2 text-xs text-slate-500">{footer}</div>
      )}
    </div>
  )
}

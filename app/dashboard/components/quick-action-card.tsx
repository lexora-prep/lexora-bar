"use client"

import { ChevronRight } from "lucide-react"

interface QuickActionCardProps {
  title: string
  subtitle: string
  onClick: () => void
  accent: "emerald" | "blue" | "amber"
}

export function QuickActionCard({
  title,
  subtitle,
  onClick,
  accent,
}: QuickActionCardProps) {
  const hoverBorder =
    accent === "emerald"
      ? "hover:border-emerald-400"
      : accent === "blue"
        ? "hover:border-blue-400"
        : "hover:border-amber-400"

  const iconClass =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "blue"
        ? "text-blue-500"
        : "text-amber-500"

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:bg-slate-50 hover:shadow-sm ${hoverBorder}`}
    >
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
      <ChevronRight size={18} className={iconClass} />
    </button>
  )
}

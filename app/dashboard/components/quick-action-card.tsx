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
      ? "hover:border-emerald-500/50"
      : accent === "blue"
        ? "hover:border-blue-500/50"
        : "hover:border-amber-500/50"

  const iconClass =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "blue"
        ? "text-blue-500"
        : "text-amber-500"

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-secondary/50 ${hoverBorder}`}
    >
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ChevronRight size={16} className={iconClass} />
    </button>
  )
}

"use client"

import { ClipboardList, ChevronRight } from "lucide-react"

interface SmartPlanBannerProps {
  todayBll: number
  goalBll: number
  onOpenPlan: () => void
  onTrainWeakAreas: () => void
}

export function SmartPlanBanner({
  todayBll,
  goalBll,
  onOpenPlan,
  onTrainWeakAreas,
}: SmartPlanBannerProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <ClipboardList size={18} />
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">
              Today&apos;s Smart Plan
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {todayBll} / {goalBll} rules today
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenPlan}
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Study Plan
          </button>

          <button
            onClick={onTrainWeakAreas}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Train Weak Areas
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

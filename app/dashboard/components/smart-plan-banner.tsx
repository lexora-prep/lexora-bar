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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ClipboardList size={22} />
          </div>

          <div>
            <div className="text-base font-bold text-slate-900">
              Today&apos;s Smart Plan
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              {todayBll} / {goalBll} rules scheduled for today
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onOpenPlan}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Study Plan
          </button>

          <button
            onClick={onTrainWeakAreas}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Train Weak Areas
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

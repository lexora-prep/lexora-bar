"use client"

import { Globe, ChevronDown } from "lucide-react"
import { CompactCompareRow } from "./compact-compare-row"
import { QuickActionCard } from "./quick-action-card"
import { DashboardCard } from "./dashboard-card"

interface StateComparisonProps {
  state: string
  onChangeState: () => void
  isPremium: boolean
  userMBE: number
  stateMBEAvg: number
  topMBE: number
  mbeDiff: number
  userBLL: number
  stateBLLAvg: number
  topBLL: number
  bllDiff: number
  onMBEPractice: () => void
  onRuleTraining: () => void
  onWeakAreas: () => void
}

export function StateComparison({
  state,
  onChangeState,
  isPremium,
  userMBE,
  stateMBEAvg,
  topMBE,
  mbeDiff,
  userBLL,
  stateBLLAvg,
  topBLL,
  bllDiff,
  onMBEPractice,
  onRuleTraining,
  onWeakAreas,
}: StateComparisonProps) {
  return (
    <DashboardCard className="h-fit xl:sticky xl:top-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Globe size={16} className="text-slate-600" />
            {state}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            You vs State Average
          </div>
        </div>

        <button
          onClick={onChangeState}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
        >
          Change State
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="space-y-6">
        <CompactCompareRow
          label="MBE Accuracy"
          value={isPremium ? userMBE : 0}
          avg={isPremium ? stateMBEAvg : 0}
          top={topMBE}
          diffLabel={
            isPremium
              ? `${mbeDiff >= 0 ? "+" : ""}${mbeDiff.toFixed(0)}% vs avg`
              : "🔒 Premium"
          }
          accent="blue"
          locked={!isPremium}
        />

        <CompactCompareRow
          label="BLL Score"
          value={userBLL}
          avg={stateBLLAvg}
          top={topBLL}
          diffLabel={`${bllDiff >= 0 ? "+" : ""}${bllDiff.toFixed(0)}% vs avg`}
          accent="emerald"
        />

        <div className="space-y-3 border-t border-slate-200 pt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Start
          </div>

          <QuickActionCard
            title="MBE Practice"
            subtitle={isPremium ? "Go to MBE drills" : "Premium only"}
            accent="blue"
            onClick={onMBEPractice}
          />
          <QuickActionCard
            title="Rule Training"
            subtitle="Continue BLL memorization"
            accent="emerald"
            onClick={onRuleTraining}
          />
          <QuickActionCard
            title="Weak Areas"
            subtitle="Train your weakest rules"
            accent="amber"
            onClick={onWeakAreas}
          />
        </div>
      </div>
    </DashboardCard>
  )
}

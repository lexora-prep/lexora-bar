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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Globe size={15} />
            {state}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            You vs State Average
          </div>
        </div>

        <button
          onClick={onChangeState}
          className="inline-flex items-center gap-1 text-xs text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Change State
          <ChevronDown size={12} />
        </button>
      </div>

      <div className="space-y-5">
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

        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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

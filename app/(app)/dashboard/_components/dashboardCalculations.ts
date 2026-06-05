import type { RuleSet } from "./dashboardTypes"
import { RULE_PACKAGE_META } from "./dashboardConstants"

export function getPositiveNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }

  return 0
}

export function getPlanTotalRules(source?: any, fallback?: any) {
  return getPositiveNumber(
    source?.baseTotalRules,
    source?.base_total_rules,
    source?.totalRules,
    source?.total_rules,
    source?.totalRuleCount,
    source?.total_rule_count,
    source?.remainingRules,
    source?.remaining_rules,
    fallback
  )
}

export function getEffectivePackageRuleTotal(
  baseTotalRules: number,
  packageType: RuleSet
) {
  const safeBase =
    Number.isFinite(baseTotalRules) && baseTotalRules > 0 ? baseTotalRules : 0
  const multiplier = RULE_PACKAGE_META[packageType]?.multiplier ?? 1

  if (safeBase <= 0) return 0

  return Math.max(1, Math.round(safeBase * multiplier))
}

export function getRecommendedRuleSet(
  daysLeft: number,
  isPremium: boolean
): RuleSet {
  if (daysLeft <= 14) return "emergency"
  if (daysLeft <= 45) return "priority"
  if (daysLeft <= 90) return "core"
  return isPremium ? "full" : "core"
}

export function isHeavierPackage(selected: RuleSet, recommended: RuleSet) {
  const order: RuleSet[] = ["emergency", "priority", "core", "full"]
  return order.indexOf(selected) > order.indexOf(recommended)
}

export function getSubjectRuleTotal(rows?: any[]) {
  if (!Array.isArray(rows)) return 0

  return rows.reduce((sum, row) => {
    const total = Number(row?.total ?? 0)
    if (!Number.isFinite(total) || total <= 0) return sum
    return sum + total
  }, 0)
}

export function getSafeDailyRules(
  totalRules: number,
  activeStudyDays: number,
  fallbackDailyRules?: any
) {
  const fallback = Number(fallbackDailyRules)

  if (
    Number.isFinite(totalRules) &&
    totalRules > 0 &&
    Number.isFinite(activeStudyDays) &&
    activeStudyDays > 0
  ) {
    return Math.max(1, Math.ceil(totalRules / activeStudyDays))
  }

  if (Number.isFinite(fallback) && fallback > 0) {
    return Math.max(1, Math.ceil(fallback))
  }

  return 0
}

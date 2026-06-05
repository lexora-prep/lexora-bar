import type { RuleSet, SubscriptionTier } from "./dashboardTypes"

export function normalizeRuleSet(value: unknown): RuleSet {
  const clean = String(value ?? "").toLowerCase().trim()

  if (clean === "emergency") return "emergency"
  if (clean === "priority") return "priority"
  if (clean === "full") return "full"
  return "core"
}

export function getSubscriptionTier(profile: any): SubscriptionTier {
  const rawTier = String(profile?.subscription_tier ?? "").toLowerCase()

  if (rawTier === "premium") return "premium"
  if (rawTier === "monthly") return "monthly"
  if (rawTier === "paid") return "monthly"

  if (profile?.mbe_access === true) return "premium"

  return "free"
}

export function getEntitlements(profile: any) {
  const tier = getSubscriptionTier(profile)

  return {
    tier,
    canCreateStudyPlan: true,
    canUseJurisdictionPicker: true,
    canUseExamRegimeDetection: true,
    canSeeExamCountdown: true,
    canUseCalendar: tier === "monthly" || tier === "premium",
    canUseLimitedCalendar: tier === "free",
    canUseCoreRules: tier === "monthly" || tier === "premium",
    canPreviewCoreRules: tier === "free",
    canUsePriorityRules: tier === "monthly" || tier === "premium",
    canUseFullRuleBank: tier === "premium",
    canUseCustomRules: tier === "monthly" || tier === "premium",
    canAddCustomRulesToPlan: tier === "monthly" || tier === "premium",
    canUseMultiplePackages: tier === "premium",
    canUseLimitedMultiplePackages: tier === "monthly",
    canUseSpacedReview: tier === "monthly" || tier === "premium",
    canUseWeakAreaTraining: tier === "monthly" || tier === "premium",
    canUseAdvancedWeakAreaTraining: tier === "premium",
    canUseSecondRound: tier === "monthly" || tier === "premium",
    canUseFinalWeakAreaRound: tier === "premium",
    canUseBasicBLLAnalytics: true,
    canUseBLLAnalytics: tier === "monthly" || tier === "premium",
    canUseAdvancedBLLAnalytics: tier === "premium",
    canUseStateComparison: true,
    canUseAdvancedStateComparison: tier === "premium",
    canSeeMBEComingSoon: tier === "premium",
    canUseMBEPractice: false,
    canUseMBEAnalytics: false,
  }
}

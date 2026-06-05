export type RuleSet = "emergency" | "priority" | "core" | "full"
export type SubscriptionTier = "free" | "monthly" | "premium"

export type ExamRegime =
  | "UBE_CURRENT"
  | "NEXTGEN"
  | "CALIFORNIA_CURRENT"
  | "FLORIDA_CURRENT"
  | "FLORIDA_NEXTGEN"
  | "STATE_SPECIFIC"
  | "TERRITORY_SPECIAL"
  | "LOCAL_COMPONENT"

export type JurisdictionGroup =
  | "UBE / Uniform Current"
  | "California"
  | "Florida"
  | "State-Specific / Non-UBE"
  | "Territories / Special"
  | "Local Component"

export type JurisdictionOption = {
  code: string
  name: string
  group: JurisdictionGroup
  nextGenStart?: string
  needsVerification?: boolean
  localComponent?: boolean
}

export type SubjectPlanItem = {
  name: string
  weight: number
  system: ExamRegime
}

export type CalendarDay = {
  date: Date
  isOff: boolean
  isPadding?: boolean
  isExamDay?: boolean
}

export type AnalyticsRange = "7d" | "14d" | "30d" | "custom"
export type AnalyticsMode = "BLL" | "MBE"

export type SubjectAnalyticsRow = {
  name: string
  accuracy: number
  completed: number
  total: number
  level: string
  progressWidth: number
}

export type TrendPoint = {
  date: string
  mbe: number
  bll: number
}

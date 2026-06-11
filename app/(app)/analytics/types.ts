export type DashboardData = {
  bllScore: number
  ruleAttempts: number
  prevBLL: number
  weakAreasCount?: number
  weeklyStudyTimeHours?: number
  weeklyRulesDone?: number
  weeklySessions?: number
  weeklyWeakAreas?: number
  spacedReviewsDue?: number
  streak?: number
  bestStreak?: number
}

export type TrendPoint = {
  date: string
  bll: number
}

export type ChartPoint = {
  date: string
  score: number
}

export type BLLSubjectStat = {
  name: string
  accuracy: number
  completed: number
  total: number
}

export type WeakArea = {
  id?: string
  ruleId?: string
  subject: string
  topic?: string
  subtopic?: string
  rule?: string
  title?: string
  ruleText?: string
  promptQuestion?: string
  applicationExample?: string
  howToApply?: unknown[]
  commonTraps?: unknown[]
  examTip?: string
  commonTrap?: string
  accuracy?: number
  attempts?: number
  priority?: number
  mastery?: number
  trend?: "up" | "down" | string
  needsPractice?: boolean
}

export type SubscriptionTier =
  | "free"
  | "bll-monthly"
  | "premium"
  | string

export type ProfileData = {
  subscription_tier?: SubscriptionTier
  billing_status?: string
}

export type TabKey =
  | "overview"
  | "learning"
  | "rules"
  | "time"
  | "strengths"
  | "history"

export type AnalyticsTab = {
  key: TabKey
  label: string
}

export type SubjectDiagnostic = {
  name: string
  accuracy: number
  completed: number
  total: number
}

export type RiskBuckets = {
  safe: SubjectDiagnostic[]
  maintenance: SubjectDiagnostic[]
  high: SubjectDiagnostic[]
  critical: SubjectDiagnostic[]
}

export type AnalyticsAccess = {
  hasActivePaidAccess: boolean
  isPremium: boolean
  isBLL: boolean
  canUseBLLAnalytics: boolean
  canUsePremiumAnalytics: boolean
  tierLabel: string
}

export type DateRangeValue =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "custom"
  | string

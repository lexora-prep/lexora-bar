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

export type StrengthSubjectAnalytics = {
  subjectId: string | null
  name: string
  attempts: number
  correctAttempts: number
  accuracy: number
  attemptedRules: number
  confidence: "early" | "confirmed"
}

export type WeakRuleAnalytics = {
  ruleId: string
  title: string
  subjectId: string | null
  subjectName: string
  topicName: string
  subtopicName: string
  attempts: number
  correctAttempts: number
  incorrectAttempts: number
  accuracy: number
  averageScore: number
  latestScore: number
  previousAccuracy: number | null
  accuracyChange: number | null
  trend: "new" | "improving" | "declining" | "stable"
  scoreDeficit: number
  impactPercentage: number
  missSharePercentage: number
  priorityScore: number
  priorityRank: number
  priority: "critical" | "high" | "moderate"
  needsPractice: boolean
  mastery: number
  missedBuzzwords: Array<{
    text: string
    count: number
  }>
  recommendation: string
  lastAttemptAt: string | null
  confidence: "early" | "confirmed"
}

export type StrengthsWeaknessesAnalyticsData = {
  range: {
    key: string
    label: string
    start: string
    end: string
  }
  thresholds: {
    correctScore: number
    minimumSubjectAttempts: number
    minimumRuleAttempts: number
    confirmedSubjectAttempts: number
    confirmedRuleAttempts: number
    strongSubjectAccuracy: number
    weakSubjectAccuracy: number
    weakRuleAccuracy: number
    criticalPriorityAccuracy: number
    highPriorityAccuracy: number
    moderatePriorityAccuracy: number
  }
  summary: {
    strongSubjectCount: number
    weakSubjectCount: number
    highPriorityRuleCount: number
    totalScoredAttempts: number
    totalIncorrectAttempts: number
  }
  strengths: StrengthSubjectAnalytics[]
  weakSubjects: StrengthSubjectAnalytics[]
  weaknesses: WeakRuleAnalytics[]
  weaknessImpact: {
    displayedWeakMisses: number
    totalIncorrectAttempts: number
    displayedWeakDeficit: number
    totalScoreDeficit: number
    shareOfRecordedMisses: number | null
    topThreeShareOfRecordedMisses: number | null
  }
  priorityFocus: WeakRuleAnalytics[]
  whyTopicsMatter: Array<{
    key: string
    title: string
    text: string
  }>
  nextBestAction:
    | (WeakRuleAnalytics & {
        reason: string
      })
    | null
  coachingNote: {
    summary: string
    steps: string[]
  } | null
}

export type ProgressHistoryPoint = {
  key: string
  label: string
  shortLabel: string
  start: string
  end: string
  score: number | null
  attempts: number
}

export type ProgressMilestone = {
  key: string
  status: "completed" | "in_progress" | "locked"
  label: string
  detail: string
  date: string | null
}

export type SubjectProgressHistory = {
  subjectId: string | null
  subjectName: string
  periods: Array<{
    key: string
    label: string
    score: number | null
    attempts: number
  }>
  change: number | null
}

export type ReadinessTrendPoint = {
  date: string
  label: string
  score: number
  attempts: number
}

export type ProgressHistoryEvent = {
  id: string
  type:
    | "rule_improved"
    | "rule_completed"
    | "study_session"
    | "flashcards"
  title: string
  detail: string
  timestamp: string
  subjectName: string | null
  ruleId: string | null
  score: number | null
  previousScore: number | null
}

export type ProgressHistoryAnalyticsData = {
  range: {
    key: string
    label: string
    start: string
    end: string
  }
  summary: {
    currentReadiness: number | null
    previousReadiness: number | null
    change: number | null
    totalScoredAttempts: number
    attemptedRules: number
    totalAvailableRules: number
    completionPercentage: number | null
    masteredRules: number
    activeDayStreak: number
  }
  overallProgress: ProgressHistoryPoint[]
  milestones: ProgressMilestone[]
  subjectProgress: SubjectProgressHistory[]
  readinessTrend: {
    "7d": ReadinessTrendPoint[]
    "14d": ReadinessTrendPoint[]
    "30d": ReadinessTrendPoint[]
    all: ReadinessTrendPoint[]
  }
  recentHistory: ProgressHistoryEvent[]
  improvement: {
    status: "improving" | "stable" | "declining" | "insufficient"
    title: string
    message: string
    periodChange: number | null
    averageWeeklyChange: number | null
    activeDayStreak: number
    strongestImprovingSubject: string | null
    recommendedAction: string
    evidence: string[]
  }
}

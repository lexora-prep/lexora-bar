export type LearningMode = "typing" | "fillblank" | "buzzwords" | "ordering" | "flashcard"
export type TrainingContext = "study" | "quiz" | "timed" | "weak_focus"
export type LearningStatus = "UNTRAINED" | "STUDIED" | "CRITICAL" | "NEEDS_WORK" | "IMPROVING" | "STRONG" | "MASTERED"
export type ReviewUrgency = "NOT_SCHEDULED" | "NOT_DUE" | "DUE" | "OVERDUE"

export type AttemptEvidence = {
  score: number
  mode: LearningMode
  trainingContext?: TrainingContext
  recallSeconds?: number | null
  createdAt?: Date | string | null
  revealedAnswer?: boolean
  selfReported?: boolean
}

export type MasteryResult = {
  mastery: number
  rawPerformance: number
  confidence: number
  weightedScore: number
  recentScore: number
  correctRate: number
  consistency: number
  attemptCount: number
  effectiveEvidence: number
  successfulRecallCount: number
  distinctModes: number
  modeCoverage: number
  independentRecallCount: number
  studyExposureCount: number
}

export type StatusResult = {
  status: LearningStatus
  isWeak: boolean
  isMastered: boolean
  reason: string
}

export type ScheduleInput = {
  attempt: AttemptEvidence
  mastery: MasteryResult
  previousIntervalMinutes?: number | null
  now?: Date
}

export type ScheduleResult = {
  nextReviewAt: Date
  intervalMinutes: number
  intervalDays: number
  isLapse: boolean
  reason: string
}

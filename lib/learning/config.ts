import type { LearningMode, TrainingContext } from "./types"

export const LEARNING_ENGINE_VERSION = "1.0.0"
export const CORRECT_SCORE_THRESHOLD = 80
export const MAX_ATTEMPTS_FOR_MASTERY = 20

export const MODE_EVIDENCE_WEIGHTS: Record<LearningMode, number> = {
  typing: 1,
  fillblank: 0.85,
  ordering: 0.75,
  buzzwords: 0.65,
  flashcard: 0.35,
}

export const CONTEXT_EVIDENCE_WEIGHTS: Record<TrainingContext, number> = {
  study: 0.35,
  quiz: 1,
  timed: 1.05,
  weak_focus: 1,
}

export const STATUS_GATES = {
  strong: { minimumMastery: 75, minimumConfidence: 50, minimumSuccessfulRecalls: 2 },
  mastered: { minimumMastery: 85, minimumConfidence: 70, minimumSuccessfulRecalls: 3, minimumDistinctModes: 2 },
} as const

export const SCHEDULER_LIMITS = {
  minimumMinutes: 20,
  maximumMinutes: 45 * 24 * 60,
  visibleAnswerMaximumMinutes: 24 * 60,
  selfReportedMaximumMinutes: 3 * 24 * 60,
} as const

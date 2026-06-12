import type { LearningStatus, ReviewUrgency } from "./types"

export type AdaptiveReviewTier =
  | "OVERDUE_LAPSE"
  | "DUE_WEAK"
  | "DUE_REVIEW"
  | "FIRST_RECALL"
  | "NOT_DUE"

export type AdaptiveReviewInput = {
  covered: boolean
  assessed: boolean
  isWeak: boolean
  learningStatus: LearningStatus
  mastery: number
  confidence: number
  nextReviewAt?: Date | null
  lastStudiedAt?: Date | null
  failureStreak?: number
  lastScore?: number | null
  priorityWeight?: number
  now?: Date
}

export type AdaptiveReviewDecision = {
  tier: AdaptiveReviewTier
  urgency: ReviewUrgency
  availableNow: boolean
  priorityScore: number
  failureStreak: number
  dueAt: Date | null
  reason: string
}

const FIRST_RECALL_DELAY_MINUTES = 20
const OVERDUE_AFTER_HOURS = 24

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function countConsecutiveRecallFailures(
  scores: number[],
  correctThreshold = 80
) {
  let streak = 0

  for (const score of scores) {
    if (Number(score) >= correctThreshold) break
    streak += 1
  }

  return streak
}

export function getReviewUrgency(
  nextReviewAt: Date | null | undefined,
  now: Date = new Date()
): ReviewUrgency {
  if (!nextReviewAt) return "NOT_SCHEDULED"
  if (nextReviewAt.getTime() > now.getTime()) return "NOT_DUE"

  const overdueHours =
    (now.getTime() - nextReviewAt.getTime()) / (60 * 60 * 1000)

  return overdueHours >= OVERDUE_AFTER_HOURS ? "OVERDUE" : "DUE"
}

export function buildAdaptiveReviewDecision(
  input: AdaptiveReviewInput
): AdaptiveReviewDecision {
  const now = input.now ?? new Date()
  const failureStreak = Math.max(0, Math.round(input.failureStreak ?? 0))
  const mastery = clamp(Number(input.mastery) || 0)
  const confidence = clamp(Number(input.confidence) || 0)
  const priorityWeight = Math.max(0, Number(input.priorityWeight) || 0)
  const urgency = getReviewUrgency(input.nextReviewAt, now)
  const dueAt = input.nextReviewAt ?? null

  if (!input.covered) {
    return {
      tier: "NOT_DUE",
      urgency,
      availableNow: false,
      priorityScore: 0,
      failureStreak,
      dueAt,
      reason: "The rule has not been introduced in the current learning cycle yet.",
    }
  }

  if (!input.assessed) {
    const studiedAt = input.lastStudiedAt ?? null
    const delayElapsed = studiedAt
      ? now.getTime() - studiedAt.getTime() >=
        FIRST_RECALL_DELAY_MINUTES * 60 * 1000
      : true

    return {
      tier: delayElapsed ? "FIRST_RECALL" : "NOT_DUE",
      urgency: "NOT_SCHEDULED",
      availableNow: delayElapsed,
      priorityScore: delayElapsed
        ? Math.round(250 + priorityWeight * 10)
        : 0,
      failureStreak,
      dueAt: studiedAt
        ? new Date(
            studiedAt.getTime() + FIRST_RECALL_DELAY_MINUTES * 60 * 1000
          )
        : null,
      reason: delayElapsed
        ? "The rule was studied but has not yet been tested through independent recall."
        : "The first independent recall is intentionally delayed briefly after study.",
    }
  }

  const isDue = urgency === "DUE" || urgency === "OVERDUE"
  const missingSchedule = urgency === "NOT_SCHEDULED"
  const availableNow = isDue || (missingSchedule && input.isWeak)

  if (!availableNow) {
    return {
      tier: "NOT_DUE",
      urgency,
      availableNow: false,
      priorityScore: 0,
      failureStreak,
      dueAt,
      reason: "The rule is scheduled for a later review based on current retention.",
    }
  }

  const overdueHours = dueAt
    ? Math.max(0, (now.getTime() - dueAt.getTime()) / (60 * 60 * 1000))
    : 0
  const overdueBoost = Math.min(180, overdueHours * 2.5)
  const weaknessBoost = (100 - mastery) * 1.8
  const confidenceBoost = (100 - confidence) * 0.45
  const failureBoost = failureStreak * 42
  const lastScoreBoost =
    input.lastScore === null || input.lastScore === undefined
      ? 0
      : Math.max(0, 80 - Number(input.lastScore)) * 1.5

  if (input.isWeak && failureStreak >= 2) {
    return {
      tier: "OVERDUE_LAPSE",
      urgency,
      availableNow: true,
      priorityScore: Math.round(
        500 +
          overdueBoost +
          weaknessBoost +
          confidenceBoost +
          failureBoost +
          lastScoreBoost +
          priorityWeight * 10
      ),
      failureStreak,
      dueAt,
      reason: `This rule has ${failureStreak} consecutive independent-recall failures and needs relearning now.`,
    }
  }

  if (input.isWeak) {
    return {
      tier: "DUE_WEAK",
      urgency,
      availableNow: true,
      priorityScore: Math.round(
        400 +
          overdueBoost +
          weaknessBoost +
          confidenceBoost +
          failureBoost +
          lastScoreBoost +
          priorityWeight * 10
      ),
      failureStreak,
      dueAt,
      reason:
        input.learningStatus === "CRITICAL"
          ? "Current recall is critically weak and the scheduled review is due."
          : "The rule is weak and its scheduled review is due.",
    }
  }

  return {
    tier: "DUE_REVIEW",
    urgency,
    availableNow: true,
    priorityScore: Math.round(
      300 +
        overdueBoost +
        weaknessBoost * 0.5 +
        confidenceBoost +
        failureBoost +
        priorityWeight * 10
    ),
    failureStreak,
    dueAt,
    reason:
      input.learningStatus === "MASTERED" || input.learningStatus === "STRONG"
        ? "A spaced review is due to protect long-term retention."
        : "The next scheduled retrieval is due.",
  }
}

export function shouldEnterWeakFocus(params: {
  assessed: boolean
  isWeak: boolean
  failureStreak: number
  lastScore?: number | null
}) {
  if (!params.assessed) return false

  return (
    params.isWeak ||
    params.failureStreak >= 2 ||
    (params.lastScore !== null &&
      params.lastScore !== undefined &&
      Number(params.lastScore) < 80)
  )
}

import { CORRECT_SCORE_THRESHOLD, SCHEDULER_LIMITS } from "./config"
import { clamp, getEvidenceWeight } from "./evidence"
import { countConsecutiveRecallFailures } from "./review-queue"
import type { ScheduleInput, ScheduleResult } from "./types"

function baseMinutes(score: number) {
  if (score < 50) return 20
  if (score < 65) return 12 * 60
  if (score < 80) return 24 * 60
  if (score < 90) return 3 * 24 * 60
  if (score < 95) return 7 * 24 * 60
  return 12 * 24 * 60
}

export function scheduleNextReview(input: ScheduleInput): ScheduleResult {
  const now = input.now ? new Date(input.now) : new Date()
  const score = clamp(Number(input.attempt.score) || 0, 0, 100)
  const previous = Math.max(0, Number(input.previousIntervalMinutes ?? 0))
  const isIndependentRecall =
    input.attempt.trainingContext !== "study" &&
    !input.attempt.revealedAnswer &&
    !input.attempt.selfReported
  const failureStreak = isIndependentRecall
    ? countConsecutiveRecallFailures(
        input.recentIndependentScores?.length
          ? input.recentIndependentScores
          : [score],
        CORRECT_SCORE_THRESHOLD
      )
    : 0
  const isLapse = isIndependentRecall && score < CORRECT_SCORE_THRESHOLD
  let minutes = baseMinutes(score)

  if (!isLapse && isIndependentRecall && previous > 0) {
    const growth = score >= 95 ? 2.1 : score >= 90 ? 1.8 : 1.45
    minutes = Math.max(minutes, Math.round(previous * growth))
  }

  minutes = Math.round(
    minutes *
      Math.max(0.25, getEvidenceWeight(input.attempt)) *
      (0.75 + (input.mastery.mastery / 100) * 0.65) *
      (0.8 + (input.mastery.confidence / 100) * 0.4)
  )

  if (isIndependentRecall) {
    if (score < 50) {
      minutes = SCHEDULER_LIMITS.minimumMinutes
    } else if (failureStreak >= 3) {
      minutes = Math.min(minutes, 12 * 60)
    } else if (failureStreak >= 2) {
      minutes = Math.min(minutes, 24 * 60)
    } else if (score < CORRECT_SCORE_THRESHOLD) {
      minutes = Math.min(minutes, 2 * 24 * 60)
    }
  }

  if (input.attempt.trainingContext === "study") {
    minutes = Math.min(minutes, 24 * 60)
  }
  if (input.attempt.revealedAnswer) {
    minutes = Math.min(
      minutes,
      SCHEDULER_LIMITS.visibleAnswerMaximumMinutes
    )
  }
  if (input.attempt.selfReported) {
    minutes = Math.min(
      minutes,
      SCHEDULER_LIMITS.selfReportedMaximumMinutes
    )
  }

  minutes = Math.round(
    clamp(
      minutes,
      SCHEDULER_LIMITS.minimumMinutes,
      SCHEDULER_LIMITS.maximumMinutes
    )
  )

  const reason =
    failureStreak >= 3
      ? "Repeated recall failures keep this rule in intensive relearning."
      : failureStreak >= 2
        ? "A repeated lapse shortens the next interval so the rule returns sooner."
        : score < 50 && isIndependentRecall
          ? "Immediate relearning follows a major independent-recall failure."
          : input.attempt.trainingContext === "study"
            ? "Study exposure schedules a first independent recall within one day."
            : input.attempt.revealedAnswer
              ? "Visible-answer evidence receives a capped interval."
              : input.attempt.selfReported
                ? "Self-reported evidence receives a conservative interval."
                : isLapse
                  ? "Partial recall shortens the interval."
                  : "Successful recall expands the interval according to mastery and confidence."

  return {
    nextReviewAt: new Date(now.getTime() + minutes * 60000),
    intervalMinutes: minutes,
    intervalDays: Number((minutes / 1440).toFixed(2)),
    isLapse,
    failureStreak,
    reason,
  }
}

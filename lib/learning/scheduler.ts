import { CORRECT_SCORE_THRESHOLD, SCHEDULER_LIMITS } from "./config"
import { clamp, getEvidenceWeight } from "./evidence"
import type { ScheduleInput, ScheduleResult } from "./types"

function baseMinutes(score: number) {
  if (score < 50) return 20
  if (score < 65) return 1440
  if (score < 80) return 2880
  if (score < 90) return 5760
  if (score < 95) return 10080
  return 17280
}

export function scheduleNextReview(input: ScheduleInput): ScheduleResult {
  const now = input.now ? new Date(input.now) : new Date()
  const score = clamp(Number(input.attempt.score) || 0, 0, 100)
  const previous = Math.max(0, Number(input.previousIntervalMinutes ?? 0))
  const isLapse = score < CORRECT_SCORE_THRESHOLD
  let minutes = baseMinutes(score)

  if (!isLapse && previous > 0) {
    const growth = score >= 95 ? 2.1 : score >= 90 ? 1.8 : 1.45
    minutes = Math.max(minutes, Math.round(previous * growth))
  }

  minutes = Math.round(minutes * Math.max(0.25, getEvidenceWeight(input.attempt)) * (0.75 + input.mastery.mastery / 100 * 0.65) * (0.8 + input.mastery.confidence / 100 * 0.4))

  if (score < 50) minutes = SCHEDULER_LIMITS.minimumMinutes
  else if (score < CORRECT_SCORE_THRESHOLD) minutes = Math.min(minutes, 2880)
  if (input.attempt.revealedAnswer) minutes = Math.min(minutes, SCHEDULER_LIMITS.visibleAnswerMaximumMinutes)
  if (input.attempt.selfReported) minutes = Math.min(minutes, SCHEDULER_LIMITS.selfReportedMaximumMinutes)
  minutes = Math.round(clamp(minutes, SCHEDULER_LIMITS.minimumMinutes, SCHEDULER_LIMITS.maximumMinutes))

  const reason = score < 50 ? "Immediate relearning after a major recall failure." : input.attempt.revealedAnswer ? "Visible-answer evidence receives a capped interval." : input.attempt.selfReported ? "Self-reported evidence receives a conservative interval." : isLapse ? "Partial recall shortens the interval." : "Successful recall expands the interval according to mastery and confidence."

  return { nextReviewAt: new Date(now.getTime() + minutes * 60000), intervalMinutes: minutes, intervalDays: Number((minutes / 1440).toFixed(2)), isLapse, reason }
}

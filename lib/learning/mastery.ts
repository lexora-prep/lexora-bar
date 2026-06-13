import { CORRECT_SCORE_THRESHOLD, MAX_ATTEMPTS_FOR_MASTERY, MODE_EVIDENCE_WEIGHTS } from "./config"
import { clamp, getRecencyWeight, normalizeAttempt } from "./evidence"
import type { AttemptEvidence, MasteryResult } from "./types"

type Normalized = ReturnType<typeof normalizeAttempt>

function weightedAverage(attempts: Normalized[], now: Date) {
  let weightedTotal = 0
  let totalWeight = 0
  attempts.forEach((attempt, index) => {
    const weight = attempt.evidenceWeight * getRecencyWeight(attempt.createdAt, index, now)
    weightedTotal += attempt.score * weight
    totalWeight += weight
  })
  return totalWeight > 0 ? weightedTotal / totalWeight : 0
}

function consistency(attempts: Normalized[]) {
  if (attempts.length <= 1) return 50
  const mean = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
  const variance = attempts.reduce((sum, a) => sum + Math.pow(a.score - mean, 2), 0) / attempts.length
  return clamp(100 - Math.sqrt(variance) * 1.6, 0, 100)
}

export function calculateMastery(input: AttemptEvidence[], now = new Date()): MasteryResult {
  const attempts = input
    .map(normalizeAttempt)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, MAX_ATTEMPTS_FOR_MASTERY)

  if (!attempts.length) {
    return {
      mastery: 0,
      rawPerformance: 0,
      confidence: 0,
      weightedScore: 0,
      recentScore: 0,
      correctRate: 0,
      consistency: 0,
      attemptCount: 0,
      effectiveEvidence: 0,
      successfulRecallCount: 0,
      distinctModes: 0,
      modeCoverage: 0,
      independentRecallCount: 0,
      studyExposureCount: 0,
    }
  }

  const independentRecall = attempts.filter(
    (attempt) =>
      attempt.trainingContext !== "study" &&
      !attempt.revealedAnswer &&
      !attempt.selfReported
  )
  const studyExposureCount = attempts.length - independentRecall.length

  if (independentRecall.length === 0) {
    return {
      mastery: 0,
      rawPerformance: 0,
      confidence: 0,
      weightedScore: 0,
      recentScore: 0,
      correctRate: 0,
      consistency: 0,
      attemptCount: attempts.length,
      effectiveEvidence: 0,
      successfulRecallCount: 0,
      distinctModes: 0,
      modeCoverage: 0,
      independentRecallCount: 0,
      studyExposureCount,
    }
  }

  const weightedScore = weightedAverage(independentRecall, now)
  const recentScore = weightedAverage(independentRecall.slice(0, 3), now)
  const successful = independentRecall.filter(
    (attempt) =>
      attempt.score >= CORRECT_SCORE_THRESHOLD && attempt.evidenceWeight >= 0.5
  )
  const correctRate = (successful.length / independentRecall.length) * 100
  const consistencyScore = consistency(independentRecall)
  const effectiveEvidence = independentRecall.reduce(
    (sum, attempt) => sum + attempt.evidenceWeight,
    0
  )
  const modes = new Set(independentRecall.map((attempt) => attempt.mode))
  const coveredWeight = [...modes].reduce(
    (sum, mode) => sum + MODE_EVIDENCE_WEIGHTS[mode],
    0
  )
  const possibleWeight = Object.values(MODE_EVIDENCE_WEIGHTS).reduce(
    (sum, value) => sum + value,
    0
  )
  const modeCoverage = (coveredWeight / possibleWeight) * 100
  const confidence = clamp(
    (clamp(effectiveEvidence / 5, 0, 1) * 0.75 + modeCoverage / 100 * 0.25) * 100,
    0,
    100
  )
  const rawPerformance =
    weightedScore * 0.55 +
    recentScore * 0.2 +
    correctRate * 0.15 +
    consistencyScore * 0.1
  const mastery = rawPerformance * (0.55 + (confidence / 100) * 0.45)

  return {
    mastery: Math.round(clamp(mastery, 0, 100)),
    rawPerformance: Math.round(clamp(rawPerformance, 0, 100)),
    confidence: Math.round(confidence),
    weightedScore: Math.round(weightedScore),
    recentScore: Math.round(recentScore),
    correctRate: Math.round(correctRate),
    consistency: Math.round(consistencyScore),
    attemptCount: attempts.length,
    effectiveEvidence: Number(effectiveEvidence.toFixed(2)),
    successfulRecallCount: successful.length,
    distinctModes: modes.size,
    modeCoverage: Math.round(modeCoverage),
    independentRecallCount: independentRecall.length,
    studyExposureCount,
  }
}

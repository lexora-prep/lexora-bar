import type { LearningStatus } from "./types"

export type LearningProgressRow = {
  attempts?: number | null
  correct_count?: number | null
  incorrect_count?: number | null
  needs_practice?: boolean | null
  mastery_level?: number | null
  rolling_average?: unknown
  mastery_confidence?: number | null
  learning_status?: string | null
  effective_evidence?: unknown
  successful_recall_count?: number | null
  distinct_modes?: number | null
  engine_version?: string | null
}

export type ResolvedLearningProgress = {
  attempts: number
  accuracy: number
  mastery: number
  confidence: number
  status: LearningStatus
  isWeak: boolean
  isStrong: boolean
  isMastered: boolean
  usesLearningEngine: boolean
}

const VALID_STATUSES = new Set<LearningStatus>([
  "UNTRAINED",
  "CRITICAL",
  "NEEDS_WORK",
  "IMPROVING",
  "STRONG",
  "MASTERED",
])

export const LEARNING_PROGRESS_SELECT = {
  attempts: true,
  correct_count: true,
  incorrect_count: true,
  needs_practice: true,
  mastery_level: true,
  rolling_average: true,
  mastery_confidence: true,
  learning_status: true,
  effective_evidence: true,
  successful_recall_count: true,
  distinct_modes: true,
  engine_version: true,
} as const

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeStatus(value: unknown): LearningStatus | null {
  const clean = String(value ?? "").trim().toUpperCase() as LearningStatus
  return VALID_STATUSES.has(clean) ? clean : null
}

function legacyStatus(params: {
  attempts: number
  mastery: number
  needsPractice: boolean
}): LearningStatus {
  const { attempts, mastery, needsPractice } = params

  if (attempts <= 0) return "UNTRAINED"
  if (needsPractice && mastery < 35) return "CRITICAL"
  if (needsPractice || mastery < 60) return mastery < 35 ? "CRITICAL" : "NEEDS_WORK"
  if (mastery < 75) return "IMPROVING"
  if (attempts >= 3 && mastery >= 85) return "MASTERED"
  return "STRONG"
}

export function resolveLearningProgress(
  row: LearningProgressRow
): ResolvedLearningProgress {
  const attempts = Math.max(0, Math.round(numberValue(row.attempts)))
  const correct = Math.max(0, numberValue(row.correct_count))
  const accuracy = attempts > 0 ? clamp(Math.round((correct / attempts) * 100)) : 0
  const storedMastery = clamp(numberValue(row.mastery_level))
  const rollingAverageValue = Number(row.rolling_average)
  const rollingAverage = Number.isFinite(rollingAverageValue)
    ? clamp(rollingAverageValue)
    : null
  const confidence = clamp(numberValue(row.mastery_confidence))
  const effectiveEvidence = Math.max(0, numberValue(row.effective_evidence))
  const successfulRecalls = Math.max(0, numberValue(row.successful_recall_count))
  const distinctModes = Math.max(0, numberValue(row.distinct_modes))
  const storedStatus = normalizeStatus(row.learning_status)

  const usesLearningEngine = Boolean(
    String(row.engine_version ?? "").trim() ||
      storedMastery > 5 ||
      (storedStatus && storedStatus !== "UNTRAINED") ||
      confidence > 0 ||
      effectiveEvidence > 0 ||
      successfulRecalls > 0 ||
      distinctModes > 0
  )

  const legacyMastery =
    storedMastery > 5
      ? storedMastery
      : rollingAverage !== null
        ? rollingAverage
        : accuracy

  const mastery = Math.round(
    clamp(usesLearningEngine ? storedMastery : legacyMastery)
  )

  const status = usesLearningEngine
    ? storedStatus && storedStatus !== "UNTRAINED"
      ? storedStatus
      : legacyStatus({
          attempts,
          mastery,
          needsPractice: Boolean(row.needs_practice),
        })
    : legacyStatus({
        attempts,
        mastery,
        needsPractice: Boolean(row.needs_practice),
      })

  const isWeak = status === "CRITICAL" || status === "NEEDS_WORK"
  const isMastered = status === "MASTERED"
  const isStrong = status === "STRONG" || isMastered

  return {
    attempts,
    accuracy,
    mastery,
    confidence: usesLearningEngine ? Math.round(confidence) : 0,
    status,
    isWeak,
    isStrong,
    isMastered,
    usesLearningEngine,
  }
}

export function calculateLearningReadiness(rows: LearningProgressRow[]) {
  const trained = rows
    .map(resolveLearningProgress)
    .filter((row) => row.attempts > 0 && row.status !== "UNTRAINED")

  if (trained.length === 0) return 0

  return Math.round(
    trained.reduce((sum, row) => sum + row.mastery, 0) / trained.length
  )
}

export function countWeakLearningRows(rows: LearningProgressRow[]) {
  return rows.filter((row) => resolveLearningProgress(row).isWeak).length
}

export function learningPriority(params: {
  progress: ResolvedLearningProgress
  updatedAt?: Date | null
}) {
  const { progress, updatedAt } = params
  const daysAgo = updatedAt
    ? Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 86_400_000))
    : 30
  const recency = Math.max(0, 30 - daysAgo)
  const confidenceGap = progress.usesLearningEngine
    ? 100 - progress.confidence
    : 50

  return Math.round(
    (100 - progress.mastery) * 0.65 +
      confidenceGap * 0.15 +
      Math.min(progress.attempts, 20) * 0.5 +
      recency * 0.2
  )
}

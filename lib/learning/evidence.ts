import { CONTEXT_EVIDENCE_WEIGHTS, MODE_EVIDENCE_WEIGHTS } from "./config"
import type { AttemptEvidence, LearningMode, TrainingContext } from "./types"

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeMode(value: unknown): LearningMode {
  const mode = String(value ?? "").trim().toLowerCase()
  if (mode === "fill_blank" || mode === "fill-blank") return "fillblank"
  if (mode === "buzzword") return "buzzwords"
  if (mode === "reorder") return "ordering"
  if (mode === "flashcards") return "flashcard"
  if (["typing", "fillblank", "buzzwords", "ordering", "flashcard"].includes(mode)) return mode as LearningMode
  return "typing"
}

export function normalizeTrainingContext(value: unknown): TrainingContext {
  const context = String(value ?? "").trim().toLowerCase()
  if (context === "weak-focus" || context === "weak") return "weak_focus"
  if (["study", "quiz", "timed", "weak_focus"].includes(context)) return context as TrainingContext
  return "quiz"
}

export function parseAttemptDate(value: Date | string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getEvidenceWeight(attempt: AttemptEvidence) {
  const mode = normalizeMode(attempt.mode)
  const context = normalizeTrainingContext(attempt.trainingContext)
  let weight = MODE_EVIDENCE_WEIGHTS[mode] * CONTEXT_EVIDENCE_WEIGHTS[context]
  if (attempt.revealedAnswer) weight = Math.min(weight, 0.25)
  if (attempt.selfReported) weight *= 0.75
  return Number(clamp(weight, 0.05, 1.1).toFixed(4))
}

export function normalizeAttempt(attempt: AttemptEvidence) {
  return {
    score: clamp(Number(attempt.score) || 0, 0, 100),
    mode: normalizeMode(attempt.mode),
    trainingContext: normalizeTrainingContext(attempt.trainingContext),
    recallSeconds: typeof attempt.recallSeconds === "number" && Number.isFinite(attempt.recallSeconds) && attempt.recallSeconds >= 0 ? attempt.recallSeconds : null,
    createdAt: parseAttemptDate(attempt.createdAt),
    revealedAnswer: Boolean(attempt.revealedAnswer),
    selfReported: Boolean(attempt.selfReported),
    evidenceWeight: getEvidenceWeight(attempt),
  }
}

export function getRecencyWeight(createdAt: Date | null, position: number, now: Date) {
  if (createdAt) {
    const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400000)
    return Math.max(0.25, Math.pow(0.5, ageDays / 21))
  }
  return Math.max(0.35, 1 - position * 0.05)
}

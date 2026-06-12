"use server"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  LEARNING_ENGINE_VERSION,
  calculateMastery,
  classifyLearningStatus,
  normalizeMode,
  normalizeTrainingContext,
  scheduleNextReview,
  recordLearningCycleProgress,
  type AttemptEvidence,
} from "@/lib/learning"
import { createClient as createServerClient } from "@/utils/supabase/server"

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clampScore(value: unknown) {
  const parsed = toFiniteNumber(value)
  if (parsed === null) return null
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function normalizeLoose(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stemLoose(word: string) {
  const clean = normalizeLoose(word)
  if (clean.length <= 3) return clean

  return clean
    .replace(/ies$/, "y")
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/es$/, "")
    .replace(/s$/, "")
}

const KEYWORD_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "when",
  "while",
  "unless",
  "to",
  "of",
  "in",
  "on",
  "for",
  "from",
  "with",
  "without",
  "by",
  "as",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "may",
  "must",
  "shall",
  "can",
  "could",
  "would",
  "should",
  "will",
  "only",
  "also",
  "generally",
  "usually",
  "typically",
  "under",
  "that",
  "this",
  "these",
  "those",
])

function meaningfulKeywordTokens(value: string) {
  return normalizeLoose(value)
    .split(/\s+/)
    .map(stemLoose)
    .filter((word) => word.length > 2 && !KEYWORD_STOPWORDS.has(word))
}

function flexibleKeywordMatch(answer: string, keyword: string) {
  const normalizedAnswer = normalizeLoose(answer)
  const normalizedKeyword = normalizeLoose(keyword)

  if (!normalizedAnswer || !normalizedKeyword) return false
  if (normalizedAnswer.includes(normalizedKeyword)) return true

  const answerTokens = new Set(
    normalizedAnswer
      .split(/\s+/)
      .map(stemLoose)
      .filter(Boolean)
  )

  const keywordTokens = meaningfulKeywordTokens(keyword)
  if (keywordTokens.length === 0) return false

  return keywordTokens.every((token) => answerTokens.has(token))
}

function buildAttemptEvidence(row: {
  score: number
  training_mode: string | null
  training_context: string | null
  recall_seconds: number | null
  revealed_answer: boolean
  self_reported: boolean
  created_at: Date | null
}): AttemptEvidence {
  return {
    score: row.score,
    mode: normalizeMode(row.training_mode),
    trainingContext: normalizeTrainingContext(row.training_context),
    recallSeconds: row.recall_seconds,
    createdAt: row.created_at,
    revealedAnswer: row.revealed_answer,
    selfReported: row.self_reported,
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", score: 0, missedBuzzwords: [] },
        { status: 401 }
      )
    }

    const body = await req.json()
    const requestedUserId = String(body.userId ?? "").trim()

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { error: "User mismatch", score: 0, missedBuzzwords: [] },
        { status: 403 }
      )
    }

    const ruleId = String(body.ruleId ?? "").trim()
    const answerText = String(body.userAnswer ?? "")
    const exerciseMode = normalizeMode(body.mode ?? body.exerciseMode)
    const trainingContext = normalizeTrainingContext(body.trainingMode)
    const recallSeconds = Math.max(
      0,
      Math.min(60 * 60, Math.round(toFiniteNumber(body.recallSeconds) ?? 0))
    )
    const revealedAnswer = Boolean(body.revealedAnswer)
    const selfReported = Boolean(body.selfReported)
    const effectiveRevealedAnswer = revealedAnswer || trainingContext === "study"

    if (!ruleId) {
      return NextResponse.json(
        { error: "Missing ruleId", score: 0, missedBuzzwords: [] },
        { status: 400 }
      )
    }

    const rule = await prisma.rules.findUnique({
      where: { id: ruleId },
      select: {
        id: true,
        buzzwords: true,
        rule_text: true,
        is_active: true,
      },
    })

    if (!rule || !rule.is_active) {
      return NextResponse.json(
        { error: "Rule not found", score: 0, missedBuzzwords: [] },
        { status: 404 }
      )
    }

    const buzzwords = toStringArray(rule.buzzwords)
    const normalizedAnswer = normalizeLoose(answerText)
    const normalizedRuleText = normalizeLoose(String(rule.rule_text ?? ""))

    const fullRuleMatched =
      Boolean(normalizedAnswer && normalizedRuleText) &&
      (normalizedAnswer.includes(normalizedRuleText) ||
        (normalizedRuleText.includes(normalizedAnswer) &&
          normalizedAnswer.length >= normalizedRuleText.length * 0.92))

    const computedMatched = fullRuleMatched
      ? buzzwords
      : buzzwords.filter((keyword) =>
          flexibleKeywordMatch(answerText, keyword)
        )

    const computedMissed = fullRuleMatched
      ? []
      : buzzwords.filter(
          (keyword) => !flexibleKeywordMatch(answerText, keyword)
        )

    const computedScore =
      buzzwords.length === 0
        ? 0
        : fullRuleMatched
          ? 100
          : Math.round((computedMatched.length / buzzwords.length) * 100)

    const matchedOverride = toStringArray(body.matchedKeywordsOverride)
    const missedOverride = toStringArray(body.missedKeywordsOverride)
    const overrideWasProvided = Array.isArray(body.missedKeywordsOverride)

    const matchedKeywords =
      matchedOverride.length > 0 ? matchedOverride : computedMatched

    const missedKeywords = overrideWasProvided
      ? missedOverride
      : computedMissed

    const score = clampScore(body.scoreOverride) ?? computedScore
    const keywordScore = clampScore(body.keywordScoreOverride) ?? score
    const similarity =
      clampScore(body.similarityOverride) ??
      Math.min(100, Math.round(score * 0.55))

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      await tx.user_rule_attempts.create({
        data: {
          user_id: user.id,
          rule_id: ruleId,
          score,
          training_mode: exerciseMode,
          training_context: trainingContext,
          recall_seconds: recallSeconds,
          revealed_answer: effectiveRevealedAnswer,
          self_reported: selfReported,
          engine_version: LEARNING_ENGINE_VERSION,
          missed_buzzwords: missedKeywords,
        },
      })

      const historyRows = await tx.user_rule_attempts.findMany({
        where: {
          user_id: user.id,
          rule_id: ruleId,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 20,
        select: {
          score: true,
          training_mode: true,
          training_context: true,
          recall_seconds: true,
          revealed_answer: true,
          self_reported: true,
          created_at: true,
        },
      })

      const mastery = calculateMastery(
        historyRows.map(buildAttemptEvidence),
        now
      )
      const status = classifyLearningStatus(mastery)

      const existingProgress = await tx.user_rule_progress.findUnique({
        where: {
          user_id_rule_id: {
            user_id: user.id,
            rule_id: ruleId,
          },
        },
        select: {
          interval_minutes: true,
          interval_days: true,
        },
      })

      const previousIntervalMinutes =
        existingProgress?.interval_minutes !== null &&
        existingProgress?.interval_minutes !== undefined
          ? Math.max(0, Number(existingProgress.interval_minutes))
          : Math.max(0, Number(existingProgress?.interval_days ?? 0)) * 1440

      const schedule = scheduleNextReview({
        attempt: {
          score,
          mode: exerciseMode,
          trainingContext,
          recallSeconds,
          createdAt: now,
          revealedAnswer: effectiveRevealedAnswer,
          selfReported,
        },
        mastery,
        previousIntervalMinutes,
        now,
      })

      const countsForPerformance =
        trainingContext !== "study" &&
        !effectiveRevealedAnswer &&
        !selfReported
      const isCorrect = countsForPerformance && score >= 80
      const isIncorrect = countsForPerformance && score < 80
      const legacyIntervalDays = Math.max(
        1,
        Math.ceil(schedule.intervalMinutes / 1440)
      )

      await tx.user_rule_progress.upsert({
        where: {
          user_id_rule_id: {
            user_id: user.id,
            rule_id: ruleId,
          },
        },
        update: {
          attempts: countsForPerformance ? { increment: 1 } : undefined,
          correct_count: isCorrect ? { increment: 1 } : undefined,
          incorrect_count: isIncorrect ? { increment: 1 } : undefined,
          last_score: countsForPerformance ? score : undefined,
          rolling_average: mastery.weightedScore,
          mastery_level: mastery.mastery,
          needs_practice: status.isWeak,
          last_reviewed: now,
          next_review_at: schedule.nextReviewAt,
          interval_minutes: schedule.intervalMinutes,
          interval_days: legacyIntervalDays,
          mastery_confidence: mastery.confidence,
          learning_status: status.status,
          effective_evidence: mastery.effectiveEvidence,
          successful_recall_count: mastery.successfulRecallCount,
          distinct_modes: mastery.distinctModes,
          engine_version: LEARNING_ENGINE_VERSION,
          updated_at: now,
        },
        create: {
          user_id: user.id,
          rule_id: ruleId,
          attempts: countsForPerformance ? 1 : 0,
          correct_count: isCorrect ? 1 : 0,
          incorrect_count: isIncorrect ? 1 : 0,
          last_score: countsForPerformance ? score : null,
          rolling_average: mastery.weightedScore,
          mastery_level: mastery.mastery,
          needs_practice: status.isWeak,
          last_reviewed: now,
          next_review_at: schedule.nextReviewAt,
          interval_minutes: schedule.intervalMinutes,
          interval_days: legacyIntervalDays,
          mastery_confidence: mastery.confidence,
          learning_status: status.status,
          effective_evidence: mastery.effectiveEvidence,
          successful_recall_count: mastery.successfulRecallCount,
          distinct_modes: mastery.distinctModes,
          engine_version: LEARNING_ENGINE_VERSION,
          updated_at: now,
        },
      })

      await recordLearningCycleProgress({
        client: tx,
        userId: user.id,
        ruleId,
        trainingContext,
        score,
        revealedAnswer: effectiveRevealedAnswer,
        selfReported,
        now,
      })

      return {
        mastery,
        status,
        schedule,
      }
    })

    return NextResponse.json({
      score,
      masteryScore: result.mastery.mastery,
      masteryLevel: result.status.status,
      learningStatus: result.status.status,
      masteryConfidence: result.mastery.confidence,
      rawPerformance: result.mastery.rawPerformance,
      effectiveEvidence: result.mastery.effectiveEvidence,
      successfulRecallCount: result.mastery.successfulRecallCount,
      distinctModes: result.mastery.distinctModes,
      independentRecallCount: result.mastery.independentRecallCount,
      studyExposureCount: result.mastery.studyExposureCount,
      matched_keywords: matchedKeywords,
      missed_keywords: missedKeywords,
      keywordScore,
      similarity,
      missedBuzzwords: missedKeywords,
      exerciseMode,
      trainingContext,
      revealedAnswer: effectiveRevealedAnswer,
      nextReviewAt: result.schedule.nextReviewAt.toISOString(),
      intervalMinutes: result.schedule.intervalMinutes,
      intervalDays: result.schedule.intervalDays,
      isLapse: result.schedule.isLapse,
      countsForPerformance:
        trainingContext !== "study" && !effectiveRevealedAnswer && !selfReported,
      engineVersion: LEARNING_ENGINE_VERSION,
    })
  } catch (error) {
    console.error("SUBMIT ATTEMPT ERROR:", error)

    return NextResponse.json(
      {
        error: "Failed to submit attempt",
        score: 0,
        missedBuzzwords: [],
      },
      { status: 500 }
    )
  }
}

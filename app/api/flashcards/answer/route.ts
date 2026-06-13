"use server"

import { NextResponse } from "next/server"
import { requireBLL } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import {
  CORRECT_SCORE_THRESHOLD,
  LEARNING_ENGINE_VERSION,
  calculateMastery,
  classifyLearningStatus,
  normalizeMode,
  normalizeTrainingContext,
  scheduleNextReview,
  recordLearningCycleProgress,
  type AttemptEvidence,
  type TrainingContext,
} from "@/lib/learning"

type CardResult = "knew" | "missed"

function isCardResult(value: unknown): value is CardResult {
  return value === "knew" || value === "missed"
}

function toRecallSeconds(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.min(86_400, Math.round(parsed))
}

function getTrainingContext(timed: boolean): TrainingContext {
  return timed ? "timed" : "study"
}

export async function POST(req: Request) {
  try {
    const access = await requireBLL("Flashcards")
    if (!access.ok) return access.response

    const body = await req.json()
    const authenticatedUserId = access.userId

    const {
      userId: requestedUserId,
      ruleId,
      customRuleId,
      result,
      sessionId,
      recallSeconds,
    } = body ?? {}

    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return NextResponse.json(
        { success: false, error: "User mismatch" },
        { status: 403 }
      )
    }

    if (!sessionId || (!ruleId && !customRuleId) || !isCardResult(result)) {
      return NextResponse.json(
        { success: false, error: "Invalid flashcard answer request" },
        { status: 400 }
      )
    }

    const session = await prisma.flashcard_sessions.findFirst({
      where: {
        id: sessionId,
        user_id: authenticatedUserId,
      },
      select: {
        id: true,
        timed: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Flashcard session not found" },
        { status: 404 }
      )
    }

    const sessionCard = await prisma.flashcard_session_cards.findFirst({
      where: {
        session_id: session.id,
        ...(ruleId ? { rule_id: ruleId } : { custom_rule_id: customRuleId }),
      },
      select: {
        id: true,
        result: true,
        attempt_id: true,
      },
    })

    if (!sessionCard) {
      return NextResponse.json(
        { success: false, error: "Card does not belong to this session" },
        { status: 404 }
      )
    }

    const now = new Date()
    const seconds = toRecallSeconds(recallSeconds)
    const success = result === "knew"

    if (ruleId) {
      const score = success ? 100 : 0
      const trainingContext = getTrainingContext(session.timed)

      const outcome = await prisma.$transaction(async (tx) => {
        let attemptId = sessionCard.attempt_id

        if (attemptId) {
          const existingAttempt = await tx.user_rule_attempts.findFirst({
            where: {
              id: attemptId,
              user_id: authenticatedUserId,
              rule_id: ruleId,
            },
            select: { id: true },
          })

          if (existingAttempt) {
            await tx.user_rule_attempts.update({
              where: { id: existingAttempt.id },
              data: {
                score,
                training_mode: "flashcard",
                training_context: trainingContext,
                recall_seconds: seconds,
                revealed_answer: true,
                self_reported: true,
                engine_version: LEARNING_ENGINE_VERSION,
                created_at: now,
              },
            })
          } else {
            attemptId = null
          }
        }

        if (!attemptId) {
          const attempt = await tx.user_rule_attempts.create({
            data: {
              user_id: authenticatedUserId,
              rule_id: ruleId,
              score,
              training_mode: "flashcard",
              training_context: trainingContext,
              recall_seconds: seconds,
              revealed_answer: true,
              self_reported: true,
              engine_version: LEARNING_ENGINE_VERSION,
              created_at: now,
            },
            select: { id: true },
          })
          attemptId = attempt.id
        }

        await tx.flashcard_session_cards.update({
          where: { id: sessionCard.id },
          data: {
            result,
            time_spent: seconds,
            attempt_id: attemptId,
          },
        })

        const recentAttempts = await tx.user_rule_attempts.findMany({
          where: {
            user_id: authenticatedUserId,
            rule_id: ruleId,
          },
          orderBy: { created_at: "desc" },
          take: 20,
          select: {
            score: true,
            training_mode: true,
            training_context: true,
            recall_seconds: true,
            created_at: true,
            revealed_answer: true,
            self_reported: true,
          },
        })

        const evidence: AttemptEvidence[] = recentAttempts.map((attempt) => ({
          score: attempt.score,
          mode: normalizeMode(attempt.training_mode),
          trainingContext: normalizeTrainingContext(attempt.training_context),
          recallSeconds: attempt.recall_seconds,
          createdAt: attempt.created_at,
          revealedAnswer: attempt.revealed_answer,
          selfReported: attempt.self_reported,
        }))

        const mastery = calculateMastery(evidence, now)
        const status = classifyLearningStatus(mastery)

        const existingProgress = await tx.user_rule_progress.findUnique({
          where: {
            user_id_rule_id: {
              user_id: authenticatedUserId,
              rule_id: ruleId,
            },
          },
        })

        const schedule = scheduleNextReview({
          attempt: {
            score,
            mode: "flashcard",
            trainingContext,
            recallSeconds: seconds,
            createdAt: now,
            revealedAnswer: true,
            selfReported: true,
          },
          mastery,
          previousIntervalMinutes: existingProgress?.interval_minutes ?? null,
          now,
        })

        const allAttempts = await tx.user_rule_attempts.findMany({
          where: {
            user_id: authenticatedUserId,
            rule_id: ruleId,
          },
          select: { score: true },
        })

        const attempts = allAttempts.length
        const correctCount = allAttempts.filter(
          (attempt) => attempt.score >= CORRECT_SCORE_THRESHOLD
        ).length
        const incorrectCount = attempts - correctCount
        const rollingAverage =
          attempts > 0
            ? Number(
                (
                  allAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
                  attempts
                ).toFixed(2)
              )
            : 0

        const progressData = {
          attempts,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          needs_practice: status.isWeak,
          mastery_level: mastery.mastery,
          last_reviewed: now,
          next_review_at: schedule.nextReviewAt,
          interval_minutes: schedule.intervalMinutes,
          interval_days: Math.max(1, Math.ceil(schedule.intervalMinutes / 1440)),
          last_score: score,
          rolling_average: rollingAverage,
          mastery_confidence: mastery.confidence,
          learning_status: status.status,
          effective_evidence: mastery.effectiveEvidence,
          successful_recall_count: mastery.successfulRecallCount,
          distinct_modes: mastery.distinctModes,
          engine_version: LEARNING_ENGINE_VERSION,
          updated_at: now,
        }

        const progress = existingProgress
          ? await tx.user_rule_progress.update({
              where: {
                user_id_rule_id: {
                  user_id: authenticatedUserId,
                  rule_id: ruleId,
                },
              },
              data: progressData,
            })
          : await tx.user_rule_progress.create({
              data: {
                user_id: authenticatedUserId,
                rule_id: ruleId,
                saved_for_review: false,
                created_at: now,
                ...progressData,
              },
            })

        await recordLearningCycleProgress({
          client: tx,
          userId: authenticatedUserId,
          ruleId,
          trainingContext,
          score,
          revealedAnswer: true,
          selfReported: true,
          now,
        })

        const remaining = await tx.flashcard_session_cards.count({
          where: {
            session_id: session.id,
            result: null,
          },
        })

        if (remaining === 0) {
          await tx.flashcard_sessions.update({
            where: { id: session.id },
            data: { completed_at: now },
          })
        }

        return { progress, mastery, status, schedule, attemptId }
      })

      return NextResponse.json({
        success: true,
        changedExistingAnswer: Boolean(sessionCard.attempt_id),
        ...outcome,
      })
    }

    const customOutcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.user_custom_rule_progress.findUnique({
        where: {
          user_id_custom_rule_id: {
            user_id: authenticatedUserId,
            custom_rule_id: customRuleId,
          },
        },
      })

      const previousResult = sessionCard.result
      const previousSuccess = previousResult === "knew" ? 1 : 0
      const previousFail = previousResult === "missed" ? 1 : 0
      const nextSuccess = success ? 1 : 0
      const nextFail = success ? 0 : 1

      const successCount = Math.max(
        0,
        Number(existing?.success_count ?? 0) - previousSuccess + nextSuccess
      )
      const failCount = Math.max(
        0,
        Number(existing?.fail_count ?? 0) - previousFail + nextFail
      )

      const nextReviewAt = success
        ? new Date(
            now.getTime() +
              Math.max(1, Math.round(successCount * 1.8)) * 86_400_000
          )
        : new Date(now.getTime() + 20 * 60 * 1000)

      const existingDifficulty = Number(existing?.difficulty_score ?? 0)
      const difficultyScore = success
        ? Math.max(0, Number((existingDifficulty - 0.05).toFixed(2)))
        : Number((existingDifficulty + 0.15).toFixed(2))

      const progress = existing
        ? await tx.user_custom_rule_progress.update({
            where: {
              user_id_custom_rule_id: {
                user_id: authenticatedUserId,
                custom_rule_id: customRuleId,
              },
            },
            data: {
              success_count: successCount,
              fail_count: failCount,
              last_seen_at: now,
              next_review_at: nextReviewAt,
              difficulty_score: difficultyScore,
              updated_at: now,
            },
          })
        : await tx.user_custom_rule_progress.create({
            data: {
              user_id: authenticatedUserId,
              custom_rule_id: customRuleId,
              success_count: successCount,
              fail_count: failCount,
              difficulty_score: success ? 0 : 0.3,
              last_seen_at: now,
              next_review_at: nextReviewAt,
              updated_at: now,
            },
          })

      await tx.flashcard_session_cards.update({
        where: { id: sessionCard.id },
        data: {
          result,
          time_spent: seconds,
        },
      })

      const remaining = await tx.flashcard_session_cards.count({
        where: {
          session_id: session.id,
          result: null,
        },
      })

      if (remaining === 0) {
        await tx.flashcard_sessions.update({
          where: { id: session.id },
          data: { completed_at: now },
        })
      }

      return progress
    })

    return NextResponse.json({
      success: true,
      changedExistingAnswer: sessionCard.result !== null,
      progress: customOutcome,
    })
  } catch (error) {
    console.error("FLASHCARD ANSWER ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save flashcard answer",
      },
      { status: 500 }
    )
  }
}

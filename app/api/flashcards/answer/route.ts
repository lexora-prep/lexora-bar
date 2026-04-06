import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const {
    userId,
    ruleId,
    customRuleId,
    result,
    sessionId
  } = body

  const success = result === "knew"
  const now = new Date()

  let progress = null

  if (ruleId) {
    const existing = await prisma.user_rule_progress.findUnique({
      where: {
        user_id_rule_id: {
          user_id: userId,
          rule_id: ruleId
        }
      }
    })

    if (existing) {
      const nextSuccess = success
        ? existing.correct_count + 1
        : existing.correct_count

      let nextReview: Date
      let nextIntervalDays: number

      if (success) {
        nextIntervalDays = Math.max(1, Math.round(nextSuccess * 1.8))
        nextReview = new Date(now.getTime() + nextIntervalDays * 86400000)
      } else {
        nextIntervalDays = 1
        nextReview = new Date(now.getTime() + 20 * 60 * 1000)
      }

      const nextAttempts = existing.attempts + 1
      const nextAverage = nextAttempts > 0
        ? Number(
            (
              ((existing.rolling_average ? Number(existing.rolling_average) : 0) * existing.attempts +
                (success ? 100 : 0)) /
              nextAttempts
            ).toFixed(2)
          )
        : success ? 100 : 0

      progress = await prisma.user_rule_progress.update({
        where: {
          user_id_rule_id: {
            user_id: userId,
            rule_id: ruleId
          }
        },
        data: {
          attempts: {
            increment: 1
          },
          correct_count: success ? { increment: 1 } : undefined,
          incorrect_count: !success ? { increment: 1 } : undefined,
          last_reviewed: now,
          next_review_at: nextReview,
          interval_days: nextIntervalDays,
          last_score: success ? 100 : 0,
          rolling_average: nextAverage,
          needs_practice: !success,
          mastery_level: success
            ? Math.min(5, existing.mastery_level + 1)
            : Math.max(0, existing.mastery_level - 1)
        }
      })
    } else {
      progress = await prisma.user_rule_progress.create({
        data: {
          user_id: userId,
          rule_id: ruleId,
          attempts: 1,
          correct_count: success ? 1 : 0,
          incorrect_count: success ? 0 : 1,
          saved_for_review: false,
          needs_practice: !success,
          mastery_level: success ? 1 : 0,
          last_reviewed: now,
          next_review_at: success
            ? new Date(now.getTime() + 86400000)
            : new Date(now.getTime() + 20 * 60 * 1000),
          interval_days: 1,
          last_score: success ? 100 : 0,
          rolling_average: success ? 100 : 0
        }
      })
    }
  } else if (customRuleId) {
    const existing = await prisma.user_custom_rule_progress.findUnique({
      where: {
        user_id_custom_rule_id: {
          user_id: userId,
          custom_rule_id: customRuleId
        }
      }
    })

    if (existing) {
      const nextSuccess = success
        ? existing.success_count + 1
        : existing.success_count

      let nextReview: Date

      if (success) {
        const days = Math.max(1, Math.round(nextSuccess * 1.8))
        nextReview = new Date(now.getTime() + days * 86400000)
      } else {
        nextReview = new Date(now.getTime() + 20 * 60 * 1000)
      }

      progress = await prisma.user_custom_rule_progress.update({
        where: {
          user_id_custom_rule_id: {
            user_id: userId,
            custom_rule_id: customRuleId
          }
        },
        data: {
          success_count: success ? { increment: 1 } : undefined,
          fail_count: !success ? { increment: 1 } : undefined,
          last_seen_at: now,
          next_review_at: nextReview,
          difficulty_score: success
            ? Math.max(0, Number((existing.difficulty_score - 0.05).toFixed(2)))
            : Number((existing.difficulty_score + 0.15).toFixed(2)),
          updated_at: now
        }
      })
    } else {
      progress = await prisma.user_custom_rule_progress.create({
        data: {
          user_id: userId,
          custom_rule_id: customRuleId,
          success_count: success ? 1 : 0,
          fail_count: success ? 0 : 1,
          difficulty_score: success ? 0 : 0.3,
          last_seen_at: now,
          next_review_at: success
            ? new Date(now.getTime() + 86400000)
            : new Date(now.getTime() + 20 * 60 * 1000),
          updated_at: now
        }
      })
    }
  }

  if (sessionId) {
    try {
      if (ruleId) {
        await prisma.flashcard_session_cards.updateMany({
          where: {
            session_id: sessionId,
            rule_id: ruleId
          },
          data: {
            result
          }
        })
      }

      if (customRuleId) {
        await prisma.flashcard_session_cards.updateMany({
          where: {
            session_id: sessionId,
            custom_rule_id: customRuleId
          },
          data: {
            result
          }
        })
      }
    } catch (err) {
      console.error("Failed to update flashcard session result", err)
    }
  }

  return NextResponse.json({
    success: true,
    progress
  })
}
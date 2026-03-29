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

  let progress

  if (ruleId) {

    progress = await prisma.userFlashcardProgress.upsert({

      where: {
        userId_ruleId: {
          userId,
          ruleId
        }
      },

      update: async (current) => {

        const nextSuccess = success
          ? current.successCount + 1
          : current.successCount

        let nextReview

        if (success) {

          const days = Math.max(1, Math.round(nextSuccess * 1.8))

          nextReview = new Date(now.getTime() + days * 86400000)

        } else {

          nextReview = new Date(now.getTime() + 20 * 60 * 1000)

        }

        return {
          successCount: success ? { increment: 1 } : undefined,
          failCount: !success ? { increment: 1 } : undefined,
          lastSeenAt: now,
          nextReviewAt: nextReview,
          difficultyScore: success
            ? { decrement: 0.05 }
            : { increment: 0.15 }
        }

      },

      create: {

        successCount: success ? 1 : 0,
        failCount: success ? 0 : 1,

        difficultyScore: success ? 0 : 0.3,

        lastSeenAt: now,

        nextReviewAt: success
          ? new Date(now.getTime() + 86400000)
          : new Date(now.getTime() + 20 * 60 * 1000),

        userId,
        ruleId

      }

    })

  } else if (customRuleId) {

    progress = await prisma.userFlashcardProgress.upsert({

      where: {
        userId_customRuleId: {
          userId,
          customRuleId
        }
      },

      update: async (current) => {

        const nextSuccess = success
          ? current.successCount + 1
          : current.successCount

        let nextReview

        if (success) {

          const days = Math.max(1, Math.round(nextSuccess * 1.8))

          nextReview = new Date(now.getTime() + days * 86400000)

        } else {

          nextReview = new Date(now.getTime() + 20 * 60 * 1000)

        }

        return {
          successCount: success ? { increment: 1 } : undefined,
          failCount: !success ? { increment: 1 } : undefined,
          lastSeenAt: now,
          nextReviewAt: nextReview,
          difficultyScore: success
            ? { decrement: 0.05 }
            : { increment: 0.15 }
        }

      },

      create: {

        successCount: success ? 1 : 0,
        failCount: success ? 0 : 1,

        difficultyScore: success ? 0 : 0.3,

        lastSeenAt: now,

        nextReviewAt: success
          ? new Date(now.getTime() + 86400000)
          : new Date(now.getTime() + 20 * 60 * 1000),

        userId,
        customRuleId

      }

    })

  }

  // --------------------------------
  // SAVE SESSION RESULT
  // --------------------------------

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
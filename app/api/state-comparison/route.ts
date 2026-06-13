import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  calculateLearningReadiness,
  LEARNING_PROGRESS_SELECT,
} from "@/lib/learning/analytics"

function toPercent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const auth = await requireAuthenticatedUser(req)
    if (!auth.ok) return auth.response

    const requestedState = searchParams.get("state")
    const userId = auth.userId

    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        jurisdiction: true,
      },
    })

    const jurisdiction =
      requestedState?.trim() || profile?.jurisdiction?.trim() || null

    const [userMbeTotal, userMbeCorrect, userRuleProgressAgg] =
      await Promise.all([
        prisma.user_mbe_attempts.count({
          where: { user_id: userId },
        }),
        prisma.user_mbe_attempts.count({
          where: {
            user_id: userId,
            is_correct: true,
          },
        }),
        prisma.user_rule_progress.findMany({
          where: { user_id: userId },
          select: {
            ...LEARNING_PROGRESS_SELECT,
          },
        }),
      ])

    const userMBE = toPercent(userMbeCorrect, userMbeTotal)

    const userBLL = calculateLearningReadiness(userRuleProgressAgg)

    let stateMBEAvg = 0
    let stateBLLAvg = 0
    let topMBE = 0
    let topBLL = 0
    let stateUsers = 0

    if (jurisdiction) {
      const stateProfiles = await prisma.profiles.findMany({
        where: {
          jurisdiction,
          id: { not: userId },
        },
        select: {
          id: true,
        },
      })

      const stateUserIds = stateProfiles.map((p) => p.id)
      stateUsers = stateUserIds.length

      if (stateUserIds.length > 0) {
        const [stateMbeAttempts, stateRuleProgress] = await Promise.all([
          prisma.user_mbe_attempts.findMany({
            where: {
              user_id: { in: stateUserIds },
            },
            select: {
              user_id: true,
              is_correct: true,
            },
          }),
          prisma.user_rule_progress.findMany({
            where: {
              user_id: { in: stateUserIds },
            },
            select: {
              user_id: true,
              ...LEARNING_PROGRESS_SELECT,
            },
          }),
        ])

        const stateMbeCorrect = stateMbeAttempts.reduce(
          (sum, attempt) => sum + (attempt.is_correct ? 1 : 0),
          0
        )
        const stateMbeTotal = stateMbeAttempts.length
        stateMBEAvg = toPercent(stateMbeCorrect, stateMbeTotal)

        stateBLLAvg = calculateLearningReadiness(stateRuleProgress)

        const mbeByUser: Record<string, { correct: number; total: number }> = {}
        for (const attempt of stateMbeAttempts) {
          if (!mbeByUser[attempt.user_id]) {
            mbeByUser[attempt.user_id] = { correct: 0, total: 0 }
          }
          mbeByUser[attempt.user_id].total += 1
          if (attempt.is_correct) {
            mbeByUser[attempt.user_id].correct += 1
          }
        }

        for (const score of Object.values(mbeByUser)) {
          const pct = toPercent(score.correct, score.total)
          if (pct > topMBE) topMBE = pct
        }

        const bllByUser: Record<string, typeof stateRuleProgress> = {}
        for (const row of stateRuleProgress) {
          bllByUser[row.user_id] ??= []
          bllByUser[row.user_id].push(row)
        }

        for (const rows of Object.values(bllByUser)) {
          const readiness = calculateLearningReadiness(rows)
          if (readiness > topBLL) topBLL = readiness
        }
      }
    }

    return NextResponse.json({
      userMBE,
      userBLL,
      stateMBEAvg,
      stateBLLAvg,
      topMBE,
      topBLL,
      stateUsers,
      passRate: 66,
    })
  } catch (error) {
    console.error("State comparison error:", error)

    return NextResponse.json(
      {
        userMBE: 0,
        userBLL: 0,
        stateMBEAvg: 0,
        stateBLLAvg: 0,
        topMBE: 0,
        topBLL: 0,
        stateUsers: 0,
        passRate: 66,
      },
      { status: 500 }
    )
  }
}
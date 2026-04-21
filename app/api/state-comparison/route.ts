import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function toPercent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const requestedState = searchParams.get("state")
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

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
        prisma.user_rule_progress.aggregate({
          where: { user_id: userId },
          _sum: {
            correct_count: true,
            attempts: true,
          },
        }),
      ])

    const userMBE = toPercent(userMbeCorrect, userMbeTotal)

    const userRuleCorrect = userRuleProgressAgg._sum.correct_count ?? 0
    const userRuleTotal = userRuleProgressAgg._sum.attempts ?? 0
    const userBLL = toPercent(userRuleCorrect, userRuleTotal)

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
              correct_count: true,
              attempts: true,
            },
          }),
        ])

        const stateMbeCorrect = stateMbeAttempts.reduce(
          (sum, attempt) => sum + (attempt.is_correct ? 1 : 0),
          0
        )
        const stateMbeTotal = stateMbeAttempts.length
        stateMBEAvg = toPercent(stateMbeCorrect, stateMbeTotal)

        const stateRuleCorrect = stateRuleProgress.reduce(
          (sum, row) => sum + row.correct_count,
          0
        )
        const stateRuleTotal = stateRuleProgress.reduce(
          (sum, row) => sum + row.attempts,
          0
        )
        stateBLLAvg = toPercent(stateRuleCorrect, stateRuleTotal)

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

        const bllByUser: Record<string, { correct: number; total: number }> = {}
        for (const row of stateRuleProgress) {
          if (!bllByUser[row.user_id]) {
            bllByUser[row.user_id] = { correct: 0, total: 0 }
          }
          bllByUser[row.user_id].correct += row.correct_count
          bllByUser[row.user_id].total += row.attempts
        }

        for (const score of Object.values(bllByUser)) {
          const pct = toPercent(score.correct, score.total)
          if (pct > topBLL) topBLL = pct
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
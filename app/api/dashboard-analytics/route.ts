import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type DayStatus = "fire" | "ice" | "empty"

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function dayKey(date: Date) {
  const d = startOfDay(date)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function buildCurrentAndBestStreak(activityDates: Date[]) {
  const uniqueSorted = Array.from(new Set(activityDates.map((d) => dayKey(d))))
    .map((key) => new Date(key))
    .sort((a, b) => a.getTime() - b.getTime())

  if (uniqueSorted.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      activitySet: new Set<string>(),
    }
  }

  const activitySet = new Set(uniqueSorted.map((d) => dayKey(d)))

  let bestStreak = 1
  let running = 1

  for (let i = 1; i < uniqueSorted.length; i++) {
    const diff = daysBetween(uniqueSorted[i], uniqueSorted[i - 1])
    if (diff === 1) {
      running++
      if (running > bestStreak) bestStreak = running
    } else {
      running = 1
    }
  }

  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let currentStreak = 0
  let cursor: Date | null = null

  if (activitySet.has(dayKey(today))) {
    cursor = today
  } else if (activitySet.has(dayKey(yesterday))) {
    cursor = yesterday
  }

  while (cursor && activitySet.has(dayKey(cursor))) {
    currentStreak++
    const prev = new Date(cursor)
    prev.setDate(prev.getDate() - 1)
    cursor = prev
  }

  return {
    currentStreak,
    bestStreak,
    activitySet,
  }
}

function calculateWeakAreasCount(
  rows: Array<{
    attempts: number
    correct_count: number
    needs_practice?: boolean | null
  }>
) {
  return rows.filter((row) => {
    if (row.needs_practice) return true
    if (!row.attempts || row.attempts < 3) return false
    const accuracy = Math.round((row.correct_count / row.attempts) * 100)
    return accuracy < 70
  }).length
}

function percent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const requestedState = url.searchParams.get("state")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const now = new Date()
    const today = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfDay(new Date(now))
    weekStart.setDate(weekStart.getDate() - 6)

    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        jurisdiction: true,
      },
    })

    const jurisdiction =
      requestedState?.trim() || profile?.jurisdiction?.trim() || null

    const goalMBE = 60

    const [
      todayMBE,
      todayBLL,
      userMbeTotal,
      userMbeCorrect,
      ruleProgressAggregate,
      allRuleAttemptDates,
      allMbeAttemptDates,
      weeklyRuleAttempts,
      weeklyRuleProgress,
      weeklyStudySessionAgg,
      weeklyStudySessionsCount,
      spacedReviewsDue,
    ] = await Promise.all([
      prisma.user_mbe_attempts.count({
        where: {
          user_id: userId,
          created_at: {
            gte: today,
            lte: todayEnd,
          },
        },
      }),

      prisma.user_rule_attempts.count({
        where: {
          user_id: userId,
          created_at: {
            gte: today,
            lte: todayEnd,
          },
        },
      }),

      prisma.user_mbe_attempts.count({
        where: {
          user_id: userId,
        },
      }),

      prisma.user_mbe_attempts.count({
        where: {
          user_id: userId,
          is_correct: true,
        },
      }),

      prisma.user_rule_progress.aggregate({
        where: {
          user_id: userId,
        },
        _sum: {
          correct_count: true,
          attempts: true,
        },
      }),

      prisma.user_rule_attempts.findMany({
        where: { user_id: userId },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: "asc",
        },
      }),

      prisma.user_mbe_attempts.findMany({
        where: { user_id: userId },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: "asc",
        },
      }),

      prisma.user_rule_attempts.count({
        where: {
          user_id: userId,
          created_at: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.user_rule_progress.findMany({
        where: {
          user_id: userId,
        },
        select: {
          attempts: true,
          correct_count: true,
          needs_practice: true,
        },
      }),

      prisma.studySession.aggregate({
        where: {
          userId,
          startedAt: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
        _sum: {
          durationSeconds: true,
        },
      }),

      prisma.studySession.count({
        where: {
          userId,
          startedAt: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.user_rule_progress.count({
        where: {
          user_id: userId,
          next_review_at: {
            lte: todayEnd,
          },
        },
      }),
    ])

    const mbeTotal = userMbeTotal
    const mbeCorrect = userMbeCorrect
    const overallMBE = percent(mbeCorrect, mbeTotal)

    const ruleCorrect = ruleProgressAggregate._sum.correct_count ?? 0
    const ruleTotal = ruleProgressAggregate._sum.attempts ?? 0
    const overallBLL = percent(ruleCorrect, ruleTotal)

    let stateMBEAvg = 0
    let stateBLLAvg = 0
    let topMBE = 0
    let topBLL = 0

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
        stateMBEAvg = percent(stateMbeCorrect, stateMbeTotal)

        const stateRuleCorrect = stateRuleProgress.reduce(
          (sum, row) => sum + row.correct_count,
          0
        )
        const stateRuleTotal = stateRuleProgress.reduce(
          (sum, row) => sum + row.attempts,
          0
        )
        stateBLLAvg = percent(stateRuleCorrect, stateRuleTotal)

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
          const pct = percent(score.correct, score.total)
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
          const pct = percent(score.correct, score.total)
          if (pct > topBLL) topBLL = pct
        }
      }
    }

    const activityDates = [
      ...allRuleAttemptDates
        .map((d) => d.created_at)
        .filter((d): d is Date => Boolean(d)),
      ...allMbeAttemptDates
        .map((d) => d.created_at)
        .filter((d): d is Date => Boolean(d)),
    ]

    const { currentStreak, bestStreak, activitySet } =
      buildCurrentAndBestStreak(activityDates)

    const streakDays: Array<{ status: DayStatus }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const key = dayKey(date)

      if (activitySet.has(key)) {
        streakDays.push({ status: "fire" })
      } else if (date < today) {
        streakDays.push({ status: "ice" })
      } else {
        streakDays.push({ status: "empty" })
      }
    }

    const weakAreasCount = calculateWeakAreasCount(weeklyRuleProgress)

    const weeklyStudyTimeHours = Number(
      ((weeklyStudySessionAgg._sum.durationSeconds ?? 0) / 3600).toFixed(1)
    )

    const goalBLL = 20

    return NextResponse.json(
      {
        todayMBE,
        todayBLL,
        goalMBE,
        goalBLL,
        overallMBE,
        overallBLL,
        totalMBEQuestions: mbeTotal,
        mbeAccuracy: overallMBE,
        bllScore: overallBLL,
        ruleAttempts: ruleTotal,
        prevMBE: overallMBE,
        prevBLL: overallBLL,
        userMBE: overallMBE,
        userBLL: overallBLL,
        stateMBEAvg,
        stateBLLAvg,
        topMBE,
        topBLL,
        streak: currentStreak,
        bestStreak,
        streakDays,
        weeklyStudyTimeHours,
        weeklyRulesDone: weeklyRuleAttempts,
        weeklySessions: weeklyStudySessionsCount,
        weeklyWeakAreas: weakAreasCount,
        weakAreasCount,
        spacedReviewsDue,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("Dashboard analytics error:", error)

    return NextResponse.json(
      {
        todayMBE: 0,
        todayBLL: 0,
        goalMBE: 60,
        goalBLL: 20,
        overallMBE: 0,
        overallBLL: 0,
        totalMBEQuestions: 0,
        mbeAccuracy: 0,
        bllScore: 0,
        ruleAttempts: 0,
        prevMBE: 0,
        prevBLL: 0,
        userMBE: 0,
        userBLL: 0,
        stateMBEAvg: 0,
        stateBLLAvg: 0,
        topMBE: 0,
        topBLL: 0,
        streak: 0,
        bestStreak: 0,
        streakDays: [],
        weeklyStudyTimeHours: 0,
        weeklyRulesDone: 0,
        weeklySessions: 0,
        weeklyWeakAreas: 0,
        weakAreasCount: 0,
        spacedReviewsDue: 0,
      },
      { status: 500 }
    )
  }
}

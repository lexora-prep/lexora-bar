import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

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
  return startOfDay(date).toISOString().slice(0, 10)
}

function percent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, error: null }
}

function buildSevenDayStreakDays(activityKeys: Set<string>) {
  const today = startOfDay(new Date())
  const days: Array<{ status: DayStatus }> = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = dayKey(date)

    if (activityKeys.has(key)) {
      days.push({ status: "fire" })
    } else if (date < today) {
      days.push({ status: "ice" })
    } else {
      days.push({ status: "empty" })
    }
  }

  return days
}

function calculateCurrentStreak(activityKeys: Set<string>) {
  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let cursor: Date | null = null

  if (activityKeys.has(dayKey(today))) {
    cursor = today
  } else if (activityKeys.has(dayKey(yesterday))) {
    cursor = yesterday
  }

  let streak = 0

  while (cursor && activityKeys.has(dayKey(cursor))) {
    streak++
    const prev = new Date(cursor)
    prev.setDate(prev.getDate() - 1)
    cursor = prev
  }

  return streak
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const startedAt = Date.now()

    const now = new Date()
    const today = startOfDay(now)
    const todayEnd = endOfDay(now)

    const weekStart = startOfDay(new Date(now))
    weekStart.setDate(weekStart.getDate() - 6)

    const [
      profile,
      plan,
      overallStat,
      ruleProgressAgg,
      todayMBE,
      todayBLL,
      weeklyRuleAttempts,
      weeklyStudySessionAgg,
      weeklyStudySessionsCount,
      spacedReviewsDue,
      weakAreasCount,
      recentRuleActivity,
      recentMbeActivity,
    ] = await Promise.all([
      prisma.profiles.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          full_name: true,
          law_school: true,
          jurisdiction: true,
          exam_month: true,
          exam_year: true,
          mbe_access: true,
          subscription_tier: true,
          billing_status: true,
          created_at: true,
          updated_at: true,
        },
      }),

      prisma.studyPlan.findUnique({
        where: { userId },
      }),

      prisma.userOverallStat.findUnique({
        where: { user_id: userId },
      }),

      prisma.user_rule_progress.aggregate({
        where: { user_id: userId },
        _sum: {
          correct_count: true,
          attempts: true,
        },
      }),

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

      prisma.user_rule_attempts.count({
        where: {
          user_id: userId,
          created_at: {
            gte: weekStart,
            lte: todayEnd,
          },
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

      prisma.user_rule_progress.count({
        where: {
          user_id: userId,
          OR: [
            { needs_practice: true },
            {
              attempts: {
                gte: 3,
              },
              correct_count: {
                lt: 3,
              },
            },
          ],
        },
      }),

      prisma.user_rule_attempts.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
        select: {
          created_at: true,
        },
        take: 500,
        orderBy: {
          created_at: "desc",
        },
      }),

      prisma.user_mbe_attempts.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: weekStart,
            lte: todayEnd,
          },
        },
        select: {
          created_at: true,
        },
        take: 500,
        orderBy: {
          created_at: "desc",
        },
      }),
    ])

    const ruleCorrect = ruleProgressAgg._sum.correct_count ?? 0
    const ruleTotal = ruleProgressAgg._sum.attempts ?? 0

    const userMBETotal = overallStat?.mbe_questions_done ?? 0
    const userMBECorrect = overallStat?.mbe_questions_correct ?? 0

    const overallMBE =
      overallStat?.mbe_accuracy !== null &&
      overallStat?.mbe_accuracy !== undefined
        ? Math.round(Number(overallStat.mbe_accuracy))
        : percent(userMBECorrect, userMBETotal)

    const overallBLL = percent(ruleCorrect, ruleTotal)

    const activityKeys = new Set<string>()

    for (const row of recentRuleActivity) {
      if (row.created_at) activityKeys.add(dayKey(row.created_at))
    }

    for (const row of recentMbeActivity) {
      if (row.created_at) activityKeys.add(dayKey(row.created_at))
    }

    const currentStreak = calculateCurrentStreak(activityKeys)
    const streakDays = buildSevenDayStreakDays(activityKeys)

    const weeklyStudyTimeHours = Number(
      ((weeklyStudySessionAgg._sum.durationSeconds ?? 0) / 3600).toFixed(1)
    )

    const dashboard = {
      todayMBE,
      todayBLL,
      goalMBE: 60,
      goalBLL: 20,
      overallMBE,
      overallBLL,
      totalMBEQuestions: userMBETotal,
      mbeAccuracy: overallMBE,
      bllScore: overallBLL,
      ruleAttempts: ruleTotal,
      prevMBE: overallMBE,
      prevBLL: overallBLL,
      userMBE: overallMBE,
      userBLL: overallBLL,
      stateMBEAvg: 0,
      stateBLLAvg: 0,
      topMBE: 0,
      topBLL: 0,
      streak: currentStreak,
      bestStreak: currentStreak,
      streakDays,
      weeklyStudyTimeHours,
      weeklyRulesDone: weeklyRuleAttempts,
      weeklySessions: weeklyStudySessionsCount,
      weeklyWeakAreas: weakAreasCount,
      weakAreasCount,
      spacedReviewsDue,
    }

    return NextResponse.json(
      {
        profile,
        plan,
        dashboard,
        subjects: [],
        mbeSubjects: [],
        stateData: {
          userMBE: overallMBE,
          userBLL: overallBLL,
          stateMBEAvg: 0,
          stateBLLAvg: 0,
          topMBE: 0,
          topBLL: 0,
          stateUsers: 0,
          passRate: 66,
        },
        trend: [],
        durationMs: Date.now() - startedAt,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    console.error("Dashboard snapshot error:", error)

    return NextResponse.json(
      {
        profile: null,
        plan: null,
        dashboard: null,
        subjects: [],
        mbeSubjects: [],
        stateData: null,
        trend: [],
      },
      { status: 500 }
    )
  }
}

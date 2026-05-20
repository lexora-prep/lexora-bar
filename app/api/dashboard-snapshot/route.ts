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

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function percent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

function numberValue(value: unknown) {
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return 0
}

function toSubjectKey(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
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

async function getProfile(userId: string) {
  return prisma.profiles.findUnique({
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
  })
}

async function getStudyPlan(userId: string) {
  return prisma.studyPlan.findUnique({
    where: { userId },
  })
}

async function getDashboardAnalytics(userId: string, jurisdiction: string | null) {
  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfDay(new Date(now))
  weekStart.setDate(weekStart.getDate() - 6)

  const todayMBE = await prisma.user_mbe_attempts.count({
    where: {
      user_id: userId,
      created_at: {
        gte: today,
        lte: todayEnd,
      },
    },
  })

  const todayBLL = await prisma.user_rule_attempts.count({
    where: {
      user_id: userId,
      created_at: {
        gte: today,
        lte: todayEnd,
      },
    },
  })

  const userMbeTotal = await prisma.user_mbe_attempts.count({
    where: { user_id: userId },
  })

  const userMbeCorrect = await prisma.user_mbe_attempts.count({
    where: {
      user_id: userId,
      is_correct: true,
    },
  })

  const ruleProgressAggregate = await prisma.user_rule_progress.aggregate({
    where: { user_id: userId },
    _sum: {
      correct_count: true,
      attempts: true,
    },
  })

  const weeklyRuleAttempts = await prisma.user_rule_attempts.count({
    where: {
      user_id: userId,
      created_at: {
        gte: weekStart,
        lte: todayEnd,
      },
    },
  })

  const weakAreasCount = await prisma.user_rule_progress.count({
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
  })

  const weeklyStudySessionAgg = await prisma.studySession.aggregate({
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
  })

  const weeklyStudySessionsCount = await prisma.studySession.count({
    where: {
      userId,
      startedAt: {
        gte: weekStart,
        lte: todayEnd,
      },
    },
  })

  const spacedReviewsDue = await prisma.user_rule_progress.count({
    where: {
      user_id: userId,
      next_review_at: {
        lte: todayEnd,
      },
    },
  })

  const activityRows = await prisma.$queryRaw<Array<{ activity_date: Date }>>`
    SELECT DISTINCT DATE(created_at) AS activity_date
    FROM public.user_rule_attempts
    WHERE user_id = ${userId}::uuid
      AND created_at IS NOT NULL

    UNION

    SELECT DISTINCT DATE(created_at) AS activity_date
    FROM public.user_mbe_attempts
    WHERE user_id = ${userId}::uuid
      AND created_at IS NOT NULL

    ORDER BY activity_date ASC
  `

  const activityDates = activityRows
    .map((row) => row.activity_date)
    .filter((date): date is Date => Boolean(date))

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

  const overallMBE = percent(userMbeCorrect, userMbeTotal)

  const ruleCorrect = ruleProgressAggregate._sum.correct_count ?? 0
  const ruleTotal = ruleProgressAggregate._sum.attempts ?? 0
  const overallBLL = percent(ruleCorrect, ruleTotal)

  const stateData = await getStateComparison(userId, jurisdiction, overallMBE, overallBLL)

  const weeklyStudyTimeHours = Number(
    ((weeklyStudySessionAgg._sum.durationSeconds ?? 0) / 3600).toFixed(1)
  )

  return {
    todayMBE,
    todayBLL,
    goalMBE: 60,
    goalBLL: 20,
    overallMBE,
    overallBLL,
    totalMBEQuestions: userMbeTotal,
    mbeAccuracy: overallMBE,
    bllScore: overallBLL,
    ruleAttempts: ruleTotal,
    prevMBE: overallMBE,
    prevBLL: overallBLL,
    userMBE: overallMBE,
    userBLL: overallBLL,
    stateMBEAvg: stateData.stateMBEAvg,
    stateBLLAvg: stateData.stateBLLAvg,
    topMBE: stateData.topMBE,
    topBLL: stateData.topBLL,
    streak: currentStreak,
    bestStreak,
    streakDays,
    weeklyStudyTimeHours,
    weeklyRulesDone: weeklyRuleAttempts,
    weeklySessions: weeklyStudySessionsCount,
    weeklyWeakAreas: weakAreasCount,
    weakAreasCount,
    spacedReviewsDue,
  }
}

async function getSubjectAnalytics(userId: string) {
  const subjects = await prisma.subjects.findMany({
    select: {
      id: true,
      name: true,
      order_index: true,
    },
    orderBy: {
      order_index: "asc",
    },
  })

  const rulesCountBySubject = await prisma.rules.groupBy({
    by: ["subject_id"],
    _count: {
      _all: true,
    },
  })

  const userRuleProgress = await prisma.user_rule_progress.findMany({
    where: {
      user_id: userId,
    },
    select: {
      correct_count: true,
      attempts: true,
      rules: {
        select: {
          subject_id: true,
        },
      },
    },
  })

  const mbeQuestionCountBySubject = await prisma.mBEQuestion.groupBy({
    by: ["subject_id"],
    where: {
      is_active: true,
    },
    _count: {
      _all: true,
    },
  })

  const userMbeAttempts = await prisma.user_mbe_attempts.findMany({
    where: {
      user_id: userId,
    },
    select: {
      is_correct: true,
      mbe_question: {
        select: {
          subject_id: true,
        },
      },
    },
  })

  const rulesTotalMap = new Map<string, number>()

  for (const row of rulesCountBySubject) {
    const subjectId = toSubjectKey(row.subject_id)
    if (!subjectId) continue
    rulesTotalMap.set(subjectId, row._count._all)
  }

  const mbeQuestionTotalMap = new Map<string, number>()

  for (const row of mbeQuestionCountBySubject) {
    const subjectId = toSubjectKey(row.subject_id)
    if (!subjectId) continue
    mbeQuestionTotalMap.set(subjectId, row._count._all)
  }

  const bllAggMap = new Map<
    string,
    { correct: number; attempts: number; completed: number }
  >()

  for (const row of userRuleProgress) {
    const subjectId = toSubjectKey(row.rules?.subject_id)
    if (!subjectId) continue

    const existing = bllAggMap.get(subjectId) ?? {
      correct: 0,
      attempts: 0,
      completed: 0,
    }

    existing.correct += row.correct_count ?? 0
    existing.attempts += row.attempts ?? 0
    existing.completed += 1

    bllAggMap.set(subjectId, existing)
  }

  const mbeAggMap = new Map<string, { correct: number; attempts: number }>()

  for (const row of userMbeAttempts) {
    const subjectId = toSubjectKey(row.mbe_question?.subject_id)
    if (!subjectId) continue

    const existing = mbeAggMap.get(subjectId) ?? {
      correct: 0,
      attempts: 0,
    }

    existing.attempts += 1
    if (row.is_correct) {
      existing.correct += 1
    }

    mbeAggMap.set(subjectId, existing)
  }

  const bllResults: Array<{
    name: string
    accuracy: number
    completed: number
    total: number
  }> = []

  const mbeResults: Array<{
    name: string
    accuracy: number
    completed: number
    total: number
    avg: number
  }> = []

  for (const subject of subjects) {
    const subjectKey = toSubjectKey(subject.id)
    if (!subjectKey) continue

    const bllAgg = bllAggMap.get(subjectKey) ?? {
      correct: 0,
      attempts: 0,
      completed: 0,
    }

    const rulesTotal = rulesTotalMap.get(subjectKey) ?? 0

    bllResults.push({
      name: subject.name,
      accuracy: percent(bllAgg.correct, bllAgg.attempts),
      completed: bllAgg.completed,
      total: rulesTotal,
    })

    const mbeAgg = mbeAggMap.get(subjectKey) ?? {
      correct: 0,
      attempts: 0,
    }

    const mbeQuestionTotal = mbeQuestionTotalMap.get(subjectKey) ?? 0
    const mbeAccuracy = percent(mbeAgg.correct, mbeAgg.attempts)

    mbeResults.push({
      name: subject.name,
      accuracy: mbeAccuracy,
      completed: mbeAgg.attempts,
      total: mbeQuestionTotal,
      avg: Math.max(0, mbeAccuracy - 8),
    })
  }

  return {
    subjects: bllResults,
    mbeSubjects: mbeResults,
  }
}

async function getStateComparison(
  userId: string,
  jurisdiction: string | null,
  userMBE: number,
  userBLL: number
) {
  let stateMBEAvg = 0
  let stateBLLAvg = 0
  let topMBE = 0
  let topBLL = 0
  let stateUsers = 0

  if (!jurisdiction) {
    return {
      userMBE,
      userBLL,
      stateMBEAvg,
      stateBLLAvg,
      topMBE,
      topBLL,
      stateUsers,
      passRate: 66,
    }
  }

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
    const stateMbeAttempts = await prisma.user_mbe_attempts.findMany({
      where: {
        user_id: { in: stateUserIds },
      },
      select: {
        user_id: true,
        is_correct: true,
      },
    })

    const stateRuleProgress = await prisma.user_rule_progress.findMany({
      where: {
        user_id: { in: stateUserIds },
      },
      select: {
        user_id: true,
        correct_count: true,
        attempts: true,
      },
    })

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

  return {
    userMBE,
    userBLL,
    stateMBEAvg,
    stateBLLAvg,
    topMBE,
    topBLL,
    stateUsers,
    passRate: 66,
  }
}

async function getTrendData(userId: string) {
  const now = new Date()
  const endDate = endOfDay(now)
  const startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))

  const mbeRows = await prisma.$queryRaw<
    Array<{ date: Date; correct: unknown; total: unknown }>
  >`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) FILTER (WHERE is_correct = true) AS correct,
      COUNT(*) AS total
    FROM public.user_mbe_attempts
    WHERE user_id = ${userId}::uuid
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `

  const bllRows = await prisma.$queryRaw<
    Array<{ date: Date; score_sum: unknown; total: unknown }>
  >`
    SELECT
      DATE(created_at) AS date,
      COALESCE(SUM(score), 0) AS score_sum,
      COUNT(*) AS total
    FROM public.user_rule_attempts
    WHERE user_id = ${userId}::uuid
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `

  const map = new Map<string, { mbe: number; bll: number }>()

  for (const row of mbeRows) {
    const key = dayKey(row.date)
    const correct = numberValue(row.correct)
    const total = numberValue(row.total)
    map.set(key, {
      ...(map.get(key) ?? { mbe: 0, bll: 0 }),
      mbe: percent(correct, total),
    })
  }

  for (const row of bllRows) {
    const key = dayKey(row.date)
    const scoreSum = numberValue(row.score_sum)
    const total = numberValue(row.total)
    map.set(key, {
      ...(map.get(key) ?? { mbe: 0, bll: 0 }),
      bll: total ? Math.round(scoreSum / total) : 0,
    })
  }

  return Array.from(map.entries()).map(([date, value]) => ({
    date,
    mbe: value.mbe,
    bll: value.bll,
  }))
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

    const profile = await getProfile(userId)
    const jurisdiction = profile?.jurisdiction?.trim() || null

    const plan = await getStudyPlan(userId)
    const dashboard = await getDashboardAnalytics(userId, jurisdiction)
    const subjectAnalytics = await getSubjectAnalytics(userId)
    const stateData = await getStateComparison(
      userId,
      jurisdiction,
      dashboard.userMBE,
      dashboard.userBLL
    )
    const trend = await getTrendData(userId)

    return NextResponse.json(
      {
        profile,
        plan,
        dashboard,
        subjects: subjectAnalytics.subjects,
        mbeSubjects: subjectAnalytics.mbeSubjects,
        stateData,
        trend,
        durationMs: Date.now() - startedAt,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
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

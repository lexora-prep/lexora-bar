import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

type DayStatus = "fire" | "ice" | "none"

type SubjectAnalyticsResult = {
  subjects: Array<{
    name: string
    accuracy: number
    completed: number
    total: number
    level: string
    progressWidth: number
  }>
  mbeSubjects: Array<{
    name: string
    accuracy: number
    completed: number
    total: number
    level: string
    progressWidth: number
  }>
}

type DashboardMetricsResult = {
  todayBLL: number
  todayMBE: number
  goalBLL: number
  goalMBE: number
  userBLL: number
  userMBE: number
  stateBLLAvg: number
  stateMBEAvg: number
  topBLL: number
  topMBE: number
  spacedReviewsDue: number
  weeklyStudyTimeHours: number
  weeklyRulesDone: number
  weeklySessions: number
  weeklyWeakAreas: number
  weakAreasCount: number
  currentStreak: number
  bestStreak: number
  streakDays: Array<{
    date?: string
    status: DayStatus
  }>
  selectedState: string
}

function percent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

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
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

function buildFallbackStreakDays() {
  return Array.from({ length: 7 }, () => ({ status: "none" as DayStatus }))
}

function buildStreak(activityDates: Date[]) {
  const uniqueSorted = Array.from(
    new Set(
      activityDates
        .filter((d) => d instanceof Date && Number.isNaN(d.getTime()) === false)
        .map((d) => dayKey(d))
    )
  )
    .map((key) => new Date(key))
    .sort((a, b) => a.getTime() - b.getTime())

  if (uniqueSorted.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      streakDays: buildFallbackStreakDays(),
    }
  }

  const activitySet = new Set(uniqueSorted.map((d) => dayKey(d)))

  let bestStreak = 1
  let running = 1

  for (let i = 1; i < uniqueSorted.length; i++) {
    const diff = daysBetween(uniqueSorted[i], uniqueSorted[i - 1])

    if (diff === 1) {
      running += 1
      bestStreak = Math.max(bestStreak, running)
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
    currentStreak += 1
    const prev = new Date(cursor)
    prev.setDate(prev.getDate() - 1)
    cursor = prev
  }

  const streakDays = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - index))

    return {
      date: dayKey(d),
      status: activitySet.has(dayKey(d))
        ? ("fire" as DayStatus)
        : ("none" as DayStatus),
    }
  })

  return {
    currentStreak,
    bestStreak,
    streakDays,
  }
}

function buildLevelAndProgress(attempts: number, accuracy: number) {
  if (attempts <= 0) {
    return {
      level: "Limited",
      progressWidth: 0,
    }
  }

  const completionFactor = Math.min(attempts / 10, 1)

  if (attempts < 2) {
    return {
      level: "Limited",
      progressWidth: Math.max(6, Math.round(completionFactor * 18)),
    }
  }

  if (accuracy < 55) {
    return {
      level: "Building",
      progressWidth: Math.max(10, Math.round((accuracy / 100) * 35)),
    }
  }

  if (accuracy < 75) {
    return {
      level: "Progressing",
      progressWidth: Math.max(24, Math.round((accuracy / 100) * 65)),
    }
  }

  return {
    level: "Strong",
    progressWidth: Math.max(48, Math.round((accuracy / 100) * 100)),
  }
}

function getEmptySubjectAnalytics(): SubjectAnalyticsResult {
  return {
    subjects: [],
    mbeSubjects: [],
  }
}

function getEmptyDashboardMetrics(profileState: string | null): DashboardMetricsResult {
  return {
    todayBLL: 0,
    todayMBE: 0,
    goalBLL: 20,
    goalMBE: 60,
    userBLL: 0,
    userMBE: 0,
    stateBLLAvg: 0,
    stateMBEAvg: 0,
    topBLL: 0,
    topMBE: 0,
    spacedReviewsDue: 0,
    weeklyStudyTimeHours: 0,
    weeklyRulesDone: 0,
    weeklySessions: 0,
    weeklyWeakAreas: 0,
    weakAreasCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    streakDays: buildFallbackStreakDays(),
    selectedState: profileState || "",
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

  return {
    user,
    error: null,
  }
}

async function getOrCreateProfile(user: { id: string; email?: string | null }) {
  const existing = await prisma.profiles.findUnique({
    where: { id: user.id },
  })

  if (existing) return existing

  return prisma.profiles.create({
    data: {
      id: user.id,
      email: user.email ?? "",
      full_name: null,
      law_school: null,
      jurisdiction: null,
      exam_month: null,
      exam_year: null,
      mbe_access: false,
      subscription_tier: "free",
      billing_status: "free",
      role: "user",
      is_admin: false,
      is_blocked: false,
      updated_at: new Date(),
    },
  })
}

async function getSubjectAnalytics(userId: string): Promise<SubjectAnalyticsResult> {
  let subjects: Array<{
    id: string
    name: string
    order_index: number | null
  }> = []

  let activeRuleRows: Array<{
    subject_id: string | null
  }> = []

  let userRuleProgress: Array<{
    attempts: number | null
    correct_count: number | null
    mastery_level: number | null
    rules: {
      subject_id: string | null
    } | null
  }> = []

  let activeMbeQuestionRows: Array<{
    subject_id: string | null
  }> = []

  let userMbeAttempts: Array<{
    is_correct: boolean | null
    mbe_question: {
      subject_id: string | null
    } | null
  }> = []

  try {
    subjects = await prisma.subjects.findMany({
      select: {
        id: true,
        name: true,
        order_index: true,
      },
      orderBy: {
        order_index: "asc",
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH SUBJECTS ERROR:", err)
    return getEmptySubjectAnalytics()
  }

  try {
    activeRuleRows = await prisma.rules.findMany({
      where: {
        is_active: true,
      },
      select: {
        subject_id: true,
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH RULES COUNT ERROR:", err)
  }

  try {
    userRuleProgress = await prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
      },
      select: {
        attempts: true,
        correct_count: true,
        mastery_level: true,
        rules: {
          select: {
            subject_id: true,
          },
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH USER RULE PROGRESS ERROR:", err)
  }

  try {
    activeMbeQuestionRows = await prisma.mBEQuestion.findMany({
      where: {
        is_active: true,
      },
      select: {
        subject_id: true,
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH MBE QUESTION COUNT ERROR:", err)
  }

  try {
    userMbeAttempts = await prisma.user_mbe_attempts.findMany({
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
  } catch (err) {
    console.error("DASHBOARD BATCH USER MBE ATTEMPTS ERROR:", err)
  }

  const rulesTotalBySubjectId = new Map<string, number>()
  for (const row of activeRuleRows) {
    if (row.subject_id) {
      rulesTotalBySubjectId.set(
        row.subject_id,
        (rulesTotalBySubjectId.get(row.subject_id) ?? 0) + 1
      )
    }
  }

  const mbeTotalBySubjectId = new Map<string, number>()
  for (const row of activeMbeQuestionRows) {
    if (row.subject_id) {
      mbeTotalBySubjectId.set(
        row.subject_id,
        (mbeTotalBySubjectId.get(row.subject_id) ?? 0) + 1
      )
    }
  }

  const bllAgg = new Map<
    string,
    {
      completed: number
      attempts: number
      correct: number
      masterySum: number
    }
  >()

  for (const row of userRuleProgress) {
    const subjectId = row.rules?.subject_id
    if (!subjectId) continue

    const current =
      bllAgg.get(subjectId) ??
      {
        completed: 0,
        attempts: 0,
        correct: 0,
        masterySum: 0,
      }

    const attempts = Number(row.attempts ?? 0)
    const correct = Number(row.correct_count ?? 0)
    const mastery = Number(row.mastery_level ?? percent(correct, attempts))

    current.completed += attempts > 0 ? 1 : 0
    current.attempts += attempts
    current.correct += correct
    current.masterySum += mastery

    bllAgg.set(subjectId, current)
  }

  const mbeAgg = new Map<
    string,
    {
      completed: number
      correct: number
    }
  >()

  for (const row of userMbeAttempts) {
    const subjectId = row.mbe_question?.subject_id
    if (!subjectId) continue

    const current =
      mbeAgg.get(subjectId) ??
      {
        completed: 0,
        correct: 0,
      }

    current.completed += 1
    if (row.is_correct) current.correct += 1

    mbeAgg.set(subjectId, current)
  }

  const bllSubjects = subjects
    .map((subject) => {
      const stats =
        bllAgg.get(subject.id) ??
        {
          completed: 0,
          attempts: 0,
          correct: 0,
          masterySum: 0,
        }

      const total = rulesTotalBySubjectId.get(subject.id) ?? 0
      const accuracy =
        stats.completed > 0
          ? Math.round(stats.masterySum / Math.max(stats.completed, 1))
          : 0
      const derived = buildLevelAndProgress(stats.completed, accuracy)

      return {
        name: subject.name,
        accuracy,
        completed: stats.completed,
        total,
        level: derived.level,
        progressWidth: derived.progressWidth,
      }
    })
    .filter((row) => row.total > 0)

  const mbeSubjects = subjects
    .map((subject) => {
      const stats =
        mbeAgg.get(subject.id) ??
        {
          completed: 0,
          correct: 0,
        }

      const total = mbeTotalBySubjectId.get(subject.id) ?? 0
      const accuracy = percent(stats.correct, stats.completed)
      const derived = buildLevelAndProgress(stats.completed, accuracy)

      return {
        name: subject.name,
        accuracy,
        completed: stats.completed,
        total,
        level: derived.level,
        progressWidth: derived.progressWidth,
      }
    })
    .filter((row) => row.total > 0)

  return {
    subjects: bllSubjects,
    mbeSubjects,
  }
}

async function getDashboardMetrics(
  userId: string,
  profileState: string | null
): Promise<DashboardMetricsResult> {
  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfDay(new Date(now))
  weekStart.setDate(weekStart.getDate() - 6)

  let todayBLL = 0
  let todayMBE = 0

  let userRuleProgress: Array<{
    attempts: number | null
    correct_count: number | null
    needs_practice: boolean | null
  }> = []

  let userMbeAttempts: Array<{
    is_correct: boolean | null
  }> = []

  let weeklyRuleAttempts = 0

  let weeklyStudySessionAgg: {
    _sum: {
      durationSeconds: number | null
    }
  } = {
    _sum: {
      durationSeconds: 0,
    },
  }

  let weeklyStudySessionsCount = 0
  let spacedReviewsDue = 0

  let ruleAttemptDates: Array<{
    created_at: Date | null
  }> = []

  let mbeAttemptDates: Array<{
    created_at: Date | null
  }> = []

  let weakRows: Array<{
    attempts: number | null
    correct_count: number | null
    needs_practice: boolean | null
  }> = []

  try {
    todayBLL = await prisma.user_rule_attempts.count({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
          lte: todayEnd,
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH TODAY BLL ERROR:", err)
  }

  try {
    todayMBE = await prisma.user_mbe_attempts.count({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
          lte: todayEnd,
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH TODAY MBE ERROR:", err)
  }

  try {
    userRuleProgress = await prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
      },
      select: {
        attempts: true,
        correct_count: true,
        needs_practice: true,
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH METRICS RULE PROGRESS ERROR:", err)
  }

  try {
    userMbeAttempts = await prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        is_correct: true,
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH METRICS MBE ATTEMPTS ERROR:", err)
  }

  try {
    weeklyRuleAttempts = await prisma.user_rule_attempts.count({
      where: {
        user_id: userId,
        created_at: {
          gte: weekStart,
          lte: todayEnd,
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH WEEKLY RULE ATTEMPTS ERROR:", err)
  }

  try {
    weeklyStudySessionAgg = await prisma.studySession.aggregate({
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
  } catch (err) {
    console.error("DASHBOARD BATCH WEEKLY STUDY TIME ERROR:", err)
  }

  try {
    weeklyStudySessionsCount = await prisma.studySession.count({
      where: {
        userId,
        startedAt: {
          gte: weekStart,
          lte: todayEnd,
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH WEEKLY STUDY SESSIONS ERROR:", err)
  }

  try {
    spacedReviewsDue = await prisma.user_rule_progress.count({
      where: {
        user_id: userId,
        next_review_at: {
          lte: todayEnd,
        },
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH SPACED REVIEWS ERROR:", err)
  }

  try {
    ruleAttemptDates = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH RULE ATTEMPT DATES ERROR:", err)
  }

  try {
    mbeAttemptDates = await prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH MBE ATTEMPT DATES ERROR:", err)
  }

  try {
    weakRows = await prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
      },
      select: {
        attempts: true,
        correct_count: true,
        needs_practice: true,
      },
    })
  } catch (err) {
    console.error("DASHBOARD BATCH WEAK ROWS ERROR:", err)
  }

  const bllCorrect = userRuleProgress.reduce(
    (sum, row) => sum + Number(row.correct_count ?? 0),
    0
  )
  const bllAttempts = userRuleProgress.reduce(
    (sum, row) => sum + Number(row.attempts ?? 0),
    0
  )

  const mbeCorrect = userMbeAttempts.filter((row) => row.is_correct).length
  const mbeTotal = userMbeAttempts.length

  const weakAreasCount = weakRows.filter((row) => {
    if (row.needs_practice) return true
    if (!row.attempts || row.attempts < 3) return false
    return percent(row.correct_count ?? 0, row.attempts ?? 0) < 70
  }).length

  const activityDates = [
    ...ruleAttemptDates
      .map((row) => row.created_at)
      .filter((date): date is Date => date instanceof Date),
    ...mbeAttemptDates
      .map((row) => row.created_at)
      .filter((date): date is Date => date instanceof Date),
  ]

  const streak = buildStreak(activityDates)

  return {
    todayBLL,
    todayMBE,
    goalBLL: 20,
    goalMBE: 60,
    userBLL: percent(bllCorrect, bllAttempts),
    userMBE: percent(mbeCorrect, mbeTotal),
    stateBLLAvg: 0,
    stateMBEAvg: 0,
    topBLL: 0,
    topMBE: 0,
    spacedReviewsDue,
    weeklyStudyTimeHours: Number(
      ((weeklyStudySessionAgg._sum.durationSeconds ?? 0) / 3600).toFixed(1)
    ),
    weeklyRulesDone: weeklyRuleAttempts,
    weeklySessions: weeklyStudySessionsCount,
    weeklyWeakAreas: weakAreasCount,
    weakAreasCount,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    streakDays: streak.streakDays,
    selectedState: profileState || "",
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const user = auth.user
    const profile = await getOrCreateProfile(user)

    const url = new URL(request.url)
    const requestedState = url.searchParams.get("state")?.trim() || null

    const savedProfileState =
      typeof profile.jurisdiction === "string" && profile.jurisdiction.trim()
        ? profile.jurisdiction.trim()
        : null

    const profileState = requestedState || savedProfileState

    let studyPlan = null
    let subjectAnalytics = getEmptySubjectAnalytics()
    let dashboardMetrics = getEmptyDashboardMetrics(profileState)

    try {
      studyPlan = await prisma.studyPlan.findUnique({
        where: {
          userId: user.id,
        },
      })
    } catch (err) {
      console.error("DASHBOARD BATCH STUDY PLAN ERROR:", err)
    }

    try {
      subjectAnalytics = await getSubjectAnalytics(user.id)
    } catch (err) {
      console.error("DASHBOARD BATCH SUBJECT ANALYTICS ERROR:", err)
    }

    try {
      dashboardMetrics = await getDashboardMetrics(user.id, profileState)
    } catch (err) {
      console.error("DASHBOARD BATCH METRICS ERROR:", err)
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        law_school: profile.law_school,
        jurisdiction: profileState,
        exam_month: profile.exam_month,
        exam_year: profile.exam_year,
        mbe_access: profile.mbe_access,
        subscription_tier: profile.subscription_tier || "free",
        billing_status: profile.billing_status || "free",
      },
      studyPlan,
      dashboard: dashboardMetrics,
      subjects: subjectAnalytics.subjects,
      mbeSubjects: subjectAnalytics.mbeSubjects,
      stateData: profileState
        ? {
            userMBE: dashboardMetrics.userMBE,
            userBLL: dashboardMetrics.userBLL,
            stateMBEAvg: dashboardMetrics.stateMBEAvg,
            stateBLLAvg: dashboardMetrics.stateBLLAvg,
            topMBE: dashboardMetrics.topMBE,
            topBLL: dashboardMetrics.topBLL,
          }
        : null,
    })
  } catch (error: any) {
    console.error("DASHBOARD BATCH ERROR:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load dashboard batch.",
        message: error?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
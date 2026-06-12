// app/api/dashboard/summary/route.ts

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import {
  calculateLearningReadiness,
  countWeakLearningRows,
  LEARNING_PROGRESS_SELECT,
  resolveLearningProgress,
} from "@/lib/learning/analytics"
import { getApplicableRuleUniverseForUser } from "@/lib/rules/registry"

type DayStatus = "fire" | "ice" | "empty"

export const dynamic = "force-dynamic"

type SettledSection<T> = {
  ok: boolean
  data: T
}

type DashboardMetrics = {
  todayMBE: number
  todayBLL: number
  goalMBE: number
  goalBLL: number
  userMBE: number
  userBLL: number
  stateMBEAvg: number
  stateBLLAvg: number
  topMBE: number
  topBLL: number
  spacedReviewsDue: number
  weeklyStudyTimeHours: number
  weeklyRulesDone: number
  weeklySessions: number
  weeklyWeakAreas: number
  streak: number
  bestStreak: number
  streakDays: Array<{ status: DayStatus }>
}

type SubjectDiagnostics = {
  subjectsOk: boolean
  rulesBySubjectOk: boolean
  ruleProgressOk: boolean
  mbeBySubjectOk: boolean
  mbeAttemptsOk: boolean
}

type SubjectSummaries = {
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
  diagnostics: SubjectDiagnostics
}

type WeakAreasSummary = {
  weakAreas: Array<{
    id: string
    ruleId: string
    subject: string
    topic: string
    rule: string
    title: string
    accuracy: number
    attempts: number
    needsPractice: boolean
    mastery: number
  }>
  count: number
}

const fallbackDashboard: DashboardMetrics = {
  todayMBE: 0,
  todayBLL: 0,
  goalMBE: 60,
  goalBLL: 20,
  userMBE: 0,
  userBLL: 0,
  stateMBEAvg: 0,
  stateBLLAvg: 0,
  topMBE: 0,
  topBLL: 0,
  spacedReviewsDue: 0,
  weeklyStudyTimeHours: 0,
  weeklyRulesDone: 0,
  weeklySessions: 0,
  weeklyWeakAreas: 0,
  streak: 0,
  bestStreak: 0,
  streakDays: [],
}

const fallbackSubjects: SubjectSummaries = {
  subjects: [],
  mbeSubjects: [],
  diagnostics: {
    subjectsOk: false,
    rulesBySubjectOk: false,
    ruleProgressOk: false,
    mbeBySubjectOk: false,
    mbeAttemptsOk: false,
  },
}

const fallbackWeakAreas: WeakAreasSummary = {
  weakAreas: [],
  count: 0,
}

function jsonSection<T>(
  result: PromiseSettledResult<T>,
  fallback: T
): SettledSection<T> {
  if (result.status === "fulfilled") {
    return {
      ok: true,
      data: result.value,
    }
  }

  return {
    ok: false,
    data: fallback,
  }
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
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

    const previous = new Date(cursor)
    previous.setDate(previous.getDate() - 1)
    cursor = previous
  }

  return {
    currentStreak,
    bestStreak,
    activitySet,
  }
}

function calculateAccuracy(correctCount: number, attempts: number) {
  if (!attempts) return 0
  return Math.max(0, Math.min(100, Math.round((correctCount / attempts) * 100)))
}

function buildLevelAndProgress(attempts: number, accuracy: number) {
  let level = "Limited"
  let progressWidth = 0

  if (attempts <= 0) {
    return {
      level: "Limited",
      progressWidth: 0,
    }
  }

  const completionFactor = Math.min(attempts / 10, 1)

  if (attempts < 2) {
    level = "Limited"
    progressWidth = Math.max(6, Math.round(completionFactor * 18))
  } else if (accuracy < 55) {
    level = "Building"
    progressWidth = Math.max(10, Math.round((accuracy / 100) * 35))
  } else if (accuracy < 75) {
    level = "Progressing"
    progressWidth = Math.max(24, Math.round((accuracy / 100) * 65))
  } else {
    level = "Strong"
    progressWidth = Math.max(48, Math.round((accuracy / 100) * 100))
  }

  return { level, progressWidth }
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfSevenDaysAgo() {
  const today = startOfToday()
  const result = new Date(today)
  result.setDate(result.getDate() - 6)
  return result
}

function normalizePlan(plan: any) {
  if (!plan || !plan.startDate || !plan.examDate) return null

  return {
    ...plan,
    startDate:
      plan.startDate instanceof Date
        ? plan.startDate.toISOString()
        : plan.startDate,
    examDate:
      plan.examDate instanceof Date
        ? plan.examDate.toISOString()
        : plan.examDate,
    createdAt:
      plan.createdAt instanceof Date
        ? plan.createdAt.toISOString()
        : plan.createdAt,
    updatedAt:
      plan.updatedAt instanceof Date
        ? plan.updatedAt.toISOString()
        : plan.updatedAt,
  }
}

function serializeDebugError(result: PromiseSettledResult<unknown>, index: number) {
  if (result.status === "fulfilled") {
    return null
  }

  const reason = result.reason as any

  return {
    sectionIndex: index,
    name:
      index === 0
        ? "profile"
        : index === 1
          ? "studyPlan"
          : index === 2
            ? "dashboard"
            : index === 3
              ? "subjects"
              : index === 4
                ? "weakAreas"
                : "unknown",
    message: reason?.message || String(reason),
    code: reason?.code || null,
    meta: reason?.meta || null,
    stack:
      process.env.NODE_ENV === "production"
        ? null
        : reason?.stack || null,
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
    where: {
      id: userId,
    },
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
      role: true,
      admin_role: true,
      is_admin: true,
      is_blocked: true,
    },
  })
}

async function getStudyPlan(userId: string) {
  const plan = await prisma.studyPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return normalizePlan(plan)
}

async function getDashboardMetrics(
  userId: string,
  requestedState?: string | null,
  includeStateComparison = false
): Promise<DashboardMetrics> {
  const today = startOfToday()
  const weekStart = startOfSevenDaysAgo()

  const [
    todayMbeAttempts,
    todayRuleAttempts,
    allMbeAttempts,
    allRuleAttempts,
    weeklyMbeAttempts,
    weeklyRuleAttempts,
    weakRuleCount,
    spacedReviews,
  ] = await Promise.allSettled([
    prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
        },
      },
      select: {
        is_correct: true,
      },
    }),

    prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
        },
      },
      select: {
        score: true,
      },
    }),

    prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        is_correct: true,
      },
    }),

    prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
      },
      select: {
        ...LEARNING_PROGRESS_SELECT,
      },
    }),

    prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: weekStart,
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: weekStart,
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
        attempts: {
          gte: 1,
        },
      },
      select: {
        ...LEARNING_PROGRESS_SELECT,
      },
    }),

    prisma.user_rule_progress.count({
      where: {
        user_id: userId,
        next_review_at: {
          lte: new Date(),
        },
      },
    }),
  ])

  const safeTodayMbe =
    todayMbeAttempts.status === "fulfilled" ? todayMbeAttempts.value : []
  const safeTodayRules =
    todayRuleAttempts.status === "fulfilled" ? todayRuleAttempts.value : []
  const safeAllMbe =
    allMbeAttempts.status === "fulfilled" ? allMbeAttempts.value : []
  const safeAllRules =
    allRuleAttempts.status === "fulfilled" ? allRuleAttempts.value : []
  const safeWeeklyMbe =
    weeklyMbeAttempts.status === "fulfilled" ? weeklyMbeAttempts.value : []
  const safeWeeklyRules =
    weeklyRuleAttempts.status === "fulfilled" ? weeklyRuleAttempts.value : []
  const safeWeakRuleCount =
    weakRuleCount.status === "fulfilled"
      ? countWeakLearningRows(weakRuleCount.value)
      : 0
  const safeSpacedReviews =
    spacedReviews.status === "fulfilled" ? spacedReviews.value : 0

  const activityDateResults = await Promise.allSettled([
    prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    }),

    prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    }),
  ])

  const ruleActivityDates =
    activityDateResults[0].status === "fulfilled"
      ? activityDateResults[0].value
          .map((row) => row.created_at)
          .filter((date): date is Date => date instanceof Date)
      : []

  const mbeActivityDates =
    activityDateResults[1].status === "fulfilled"
      ? activityDateResults[1].value
          .map((row) => row.created_at)
          .filter((date): date is Date => date instanceof Date)
      : []

  const {
    currentStreak,
    bestStreak,
    activitySet,
  } = buildCurrentAndBestStreak([...ruleActivityDates, ...mbeActivityDates])

  const streakDays: Array<{ status: DayStatus }> = []

  for (let i = 6; i >= 0; i--) {
    const date = startOfDay(new Date())
    date.setDate(date.getDate() - i)

    if (activitySet.has(dayKey(date))) {
      streakDays.push({ status: "fire" })
    } else if (date < startOfDay(new Date())) {
      streakDays.push({ status: "ice" })
    } else {
      streakDays.push({ status: "empty" })
    }
  }

  const allMbeCorrect = safeAllMbe.filter((attempt) => attempt.is_correct).length

  const userMBE = calculateAccuracy(allMbeCorrect, safeAllMbe.length)
  const userBLL = calculateLearningReadiness(safeAllRules)

  const comparisonMetrics = includeStateComparison
    ? await getStateComparisonMetrics(userId, requestedState)
    : {
        stateMBEAvg: 0,
        stateBLLAvg: 0,
        topMBE: 0,
        topBLL: 0,
      }

  return {
    todayMBE: safeTodayMbe.length,
    todayBLL: safeTodayRules.length,
    goalMBE: 60,
    goalBLL: 20,
    userMBE,
    userBLL,
    stateMBEAvg: comparisonMetrics.stateMBEAvg,
    stateBLLAvg: comparisonMetrics.stateBLLAvg,
    topMBE: Math.max(userMBE, comparisonMetrics.topMBE),
    topBLL: Math.max(userBLL, comparisonMetrics.topBLL),
    spacedReviewsDue: safeSpacedReviews,
    weeklyStudyTimeHours: Number(
      (((safeWeeklyMbe.length + safeWeeklyRules.length) * 1.5) / 60).toFixed(1)
    ),
    weeklyRulesDone: safeWeeklyRules.length,
    weeklySessions: Math.max(
      0,
      Math.ceil((safeWeeklyMbe.length + safeWeeklyRules.length) / 25)
    ),
    weeklyWeakAreas: safeWeakRuleCount,
    streak: currentStreak,
    bestStreak,
    streakDays,
  }
}


type StateComparisonMetrics = {
  stateMBEAvg: number
  stateBLLAvg: number
  topMBE: number
  topBLL: number
}

function percentFromParts(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

async function getStateComparisonMetrics(
  userId: string,
  requestedState?: string | null
): Promise<StateComparisonMetrics> {
  const profile = await prisma.profiles.findUnique({
    where: {
      id: userId,
    },
    select: {
      jurisdiction: true,
    },
  })

  const jurisdiction =
    requestedState?.trim() || profile?.jurisdiction?.trim() || null

  if (!jurisdiction) {
    return {
      stateMBEAvg: 0,
      stateBLLAvg: 0,
      topMBE: 0,
      topBLL: 0,
    }
  }

  const stateProfiles = await prisma.profiles.findMany({
    where: {
      jurisdiction,
      id: {
        not: userId,
      },
    },
    select: {
      id: true,
    },
  })

  const stateUserIds = stateProfiles.map((profile) => profile.id)

  if (stateUserIds.length === 0) {
    return {
      stateMBEAvg: 0,
      stateBLLAvg: 0,
      topMBE: 0,
      topBLL: 0,
    }
  }

  const [stateMbeAttempts, stateRuleProgress] = await Promise.all([
    prisma.user_mbe_attempts.findMany({
      where: {
        user_id: {
          in: stateUserIds,
        },
      },
      select: {
        user_id: true,
        is_correct: true,
      },
    }),

    prisma.user_rule_progress.findMany({
      where: {
        user_id: {
          in: stateUserIds,
        },
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

  const stateMBEAvg = percentFromParts(
    stateMbeCorrect,
    stateMbeAttempts.length
  )

  const stateBLLAvg = calculateLearningReadiness(stateRuleProgress)

  const mbeByUser: Record<string, { correct: number; total: number }> = {}

  for (const attempt of stateMbeAttempts) {
    if (!mbeByUser[attempt.user_id]) {
      mbeByUser[attempt.user_id] = {
        correct: 0,
        total: 0,
      }
    }

    mbeByUser[attempt.user_id].total += 1

    if (attempt.is_correct) {
      mbeByUser[attempt.user_id].correct += 1
    }
  }

  let topMBE = 0

  for (const score of Object.values(mbeByUser)) {
    const accuracy = percentFromParts(score.correct, score.total)
    if (accuracy > topMBE) {
      topMBE = accuracy
    }
  }

  const bllByUser: Record<string, typeof stateRuleProgress> = {}

  for (const row of stateRuleProgress) {
    bllByUser[row.user_id] ??= []
    bllByUser[row.user_id].push(row)
  }

  let topBLL = 0

  for (const rows of Object.values(bllByUser)) {
    const readiness = calculateLearningReadiness(rows)
    if (readiness > topBLL) {
      topBLL = readiness
    }
  }

  return {
    stateMBEAvg,
    stateBLLAvg,
    topMBE,
    topBLL,
  }
}

async function getSubjectSummaries(userId: string): Promise<SubjectSummaries> {
  const [subjectsList, ruleUniverseResult, ruleProgress, mbeBySubject, mbeAttempts] =
    await Promise.allSettled([
      prisma.subjects.findMany({
        select: {
          id: true,
          name: true,
        },
      }),

      getApplicableRuleUniverseForUser(userId),

      prisma.user_rule_progress.findMany({
        where: {
          user_id: userId,
          rules: {
            is_active: true,
          },
        },
        select: {
          rule_id: true,
          ...LEARNING_PROGRESS_SELECT,
          rules: {
            select: {
              subject_id: true,
              subjects: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.mBEQuestion.groupBy({
        by: ["subject_id"],
        _count: {
          id: true,
        },
      }),

      prisma.user_mbe_attempts.findMany({
        where: {
          user_id: userId,
        },
        select: {
          is_correct: true,
          mbe_question: {
            select: {
              subject_id: true,
              subjects: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ])

  const safeSubjectsList =
    subjectsList.status === "fulfilled" ? subjectsList.value : []
  const safeApplicableRules =
    ruleUniverseResult.status === "fulfilled" ? ruleUniverseResult.value.rules : []
  const canonicalRuleIds = new Set(safeApplicableRules.map((rule) => rule.id))
  const safeRuleProgress =
    ruleProgress.status === "fulfilled" ? ruleProgress.value : []
  const safeMbeBySubject =
    mbeBySubject.status === "fulfilled" ? mbeBySubject.value : []
  const safeMbeAttempts =
    mbeAttempts.status === "fulfilled" ? mbeAttempts.value : []

  const subjectNameById = new Map<string, string>()

  for (const subject of safeSubjectsList) {
    subjectNameById.set(subject.id, subject.name)
  }

  const bllTotalBySubjectName = new Map<string, number>()

  for (const rule of safeApplicableRules) {
    const subjectName =
      subjectNameById.get(rule.subjectId) || rule.subjectName || "Unknown"
    bllTotalBySubjectName.set(
      subjectName,
      (bllTotalBySubjectName.get(subjectName) ?? 0) + 1
    )
  }

  const bllMap = new Map<
    string,
    {
      name: string
      completed: number
      total: number
      correct: number
      attempts: number
      masterySum: number
    }
  >()

  for (const row of safeRuleProgress) {
    if (!canonicalRuleIds.has(row.rule_id)) continue
    const subjectName = row.rules?.subjects?.name || "Unknown"
    const current =
      bllMap.get(subjectName) ||
      {
        name: subjectName,
        completed: 0,
        total: bllTotalBySubjectName.get(subjectName) ?? 0,
        correct: 0,
        attempts: 0,
        masterySum: 0,
      }

    const progress = resolveLearningProgress(row)

    current.completed += progress.attempts > 0 ? 1 : 0
    current.correct += Number(row.correct_count ?? 0)
    current.attempts += progress.attempts
    current.masterySum += progress.mastery

    bllMap.set(subjectName, current)
  }

  for (const [subjectName, total] of bllTotalBySubjectName.entries()) {
    if (!bllMap.has(subjectName)) {
      bllMap.set(subjectName, {
        name: subjectName,
        completed: 0,
        total,
        correct: 0,
        attempts: 0,
        masterySum: 0,
      })
    }
  }

  const subjects = Array.from(bllMap.values())
    .filter((row) => row.total > 0)
    .map((row) => {
      const accuracy =
        row.completed === 0
          ? 0
          : Math.round(row.masterySum / Math.max(row.completed, 1))

      const derived = buildLevelAndProgress(row.completed, accuracy)

      return {
        name: row.name,
        accuracy,
        completed: row.completed,
        total: row.total,
        level: derived.level,
        progressWidth: derived.progressWidth,
      }
    })

  const mbeTotalBySubjectName = new Map<string, number>()

  for (const row of safeMbeBySubject) {
    const subjectName =
      row.subject_id && subjectNameById.has(row.subject_id)
        ? subjectNameById.get(row.subject_id) || "Unknown"
        : "Unknown"

    mbeTotalBySubjectName.set(subjectName, Number(row._count?.id ?? 0))
  }

  const mbeMap = new Map<
    string,
    {
      name: string
      completed: number
      total: number
      correct: number
    }
  >()

  for (const row of safeMbeAttempts) {
    const subjectName = row.mbe_question?.subjects?.name || "Unknown"
    const current =
      mbeMap.get(subjectName) ||
      {
        name: subjectName,
        completed: 0,
        total: mbeTotalBySubjectName.get(subjectName) ?? 0,
        correct: 0,
      }

    current.completed += 1

    if (row.is_correct) {
      current.correct += 1
    }

    mbeMap.set(subjectName, current)
  }

  for (const [subjectName, total] of mbeTotalBySubjectName.entries()) {
    if (!mbeMap.has(subjectName)) {
      mbeMap.set(subjectName, {
        name: subjectName,
        completed: 0,
        total,
        correct: 0,
      })
    }
  }

  const mbeSubjects = Array.from(mbeMap.values()).map((row) => {
    const accuracy = calculateAccuracy(row.correct, row.completed)
    const derived = buildLevelAndProgress(row.completed, accuracy)

    return {
      name: row.name,
      accuracy,
      completed: row.completed,
      total: row.total,
      level: derived.level,
      progressWidth: derived.progressWidth,
    }
  })

  return {
    subjects,
    mbeSubjects,
    diagnostics: {
      subjectsOk: subjectsList.status === "fulfilled",
      rulesBySubjectOk: ruleUniverseResult.status === "fulfilled",
      ruleProgressOk: ruleProgress.status === "fulfilled",
      mbeBySubjectOk: mbeBySubject.status === "fulfilled",
      mbeAttemptsOk: mbeAttempts.status === "fulfilled",
    },
  }
}

async function getWeakAreasSummary(userId: string): Promise<WeakAreasSummary> {
  const stats = await prisma.user_rule_progress.findMany({
    where: {
      user_id: userId,
      attempts: {
        gte: 1,
      },
    },
    select: {
      rule_id: true,
      ...LEARNING_PROGRESS_SELECT,
      updated_at: true,
      created_at: true,
      rules: {
        select: {
          title: true,
          subjects: {
            select: {
              name: true,
            },
          },
          topics: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        updated_at: "desc",
      },
      {
        created_at: "desc",
      },
    ],
  })

  const weakAreas = stats
    .map((row) => {
      const progress = resolveLearningProgress(row)

      return {
        id: row.rule_id,
        ruleId: row.rule_id,
        subject: row.rules?.subjects?.name || "Unknown",
        topic: row.rules?.topics?.name || "",
        rule: row.rules?.title || "Untitled",
        title: row.rules?.title || "Untitled",
        accuracy: progress.accuracy,
        attempts: progress.attempts,
        needsPractice: progress.isWeak,
        mastery: progress.mastery,
        updatedAt: row.updated_at ?? row.created_at ?? null,
      }
    })
    .filter((row) => row.needsPractice)
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy
      }

      return b.attempts - a.attempts
    })

  return {
    weakAreas: weakAreas.slice(0, 5).map(({ updatedAt, ...row }) => row),
    count: weakAreas.length,
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { searchParams } = new URL(req.url)
    const requestedState = searchParams.get("state")
    const includeStateComparison = searchParams.get("includeState") === "1"
    const userId = auth.user.id

    const summaryStart = Date.now()

    const timedSection = async <T,>(
      name: string,
      fn: () => Promise<T>
    ): Promise<T> => {
      const startedAt = Date.now()

      try {
        const result = await fn()
        console.log(`[dashboard-summary] ${name}: ${Date.now() - startedAt}ms`)
        return result
      } catch (error) {
        console.error(
          `[dashboard-summary] ${name} failed after ${Date.now() - startedAt}ms`,
          error
        )
        throw error
      }
    }

    const results = await Promise.allSettled([
      timedSection("profile", () => getProfile(userId)),
      timedSection("studyPlan", () => getStudyPlan(userId)),
      timedSection("dashboardMetrics", () =>
        getDashboardMetrics(userId, requestedState, includeStateComparison)
      ),
      timedSection("subjectSummaries", () => getSubjectSummaries(userId)),
      timedSection("weakAreas", () => getWeakAreasSummary(userId)),
    ])

    console.log(`[dashboard-summary] total: ${Date.now() - summaryStart}ms`)

    const debugErrors = results
      .map((result, index) => {
        const debugError = serializeDebugError(result, index)

        if (debugError) {
          console.error(
            `DASHBOARD SUMMARY SECTION ${index} ERROR:`,
            debugError
          )
        }

        return debugError
      })
      .filter(Boolean)

    const profileSection = jsonSection(results[0], null)
    const studyPlanSection = jsonSection(results[1], null)
    const metricsSection = jsonSection(results[2], fallbackDashboard)
    const subjectSection = jsonSection(results[3], fallbackSubjects)
    const weakAreasSection = jsonSection(results[4], fallbackWeakAreas)

    const selectedState = requestedState || profileSection.data?.jurisdiction || ""

    return NextResponse.json({
      ok: true,
      userId,
      selectedState,
      profile: profileSection.data,
      studyPlan: studyPlanSection.data,
      dashboard: metricsSection.data,
      subjects: subjectSection.data.subjects,
      mbeSubjects: subjectSection.data.mbeSubjects,
      weakAreas: weakAreasSection.data,
      diagnostics: {
        subjects: subjectSection.data.diagnostics,
      },
      debugErrors,
      sections: {
        profile: profileSection.ok,
        studyPlan: studyPlanSection.ok,
        dashboard: metricsSection.ok,
        subjects: subjectSection.ok,
        weakAreas: weakAreasSection.ok,
      },
    })
  } catch (error: any) {
    console.error("DASHBOARD SUMMARY ERROR:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load dashboard summary.",
        debugError: {
          message: error?.message || String(error),
          code: error?.code || null,
          meta: error?.meta || null,
          stack:
            process.env.NODE_ENV === "production"
              ? null
              : error?.stack || null,
        },
        profile: null,
        studyPlan: null,
        dashboard: fallbackDashboard,
        subjects: [],
        mbeSubjects: [],
        weakAreas: fallbackWeakAreas,
      },
      { status: 500 }
    )
  }
}
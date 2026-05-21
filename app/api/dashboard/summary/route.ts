// app/api/dashboard/summary/route.ts

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

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
  stateMBEAvg: 62,
  stateBLLAvg: 65,
  topMBE: 85,
  topBLL: 88,
  spacedReviewsDue: 0,
  weeklyStudyTimeHours: 0,
  weeklyRulesDone: 0,
  weeklySessions: 0,
  weeklyWeakAreas: 0,
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

async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
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

    prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        score: true,
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

    prisma.user_rule_progress.count({
      where: {
        user_id: userId,
        attempts: {
          gte: 1,
        },
        OR: [
          {
            needs_practice: true,
          },
          {
            mastery_level: {
              lt: 70,
            },
          },
        ],
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
    weakRuleCount.status === "fulfilled" ? weakRuleCount.value : 0
  const safeSpacedReviews =
    spacedReviews.status === "fulfilled" ? spacedReviews.value : 0

  const allMbeCorrect = safeAllMbe.filter((attempt) => attempt.is_correct).length

  const allRuleScoreSum = safeAllRules.reduce(
    (sum, attempt) => sum + Number(attempt.score ?? 0),
    0
  )

  const userMBE = calculateAccuracy(allMbeCorrect, safeAllMbe.length)

  const userBLL =
    safeAllRules.length === 0
      ? 0
      : Math.round(allRuleScoreSum / safeAllRules.length)

  return {
    todayMBE: safeTodayMbe.length,
    todayBLL: safeTodayRules.length,
    goalMBE: 60,
    goalBLL: 20,
    userMBE,
    userBLL,
    stateMBEAvg: 62,
    stateBLLAvg: 65,
    topMBE: Math.max(userMBE, 85),
    topBLL: Math.max(userBLL, 88),
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
  }
}

async function getSubjectSummaries(userId: string): Promise<SubjectSummaries> {
  const [subjectsList, rulesBySubject, ruleProgress, mbeBySubject, mbeAttempts] =
    await Promise.allSettled([
      prisma.subjects.findMany({
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.rules.groupBy({
        by: ["subject_id"],
        _count: {
          id: true,
        },
      }),

      prisma.user_rule_progress.findMany({
        where: {
          user_id: userId,
        },
        select: {
          rule_id: true,
          attempts: true,
          correct_count: true,
          mastery_level: true,
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
  const safeRulesBySubject =
    rulesBySubject.status === "fulfilled" ? rulesBySubject.value : []
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

  for (const row of safeRulesBySubject) {
    const subjectName =
      row.subject_id && subjectNameById.has(row.subject_id)
        ? subjectNameById.get(row.subject_id) || "Unknown"
        : "Unknown"

    bllTotalBySubjectName.set(subjectName, Number(row._count?.id ?? 0))
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

    const attempts = Number(row.attempts ?? 0)
    const correct = Number(row.correct_count ?? 0)
    const mastery = Number(row.mastery_level ?? calculateAccuracy(correct, attempts))

    current.completed += attempts > 0 ? 1 : 0
    current.correct += correct
    current.attempts += attempts
    current.masterySum += mastery

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

  const subjects = Array.from(bllMap.values()).map((row) => {
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
      rulesBySubjectOk: rulesBySubject.status === "fulfilled",
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
      attempts: true,
      correct_count: true,
      needs_practice: true,
      mastery_level: true,
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
    take: 5,
  })

  const weakAreas = stats
    .map((row) => {
      const attempts = Number(row.attempts ?? 0)
      const correctCount = Number(row.correct_count ?? 0)
      const accuracy = calculateAccuracy(correctCount, attempts)
      const masteryLevel = Number(row.mastery_level ?? accuracy)

      return {
        id: row.rule_id,
        ruleId: row.rule_id,
        subject: row.rules?.subjects?.name || "Unknown",
        topic: row.rules?.topics?.name || "",
        rule: row.rules?.title || "Untitled",
        title: row.rules?.title || "Untitled",
        accuracy,
        attempts,
        needsPractice: !!row.needs_practice,
        mastery: masteryLevel,
      }
    })
    .filter((row) => row.needsPractice || row.accuracy < 70)

  return {
    weakAreas,
    count: weakAreas.length,
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { searchParams } = new URL(req.url)
    const requestedState = searchParams.get("state")
    const userId = auth.user.id

    const results = await Promise.allSettled([
      getProfile(userId),
      getStudyPlan(userId),
      getDashboardMetrics(userId),
      getSubjectSummaries(userId),
      getWeakAreasSummary(userId),
    ])

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
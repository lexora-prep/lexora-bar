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

type SubjectRow = {
  id: string
  name: string
  order_index: number | null
}

type CountBySubjectRow = {
  subject_id: string | null
  count: number | bigint | null
}

type BllSubjectProgressRow = {
  subject_id: string | null
  completed: number | bigint | null
  attempts: number | bigint | null
  correct: number | bigint | null
  mastery_sum: number | bigint | null
}

type MbeSubjectProgressRow = {
  subject_id: string | null
  completed: number | bigint | null
  correct: number | bigint | null
}

type DashboardRawMetricsRow = {
  today_bll: number | bigint | null
  today_mbe: number | bigint | null
  bll_attempts: number | bigint | null
  bll_correct: number | bigint | null
  mbe_total: number | bigint | null
  mbe_correct: number | bigint | null
  weekly_rule_attempts: number | bigint | null
  weekly_study_seconds: number | bigint | null
  weekly_study_sessions: number | bigint | null
  spaced_reviews_due: number | bigint | null
  weak_areas_count: number | bigint | null
}

type ActivityDateRow = {
  created_at: Date | string | null
}

const profileSelect = {
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
} as const

function toNumber(value: number | bigint | string | null | undefined) {
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
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

function valueOrFallback<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value
  return fallback
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
    select: profileSelect,
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
    select: profileSelect,
  })
}

async function getSubjectAnalytics(userId: string): Promise<SubjectAnalyticsResult> {
  try {
    const results = await Promise.allSettled([
      prisma.subjects.findMany({
        select: {
          id: true,
          name: true,
          order_index: true,
        },
        orderBy: {
          order_index: "asc",
        },
      }),

      prisma.$queryRaw<CountBySubjectRow[]>`
        SELECT
          subject_id,
          COUNT(*)::int AS count
        FROM rules
        WHERE is_active = true
        GROUP BY subject_id
      `,

      prisma.$queryRaw<BllSubjectProgressRow[]>`
        SELECT
          r.subject_id,
          COUNT(*) FILTER (WHERE COALESCE(urp.attempts, 0) > 0)::int AS completed,
          COALESCE(SUM(urp.attempts), 0)::int AS attempts,
          COALESCE(SUM(urp.correct_count), 0)::int AS correct,
          COALESCE(
            SUM(
              COALESCE(
                urp.mastery_level,
                CASE
                  WHEN COALESCE(urp.attempts, 0) > 0
                    THEN ROUND((COALESCE(urp.correct_count, 0)::numeric / NULLIF(urp.attempts, 0)) * 100)
                  ELSE 0
                END
              )
            ),
            0
          )::int AS mastery_sum
        FROM user_rule_progress urp
        INNER JOIN rules r ON r.id = urp.rule_id
        WHERE urp.user_id = ${userId}
        GROUP BY r.subject_id
      `,

      prisma.$queryRaw<CountBySubjectRow[]>`
        SELECT
          subject_id,
          COUNT(*)::int AS count
        FROM "MBEQuestion"
        WHERE is_active = true
        GROUP BY subject_id
      `,

      prisma.$queryRaw<MbeSubjectProgressRow[]>`
        SELECT
          q.subject_id,
          COUNT(*)::int AS completed,
          COUNT(*) FILTER (WHERE uma.is_correct = true)::int AS correct
        FROM user_mbe_attempts uma
        INNER JOIN "MBEQuestion" q ON q.id = uma.question_id
        WHERE uma.user_id = ${userId}
        GROUP BY q.subject_id
      `,
    ])

    const subjects = valueOrFallback(results[0], []) as SubjectRow[]
    const activeRuleCounts = valueOrFallback(results[1], []) as CountBySubjectRow[]
    const userRuleProgress = valueOrFallback(results[2], []) as BllSubjectProgressRow[]
    const activeMbeQuestionCounts = valueOrFallback(results[3], []) as CountBySubjectRow[]
    const userMbeProgress = valueOrFallback(results[4], []) as MbeSubjectProgressRow[]

    const rulesTotalBySubjectId = new Map<string, number>()

    for (const row of activeRuleCounts) {
      if (row.subject_id) {
        rulesTotalBySubjectId.set(row.subject_id, toNumber(row.count))
      }
    }

    const mbeTotalBySubjectId = new Map<string, number>()

    for (const row of activeMbeQuestionCounts) {
      if (row.subject_id) {
        mbeTotalBySubjectId.set(row.subject_id, toNumber(row.count))
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
      if (!row.subject_id) continue

      bllAgg.set(row.subject_id, {
        completed: toNumber(row.completed),
        attempts: toNumber(row.attempts),
        correct: toNumber(row.correct),
        masterySum: toNumber(row.mastery_sum),
      })
    }

    const mbeAgg = new Map<
      string,
      {
        completed: number
        correct: number
      }
    >()

    for (const row of userMbeProgress) {
      if (!row.subject_id) continue

      mbeAgg.set(row.subject_id, {
        completed: toNumber(row.completed),
        correct: toNumber(row.correct),
      })
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
  } catch (err) {
    console.error("DASHBOARD BATCH SUBJECT ANALYTICS ERROR:", err)
    return getEmptySubjectAnalytics()
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

  const streakLookbackStart = startOfDay(new Date(now))
  streakLookbackStart.setDate(streakLookbackStart.getDate() - 365)

  try {
    const results = await Promise.allSettled([
      prisma.$queryRaw<DashboardRawMetricsRow[]>`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM user_rule_attempts
            WHERE user_id = ${userId}
              AND created_at >= ${today}
              AND created_at <= ${todayEnd}
          ) AS today_bll,

          (
            SELECT COUNT(*)::int
            FROM user_mbe_attempts
            WHERE user_id = ${userId}
              AND created_at >= ${today}
              AND created_at <= ${todayEnd}
          ) AS today_mbe,

          (
            SELECT COALESCE(SUM(attempts), 0)::int
            FROM user_rule_progress
            WHERE user_id = ${userId}
          ) AS bll_attempts,

          (
            SELECT COALESCE(SUM(correct_count), 0)::int
            FROM user_rule_progress
            WHERE user_id = ${userId}
          ) AS bll_correct,

          (
            SELECT COUNT(*)::int
            FROM user_mbe_attempts
            WHERE user_id = ${userId}
          ) AS mbe_total,

          (
            SELECT COUNT(*)::int
            FROM user_mbe_attempts
            WHERE user_id = ${userId}
              AND is_correct = true
          ) AS mbe_correct,

          (
            SELECT COUNT(*)::int
            FROM user_rule_attempts
            WHERE user_id = ${userId}
              AND created_at >= ${weekStart}
              AND created_at <= ${todayEnd}
          ) AS weekly_rule_attempts,

          (
            SELECT COALESCE(SUM("durationSeconds"), 0)::int
            FROM "StudySession"
            WHERE "userId" = ${userId}
              AND "startedAt" >= ${weekStart}
              AND "startedAt" <= ${todayEnd}
          ) AS weekly_study_seconds,

          (
            SELECT COUNT(*)::int
            FROM "StudySession"
            WHERE "userId" = ${userId}
              AND "startedAt" >= ${weekStart}
              AND "startedAt" <= ${todayEnd}
          ) AS weekly_study_sessions,

          (
            SELECT COUNT(*)::int
            FROM user_rule_progress
            WHERE user_id = ${userId}
              AND next_review_at <= ${todayEnd}
          ) AS spaced_reviews_due,

          (
            SELECT COUNT(*)::int
            FROM user_rule_progress
            WHERE user_id = ${userId}
              AND (
                needs_practice = true
                OR (
                  COALESCE(attempts, 0) >= 3
                  AND ROUND((COALESCE(correct_count, 0)::numeric / NULLIF(attempts, 0)) * 100) < 70
                )
              )
          ) AS weak_areas_count
      `,

      prisma.$queryRaw<ActivityDateRow[]>`
        SELECT created_at
        FROM (
          SELECT created_at
          FROM user_rule_attempts
          WHERE user_id = ${userId}
            AND created_at >= ${streakLookbackStart}
            AND created_at <= ${todayEnd}

          UNION ALL

          SELECT created_at
          FROM user_mbe_attempts
          WHERE user_id = ${userId}
            AND created_at >= ${streakLookbackStart}
            AND created_at <= ${todayEnd}
        ) activity
        WHERE created_at IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1000
      `,
    ])

    const metricRows = valueOrFallback(results[0], []) as DashboardRawMetricsRow[]
    const metricRow = metricRows[0] ?? null
    const activityRows = valueOrFallback(results[1], []) as ActivityDateRow[]

    const todayBLL = toNumber(metricRow?.today_bll)
    const todayMBE = toNumber(metricRow?.today_mbe)
    const bllAttempts = toNumber(metricRow?.bll_attempts)
    const bllCorrect = toNumber(metricRow?.bll_correct)
    const mbeTotal = toNumber(metricRow?.mbe_total)
    const mbeCorrect = toNumber(metricRow?.mbe_correct)
    const weeklyRuleAttempts = toNumber(metricRow?.weekly_rule_attempts)
    const weeklyStudySeconds = toNumber(metricRow?.weekly_study_seconds)
    const weeklyStudySessionsCount = toNumber(metricRow?.weekly_study_sessions)
    const spacedReviewsDue = toNumber(metricRow?.spaced_reviews_due)
    const weakAreasCount = toNumber(metricRow?.weak_areas_count)

    const activityDates = activityRows
      .map((row) => {
        if (row.created_at instanceof Date) return row.created_at

        if (typeof row.created_at === "string") {
          const parsed = new Date(row.created_at)
          return Number.isNaN(parsed.getTime()) ? null : parsed
        }

        return null
      })
      .filter((date): date is Date => date instanceof Date)

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
      weeklyStudyTimeHours: Number((weeklyStudySeconds / 3600).toFixed(1)),
      weeklyRulesDone: weeklyRuleAttempts,
      weeklySessions: weeklyStudySessionsCount,
      weeklyWeakAreas: weakAreasCount,
      weakAreasCount,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      streakDays: streak.streakDays,
      selectedState: profileState || "",
    }
  } catch (err) {
    console.error("DASHBOARD BATCH METRICS ERROR:", err)
    return getEmptyDashboardMetrics(profileState)
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now()

  function timing(label: string) {
    console.log(`[DASHBOARD BATCH TIMING] ${label}: ${Date.now() - startedAt}ms`)
  }

  try {
    timing("request start")

    const auth = await getAuthorizedUser()
    timing("auth complete")

    if (auth.error || !auth.user) return auth.error

    const user = auth.user
    const profile = await getOrCreateProfile(user)
    timing("profile complete")

    const url = new URL(request.url)
    const requestedState = url.searchParams.get("state")?.trim() || null

    const savedProfileState =
      typeof profile.jurisdiction === "string" && profile.jurisdiction.trim()
        ? profile.jurisdiction.trim()
        : null

    const profileState = requestedState || savedProfileState

    timing("before parallel dashboard queries")

    const [studyPlanResult, subjectAnalyticsResult, dashboardMetricsResult] =
      await Promise.allSettled([
        prisma.studyPlan.findUnique({
          where: {
            userId: user.id,
          },
        }),
        getSubjectAnalytics(user.id),
        getDashboardMetrics(user.id, profileState),
      ])

    timing("parallel dashboard queries complete")

    const studyPlan = valueOrFallback(studyPlanResult, null)
    const subjectAnalytics = valueOrFallback(
      subjectAnalyticsResult,
      getEmptySubjectAnalytics()
    )
    const dashboardMetrics = valueOrFallback(
      dashboardMetricsResult,
      getEmptyDashboardMetrics(profileState)
    )

    timing("fallback normalization complete")

    const response = NextResponse.json({
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

    timing("response ready")

    return response
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
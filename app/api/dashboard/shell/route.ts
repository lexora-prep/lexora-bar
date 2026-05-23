import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

type DayStatus = "fire" | "ice" | "none"

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
  const aStart = startOfDay(a).getTime()
  const bStart = startOfDay(b).getTime()
  return Math.round((aStart - bStart) / (1000 * 60 * 60 * 24))
}

function buildFallbackStreakDays() {
  return Array.from({ length: 7 }, () => ({ status: "none" as DayStatus }))
}

function buildStreak(activityDates: Date[]) {
  const uniqueSorted = Array.from(
    new Set(
      activityDates
        .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
        .map((date) => dayKey(date))
    )
  )
    .map((key) => new Date(key))
    .sort((a, b) => a.getTime() - b.getTime())

  if (uniqueSorted.length === 0) {
    return {
      studyStreak: 0,
      streakDays: buildFallbackStreakDays(),
    }
  }

  const activitySet = new Set(uniqueSorted.map((date) => dayKey(date)))

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
    const previous = new Date(cursor)
    previous.setDate(previous.getDate() - 1)
    cursor = previous
  }

  const streakDays = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - index))

    return {
      status: activitySet.has(dayKey(d))
        ? ("fire" as DayStatus)
        : ("none" as DayStatus),
    }
  })

  return {
    studyStreak: currentStreak,
    streakDays,
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

export async function GET() {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const user = auth.user
    const now = new Date()
    const todayEnd = endOfDay(now)

    const lookbackStart = startOfDay(new Date(now))
    lookbackStart.setDate(lookbackStart.getDate() - 60)

    let profile: {
      id: string
      email: string | null
      full_name: string | null
      mbe_access: boolean | null
    } | null = null

    let ruleAttemptDates: Array<{ created_at: Date | null }> = []
    let mbeAttemptDates: Array<{ created_at: Date | null }> = []
    let studyPlan: { examDate: Date | null } | null = null
    let weakAreasCount = 0

    try {
      profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          full_name: true,
          mbe_access: true,
        },
      })
    } catch (err) {
      console.error("DASHBOARD SHELL PROFILE ERROR:", err)
    }

    try {
      studyPlan = await prisma.studyPlan.findUnique({
        where: { userId: user.id },
        select: {
          examDate: true,
        },
      })
    } catch (err) {
      console.error("DASHBOARD SHELL STUDY PLAN ERROR:", err)
    }

    try {
      weakAreasCount = await prisma.user_rule_progress.count({
        where: {
          user_id: user.id,
          needs_practice: true,
        },
      })
    } catch (err) {
      console.error("DASHBOARD SHELL WEAK AREAS ERROR:", err)
    }

    try {
      ruleAttemptDates = await prisma.user_rule_attempts.findMany({
        where: {
          user_id: user.id,
          created_at: {
            gte: lookbackStart,
            lte: todayEnd,
          },
        },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 200,
      })
    } catch (err) {
      console.error("DASHBOARD SHELL RULE ATTEMPT DATES ERROR:", err)
    }

    try {
      mbeAttemptDates = await prisma.user_mbe_attempts.findMany({
        where: {
          user_id: user.id,
          created_at: {
            gte: lookbackStart,
            lte: todayEnd,
          },
        },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 200,
      })
    } catch (err) {
      console.error("DASHBOARD SHELL MBE ATTEMPT DATES ERROR:", err)
    }

    const activityDates = [
      ...ruleAttemptDates
        .map((row) => row.created_at)
        .filter((date): date is Date => date instanceof Date),
      ...mbeAttemptDates
        .map((row) => row.created_at)
        .filter((date): date is Date => date instanceof Date),
    ]

    const streak = buildStreak(activityDates)

    let daysLeft: number | null = null

    if (studyPlan?.examDate) {
      const exam = startOfDay(studyPlan.examDate)
      const today = startOfDay(new Date())
      const diff = daysBetween(exam, today)
      daysLeft = diff >= 0 ? diff : 0
    }

    return NextResponse.json({
      userName:
        profile?.full_name?.trim() ||
        profile?.email?.trim() ||
        user.email ||
        "User",
      studyStreak: streak.studyStreak,
      streakDays: streak.streakDays,
      mbeAccess: !!profile?.mbe_access,
      weakAreasCount,
      daysLeft,
      hasStudyPlan: !!studyPlan?.examDate,
    })
  } catch (error: any) {
    console.error("DASHBOARD SHELL ERROR:", error)

    return NextResponse.json(
      {
        error: "Failed to load dashboard shell.",
        message: error?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
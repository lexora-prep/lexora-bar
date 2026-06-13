import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import {
  countWeakLearningRows,
  LEARNING_PROGRESS_SELECT,
} from "@/lib/learning/analytics"

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
  const aStart = startOfDay(a).getTime()
  const bStart = startOfDay(b).getTime()

  return Math.round((aStart - bStart) / (1000 * 60 * 60 * 24))
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

  const activitySet = new Set(uniqueSorted.map((date) => dayKey(date)))

  let currentStreak = 0

  if (uniqueSorted.length > 0) {
    const today = startOfDay(new Date())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

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
  }

  const today = startOfDay(new Date())

  const streakDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))

    const key = dayKey(date)
    const isToday = key === dayKey(today)

    let status: DayStatus = "empty"

    if (activitySet.has(key)) {
      status = "fire"
    } else if (!isToday) {
      status = "ice"
    } else {
      status = "empty"
    }

    return {
      date: key,
      status,
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

  return {
    user,
    error: null,
  }
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

    const [profile, ruleAttemptDates, mbeAttemptDates, studyPlan, weakAreasCount] =
      await Promise.all([
        prisma.profiles.findUnique({
          where: {
            id: user.id,
          },
          select: {
            id: true,
            email: true,
            full_name: true,
            mbe_access: true,
          },
        }),

        prisma.user_rule_attempts.findMany({
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
        }),

        prisma.user_mbe_attempts.findMany({
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
        }),

        prisma.studyPlan.findUnique({
          where: {
            userId: user.id,
          },
          select: {
            examDate: true,
          },
        }),

        prisma.user_rule_progress.findMany({
          where: {
            user_id: user.id,
            attempts: {
              gte: 1,
            },
          },
          select: {
            ...LEARNING_PROGRESS_SELECT,
          },
        }),
      ])

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

    return NextResponse.json(
      {
        userName:
          profile?.full_name?.trim() ||
          profile?.email?.trim() ||
          user.email ||
          "User",
        studyStreak: streak.studyStreak,
        streakDays: streak.streakDays,
        mbeAccess: !!profile?.mbe_access,
        weakAreasCount: countWeakLearningRows(weakAreasCount),
        daysLeft,
        hasStudyPlan: !!studyPlan?.examDate,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
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
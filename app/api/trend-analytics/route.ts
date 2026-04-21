import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type TrendRow = {
  date: string
  mbe: number
  bll: number
}

function normalizeDate(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function formatDay(date: Date) {
  return normalizeDate(date).toISOString().slice(0, 10)
}

function buildDateRange(start: Date, end: Date) {
  const days: string[] = []
  const cursor = normalizeDate(start)
  const endDate = normalizeDate(end)

  while (cursor <= endDate) {
    days.push(formatDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function getDateWindow(range: string, start?: string | null, end?: string | null) {
  const now = new Date()
  let startDate = normalizeDate(now)
  let endDate = endOfDay(now)

  if (start && end) {
    const parsedStart = new Date(start)
    const parsedEnd = new Date(end)

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return null
    }

    startDate = normalizeDate(parsedStart)
    endDate = endOfDay(parsedEnd)
    return startDate <= endDate ? { startDate, endDate } : null
  }

  if (range === "today") {
    startDate = normalizeDate(now)
    endDate = endOfDay(now)
  } else if (range === "7d") {
    startDate = normalizeDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  } else if (range === "14d") {
    startDate = normalizeDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13))
  } else if (range === "30d") {
    startDate = normalizeDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))
  } else if (range === "90d") {
    startDate = normalizeDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89))
  } else {
    startDate = new Date(0)
    endDate = endOfDay(now)
  }

  return { startDate, endDate }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json(
        { error: "missing userId", trend: [] },
        { status: 400 }
      )
    }

    const range = searchParams.get("range") ?? "30d"
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    const window = getDateWindow(range, start, end)
    if (!window) {
      return NextResponse.json({ trend: [] })
    }

    const { startDate, endDate } = window

    const [mbeAttempts, ruleAttempts] = await Promise.all([
      prisma.user_mbe_attempts.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          created_at: true,
          is_correct: true,
        },
      }),
      prisma.user_rule_attempts.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          created_at: true,
          score: true,
        },
      }),
    ])

    if (mbeAttempts.length === 0 && ruleAttempts.length === 0) {
      return NextResponse.json({ trend: [] })
    }

    let firstActivityDate: Date | null = null

    for (const attempt of mbeAttempts) {
      if (!attempt.created_at) continue
      const day = normalizeDate(attempt.created_at)
      if (!firstActivityDate || day < firstActivityDate) {
        firstActivityDate = day
      }
    }

    for (const attempt of ruleAttempts) {
      if (!attempt.created_at) continue
      const day = normalizeDate(attempt.created_at)
      if (!firstActivityDate || day < firstActivityDate) {
        firstActivityDate = day
      }
    }

    if (!firstActivityDate) {
      return NextResponse.json({ trend: [] })
    }

    const effectiveStartDate =
      firstActivityDate > normalizeDate(startDate)
        ? firstActivityDate
        : normalizeDate(startDate)

    const daysMap: Record<
      string,
      { mbeCorrect: number; mbeTotal: number; bllSum: number; bllTotal: number }
    > = {}

    for (const day of buildDateRange(effectiveStartDate, endDate)) {
      daysMap[day] = {
        mbeCorrect: 0,
        mbeTotal: 0,
        bllSum: 0,
        bllTotal: 0,
      }
    }

    for (const attempt of mbeAttempts) {
      if (!attempt.created_at) continue
      const day = formatDay(attempt.created_at)
      const bucket = daysMap[day]
      if (!bucket) continue

      bucket.mbeTotal += 1
      if (attempt.is_correct) {
        bucket.mbeCorrect += 1
      }
    }

    for (const attempt of ruleAttempts) {
      if (!attempt.created_at) continue
      const day = formatDay(attempt.created_at)
      const bucket = daysMap[day]
      if (!bucket) continue

      bucket.bllTotal += 1
      bucket.bllSum += Number(attempt.score ?? 0)
    }

    const trend: TrendRow[] = Object.entries(daysMap).map(([date, data]) => ({
      date,
      mbe:
        data.mbeTotal === 0
          ? 0
          : Math.round((data.mbeCorrect / data.mbeTotal) * 100),
      bll:
        data.bllTotal === 0
          ? 0
          : Math.round(data.bllSum / data.bllTotal),
    }))

    return NextResponse.json({ trend })
  } catch (error) {
    console.error("Trend analytics error:", error)
    return NextResponse.json({ trend: [] })
  }
}
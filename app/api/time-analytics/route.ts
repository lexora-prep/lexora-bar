import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

type SessionRow = {
  id: string
  mode: string
  startedAt: Date
  endedAt: Date | null
  durationSeconds: number | null
  mbeQuestions: number
  ruleAttempts: number
  flashcards: number
  correctAnswers: number
}

type RuleAttemptRow = {
  score: number
  created_at: Date | null
  training_mode: string | null
}

type DurationBucketDefinition = {
  key: string
  label: string
  minMinutes: number
  maxMinutes: number | null
}

const DURATION_BUCKETS: DurationBucketDefinition[] = [
  {
    key: "under-15",
    label: "Under 15 min",
    minMinutes: 0,
    maxMinutes: 15,
  },
  {
    key: "15-20",
    label: "15–20 min",
    minMinutes: 15,
    maxMinutes: 20,
  },
  {
    key: "20-25",
    label: "20–25 min",
    minMinutes: 20,
    maxMinutes: 25,
  },
  {
    key: "25-35",
    label: "25–35 min",
    minMinutes: 25,
    maxMinutes: 35,
  },
  {
    key: "35-45",
    label: "35–45 min",
    minMinutes: 35,
    maxMinutes: 45,
  },
  {
    key: "45-60",
    label: "45–60 min",
    minMinutes: 45,
    maxMinutes: 60,
  },
  {
    key: "60-plus",
    label: "60+ min",
    minMinutes: 60,
    maxMinutes: null,
  },
]

const EFFICIENCY_BUCKETS: DurationBucketDefinition[] = [
  {
    key: "under-20",
    label: "Under 20 min",
    minMinutes: 0,
    maxMinutes: 20,
  },
  {
    key: "20-35",
    label: "20–35 min",
    minMinutes: 20,
    maxMinutes: 35,
  },
  {
    key: "35-60",
    label: "35–60 min",
    minMinutes: 35,
    maxMinutes: 60,
  },
  {
    key: "60-plus",
    label: "60+ min",
    minMinutes: 60,
    maxMinutes: null,
  },
]

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function percentage(correct: number, total: number) {
  if (total <= 0) return null

  return Math.round(
    clamp((correct / total) * 100, 0, 100)
  )
}

function startOfLocalDay(date: Date, timezoneOffset: number) {
  const shifted = new Date(
    date.getTime() - timezoneOffset * 60_000
  )

  shifted.setUTCHours(0, 0, 0, 0)

  return new Date(
    shifted.getTime() + timezoneOffset * 60_000
  )
}

function endOfLocalDay(date: Date, timezoneOffset: number) {
  const start = startOfLocalDay(date, timezoneOffset)
  const end = new Date(start)

  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1)

  return end
}

function localDateString(
  date: Date,
  timezoneOffset: number
) {
  const shifted = new Date(
    date.getTime() - timezoneOffset * 60_000
  )

  return shifted.toISOString().slice(0, 10)
}

function parseLocalDate(
  value: string,
  timezoneOffset: number,
  useEndOfDay: boolean
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const utcValue =
    Date.UTC(
      year,
      month - 1,
      day,
      useEndOfDay ? 23 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 999 : 0
    ) +
    timezoneOffset * 60_000

  const parsed = new Date(utcValue)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}

function getDateWindow(params: {
  range: string
  start: string | null
  end: string | null
  timezoneOffset: number
}) {
  const {
    range,
    start,
    end,
    timezoneOffset,
  } = params

  const now = new Date()

  if (range === "custom" && start && end) {
    const startDate = parseLocalDate(
      start,
      timezoneOffset,
      false
    )

    const endDate = parseLocalDate(
      end,
      timezoneOffset,
      true
    )

    if (
      startDate &&
      endDate &&
      startDate <= endDate
    ) {
      return {
        startDate,
        endDate,
      }
    }
  }

  if (range === "all") {
    return {
      startDate: new Date(0),
      endDate: endOfLocalDay(
        now,
        timezoneOffset
      ),
    }
  }

  const dayCount =
    range === "today"
      ? 1
      : range === "7d"
        ? 7
        : range === "14d"
          ? 14
          : range === "90d"
            ? 90
            : 30

  const startCursor = new Date(now)

  startCursor.setUTCDate(
    startCursor.getUTCDate() - (dayCount - 1)
  )

  return {
    startDate: startOfLocalDay(
      startCursor,
      timezoneOffset
    ),
    endDate: endOfLocalDay(
      now,
      timezoneOffset
    ),
  }
}

function getSessionDurationSeconds(
  session: SessionRow
) {
  const storedDuration = Number(
    session.durationSeconds ?? 0
  )

  if (storedDuration > 0) {
    return storedDuration
  }

  if (session.endedAt) {
    return Math.max(
      0,
      Math.round(
        (session.endedAt.getTime() -
          session.startedAt.getTime()) /
          1000
      )
    )
  }

  return 0
}

function getScoredAttempts(session: SessionRow) {
  return Math.max(
    0,
    Number(session.ruleAttempts ?? 0) +
      Number(session.mbeQuestions ?? 0)
  )
}

function getSessionAccuracy(session: SessionRow) {
  const attempts = getScoredAttempts(session)

  if (attempts <= 0) return null

  return percentage(
    clamp(
      Number(session.correctAnswers ?? 0),
      0,
      attempts
    ),
    attempts
  )
}

function inBucket(
  minutes: number,
  bucket: DurationBucketDefinition
) {
  if (minutes < bucket.minMinutes) {
    return false
  }

  if (
    bucket.maxMinutes !== null &&
    minutes >= bucket.maxMinutes
  ) {
    return false
  }

  return true
}

function titleCaseMode(value: string) {
  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")

  if (!normalized) return "Other"

  return normalized
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ")
}

function buildBucketAnalytics(
  sessions: SessionRow[],
  definitions: DurationBucketDefinition[]
) {
  return definitions.map((bucket) => {
    const matchingSessions = sessions.filter(
      (session) => {
        const minutes =
          getSessionDurationSeconds(session) / 60

        return inBucket(minutes, bucket)
      }
    )

    const scoredSessions =
      matchingSessions.filter(
        (session) =>
          getSessionAccuracy(session) !== null
      )

    const totalCorrect = scoredSessions.reduce(
      (sum, session) =>
        sum +
        clamp(
          Number(session.correctAnswers ?? 0),
          0,
          getScoredAttempts(session)
        ),
      0
    )

    const totalScoredAttempts =
      scoredSessions.reduce(
        (sum, session) =>
          sum + getScoredAttempts(session),
        0
      )

    const averageDurationMinutes =
      matchingSessions.length > 0
        ? Math.round(
            matchingSessions.reduce(
              (sum, session) =>
                sum +
                getSessionDurationSeconds(
                  session
                ) /
                  60,
              0
            ) / matchingSessions.length
          )
        : null

    return {
      key: bucket.key,
      label: bucket.label,
      sessions: matchingSessions.length,
      scoredSessions: scoredSessions.length,
      accuracy: percentage(
        totalCorrect,
        totalScoredAttempts
      ),
      averageDurationMinutes,
    }
  })
}

function buildDailyStudySeries(
  sessions: SessionRow[],
  timezoneOffset: number
) {
  const map = new Map<
    string,
    {
      seconds: number
      sessions: number
    }
  >()

  for (const session of sessions) {
    const date = localDateString(
      session.startedAt,
      timezoneOffset
    )

    const current = map.get(date) ?? {
      seconds: 0,
      sessions: 0,
    }

    current.seconds +=
      getSessionDurationSeconds(session)

    current.sessions += 1

    map.set(date, current)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      seconds: value.seconds,
      sessions: value.sessions,
    }))
}

function buildBestDays(
  ruleAttempts: RuleAttemptRow[],
  timezoneOffset: number
) {
  const map = new Map<
    number,
    {
      scoreSum: number
      attempts: number
    }
  >()

  for (const attempt of ruleAttempts) {
    if (!attempt.created_at) continue

    const shifted = new Date(
      attempt.created_at.getTime() -
        timezoneOffset * 60_000
    )

    const dayIndex = shifted.getUTCDay()
    const current = map.get(dayIndex) ?? {
      scoreSum: 0,
      attempts: 0,
    }

    current.scoreSum += clamp(
      Number(attempt.score ?? 0),
      0,
      100
    )

    current.attempts += 1

    map.set(dayIndex, current)
  }

  return DAY_LABELS.map((label, dayIndex) => {
    const value = map.get(dayIndex)

    return {
      dayIndex,
      label,
      shortLabel: label.slice(0, 3),
      attempts: value?.attempts ?? 0,
      accuracy:
        value && value.attempts > 0
          ? Math.round(
              value.scoreSum /
                value.attempts
            )
          : null,
    }
  })
}

function getEfficiencyStatus(
  accuracy: number | null,
  bestAccuracy: number | null
) {
  if (accuracy === null) return "unavailable"

  if (
    bestAccuracy !== null &&
    accuracy === bestAccuracy
  ) {
    return "best"
  }

  if (accuracy >= 80) return "good"
  if (accuracy >= 60) return "average"

  return "low"
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }

    const { searchParams } = new URL(req.url)

    const range =
      searchParams.get("range") || "30d"

    const start = searchParams.get("start")
    const end = searchParams.get("end")

    const parsedTimezoneOffset = Number(
      searchParams.get("timezoneOffset") ?? 0
    )

    const timezoneOffset = clamp(
      Number.isFinite(parsedTimezoneOffset)
        ? parsedTimezoneOffset
        : 0,
      -840,
      840
    )

    const { startDate, endDate } =
      getDateWindow({
        range,
        start,
        end,
        timezoneOffset,
      })

    const [sessions, ruleAttempts] =
      await Promise.all([
        prisma.studySession.findMany({
          where: {
            userId: user.id,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            mode: true,
            startedAt: true,
            endedAt: true,
            durationSeconds: true,
            mbeQuestions: true,
            ruleAttempts: true,
            flashcards: true,
            correctAnswers: true,
          },
          orderBy: {
            startedAt: "asc",
          },
        }),

        prisma.user_rule_attempts.findMany({
          where: {
            user_id: user.id,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            score: true,
            created_at: true,
            training_mode: true,
          },
          orderBy: {
            created_at: "asc",
          },
        }),
      ])

    const typedSessions =
      sessions as SessionRow[]

    const typedRuleAttempts =
      ruleAttempts as RuleAttemptRow[]

    const totalSeconds = typedSessions.reduce(
      (sum, session) =>
        sum +
        getSessionDurationSeconds(session),
      0
    )

    const effectiveSessions =
      typedSessions.filter((session) => {
        const totalActivity =
          Number(session.ruleAttempts ?? 0) +
          Number(session.mbeQuestions ?? 0) +
          Number(session.flashcards ?? 0)

        return (
          totalActivity > 0 &&
          getSessionDurationSeconds(session) > 0
        )
      })

    const effectiveSeconds =
      effectiveSessions.reduce(
        (sum, session) =>
          sum +
          getSessionDurationSeconds(session),
        0
      )

    const scoredSessions =
      typedSessions.filter(
        (session) =>
          getSessionAccuracy(session) !== null
      )

    const totalCorrect =
      scoredSessions.reduce(
        (sum, session) =>
          sum +
          clamp(
            Number(
              session.correctAnswers ?? 0
            ),
            0,
            getScoredAttempts(session)
          ),
        0
      )

    const totalScoredAttempts =
      scoredSessions.reduce(
        (sum, session) =>
          sum + getScoredAttempts(session),
        0
      )

    const focusScore = percentage(
      totalCorrect,
      totalScoredAttempts
    )

    const averageSessionSeconds =
      typedSessions.length > 0
        ? Math.round(
            totalSeconds /
              typedSessions.length
          )
        : 0

    const sessionLength =
      buildBucketAnalytics(
        typedSessions,
        DURATION_BUCKETS
      )

    const efficiency =
      buildBucketAnalytics(
        typedSessions,
        EFFICIENCY_BUCKETS
      )

    const availableEfficiencies =
      efficiency
        .map((item) => item.accuracy)
        .filter(
          (value): value is number =>
            value !== null
        )

    const bestEfficiencyAccuracy =
      availableEfficiencies.length > 0
        ? Math.max(
            ...availableEfficiencies
          )
        : null

    const efficiencyWithStatus =
      efficiency.map((item) => ({
        ...item,
        status: getEfficiencyStatus(
          item.accuracy,
          bestEfficiencyAccuracy
        ),
      }))

    const focusTimeline =
      scoredSessions.map((session) => ({
        id: session.id,
        date: session.startedAt.toISOString(),
        dateLabel: localDateString(
          session.startedAt,
          timezoneOffset
        ),
        minutes: Math.max(
          1,
          Math.round(
            getSessionDurationSeconds(
              session
            ) / 60
          )
        ),
        score:
          getSessionAccuracy(session) ?? 0,
      }))

    const scatter = scoredSessions
      .map((session) => ({
        id: session.id,
        minutes: Math.max(
          1,
          Math.round(
            getSessionDurationSeconds(
              session
            ) / 60
          )
        ),
        accuracy:
          getSessionAccuracy(session) ?? 0,
        date: session.startedAt.toISOString(),
      }))
      .filter(
        (point) =>
          point.minutes > 0 &&
          Number.isFinite(point.accuracy)
      )

    const allocationMap = new Map<
      string,
      {
        seconds: number
        sessions: number
      }
    >()

    for (const session of typedSessions) {
      const mode =
        session.mode?.trim() || "other"

      const current =
        allocationMap.get(mode) ?? {
          seconds: 0,
          sessions: 0,
        }

      current.seconds +=
        getSessionDurationSeconds(session)

      current.sessions += 1

      allocationMap.set(mode, current)
    }

    const allocation = Array.from(
      allocationMap.entries()
    )
      .map(([mode, value]) => ({
        mode,
        label: titleCaseMode(mode),
        seconds: value.seconds,
        sessions: value.sessions,
        percentage:
          totalSeconds > 0
            ? Math.round(
                (value.seconds /
                  totalSeconds) *
                  100
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.seconds - a.seconds
      )

    const bestDays = buildBestDays(
      typedRuleAttempts,
      timezoneOffset
    )

    const bestSessionRange =
      sessionLength
        .filter(
          (item) =>
            item.accuracy !== null &&
            item.scoredSessions > 0
        )
        .sort((a, b) => {
          const accuracyDifference =
            Number(b.accuracy) -
            Number(a.accuracy)

          if (accuracyDifference !== 0) {
            return accuracyDifference
          }

          return (
            b.scoredSessions -
            a.scoredSessions
          )
        })[0] ?? null

    const bestDay =
      bestDays
        .filter(
          (day) =>
            day.accuracy !== null &&
            day.attempts > 0
        )
        .sort((a, b) => {
          const accuracyDifference =
            Number(b.accuracy) -
            Number(a.accuracy)

          if (accuracyDifference !== 0) {
            return accuracyDifference
          }

          return (
            b.attempts -
            a.attempts
          )
        })[0] ?? null

    const recommendedBlockMinutes =
      bestSessionRange
        ? bestSessionRange
            .averageDurationMinutes ??
          Math.round(
            (DURATION_BUCKETS.find(
              (bucket) =>
                bucket.key ===
                bestSessionRange.key
            )?.minMinutes ?? 25) +
              5
          )
        : null

    const activeDayCount = new Set(
      typedSessions.map((session) =>
        localDateString(
          session.startedAt,
          timezoneOffset
        )
      )
    ).size

    const averageDailyMinutes =
      activeDayCount > 0
        ? Math.round(
            totalSeconds /
              60 /
              activeDayCount
          )
        : 0

    const recommendedBlocks =
      recommendedBlockMinutes &&
      recommendedBlockMinutes > 0 &&
      averageDailyMinutes > 0
        ? Math.max(
            1,
            Math.round(
              averageDailyMinutes /
                recommendedBlockMinutes
            )
          )
        : null

    const recommendation =
      bestSessionRange &&
      recommendedBlockMinutes
        ? {
            bestRangeLabel:
              bestSessionRange.label,
            bestRangeAccuracy:
              bestSessionRange.accuracy,
            blockMinutes:
              recommendedBlockMinutes,
            blocksPerDay:
              recommendedBlocks,
            totalMinutesPerDay:
              recommendedBlocks
                ? recommendedBlocks *
                  recommendedBlockMinutes
                : recommendedBlockMinutes,
            bestDayLabel:
              bestDay?.label ?? null,
            bestDayAccuracy:
              bestDay?.accuracy ?? null,
            scoredSessions:
              scoredSessions.length,
          }
        : null

    return NextResponse.json(
      {
        range: {
          key: range,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },

        summary: {
          totalSeconds,
          effectiveSeconds,
          sessionCount:
            typedSessions.length,
          effectiveSessionCount:
            effectiveSessions.length,
          scoredSessionCount:
            scoredSessions.length,
          focusScore,
          averageSessionSeconds,
        },

        dailyStudy:
          buildDailyStudySeries(
            typedSessions,
            timezoneOffset
          ),

        sessionLength,
        focusTimeline,
        bestDays,
        scatter,
        allocation,
        efficiency:
          efficiencyWithStatus,
        recommendation,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error(
      "Time analytics error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load time analytics",
      },
      {
        status: 500,
      }
    )
  }
}

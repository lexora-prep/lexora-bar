import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"

type ModeKey = "typing" | "ordering" | "buzzwords" | "flashcards" | "other"

const MODE_LABELS: Record<ModeKey, string> = {
  typing: "Typing (Active Recall)",
  ordering: "Ordering",
  buzzwords: "Buzzwords",
  flashcards: "Flashcards",
  other: "Other",
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function round(value: number) {
  return Math.round(value)
}

function normalizeMode(value: unknown): ModeKey {
  const text = String(value ?? "").toLowerCase()

  if (text.includes("typ") || text.includes("recall") || text.includes("active")) return "typing"
  if (text.includes("order") || text.includes("reorder")) return "ordering"
  if (text.includes("buzz")) return "buzzwords"
  if (text.includes("flash")) return "flashcards"

  return "other"
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return null

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (hours <= 0) return `${minutes}m`
  if (minutes <= 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

function getStartDate(range: string | null) {
  const now = new Date()
  const days =
    range === "7d" || range === "last7" || range === "7" ? 7 :
    range === "90d" || range === "last90" || range === "90" ? 90 :
    range === "all" || range === "allTime" ? 3650 :
    30

  return {
    startDate: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    days,
  }
}

export async function GET(request: Request) {
  try {
    const auth = (await requireAuthenticatedUser()) as any
    const userId = auth?.id || auth?.userId || auth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const { startDate, days } = getStartDate(url.searchParams.get("range"))

    const attempts = await (prisma as any).user_rule_attempts.findMany({
      where: {
        user_id: userId,
        created_at: { gte: startDate },
      },
      select: {
        score: true,
        training_mode: true,
        training_context: true,
        recall_seconds: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 5000,
    })

    const sessions = await (prisma as any).studySession.findMany({
      where: {
        userId,
        startedAt: { gte: startDate },
      },
      select: {
        startedAt: true,
        durationSeconds: true,
        ruleAttempts: true,
        correctAnswers: true,
      },
      orderBy: { startedAt: "desc" },
      take: 1000,
    })

    const scoredAttempts = attempts.filter((attempt: any) =>
      Number.isFinite(Number(attempt.score))
    )

    const totalAttempts = attempts.length
    const totalScoredAttempts = scoredAttempts.length

    const modeCounts: Record<ModeKey, number> = {
      typing: 0,
      ordering: 0,
      buzzwords: 0,
      flashcards: 0,
      other: 0,
    }

    for (const attempt of attempts) {
      const mode = normalizeMode(attempt.training_mode || attempt.training_context)
      modeCounts[mode] += 1
    }

    const modeMix = (Object.keys(modeCounts) as ModeKey[]).map((key) => {
      const count = modeCounts[key]
      return {
        key,
        label: MODE_LABELS[key],
        count,
        percentage: totalAttempts > 0 ? round((count / totalAttempts) * 100) : 0,
      }
    })

    const topMode = [...modeMix].sort((a, b) => b.count - a.count)[0] ?? null

    const scoredSessions = sessions.filter((session: any) =>
      toNumber(session.durationSeconds) > 0 &&
      toNumber(session.ruleAttempts) > 0
    )

    const effectiveStudySeconds = scoredSessions.reduce(
      (sum: number, session: any) => sum + toNumber(session.durationSeconds),
      0
    )

    const activeDaySet = new Set(
      scoredSessions.map((session: any) =>
        new Date(session.startedAt).toISOString().slice(0, 10)
      )
    )

    const sessionBuckets = [
      { key: "under15", label: "Under 15 min", min: 0, max: 15 },
      { key: "15to25", label: "15–25 min", min: 15, max: 25 },
      { key: "26to35", label: "26–35 min", min: 26, max: 35 },
      { key: "36to50", label: "36–50 min", min: 36, max: 50 },
      { key: "over50", label: "Over 50 min", min: 51, max: 100000 },
    ].map((bucket) => {
      const matching = scoredSessions.filter((session: any) => {
        const minutes = toNumber(session.durationSeconds) / 60
        return minutes >= bucket.min && minutes <= bucket.max
      })

      const attemptsInBucket = matching.reduce(
        (sum: number, session: any) => sum + toNumber(session.ruleAttempts),
        0
      )

      const correctInBucket = matching.reduce(
        (sum: number, session: any) => sum + toNumber(session.correctAnswers),
        0
      )

      return {
        key: bucket.key,
        label: bucket.label,
        sessions: matching.length,
        attempts: attemptsInBucket,
        accuracy:
          attemptsInBucket > 0
            ? round((correctInBucket / attemptsInBucket) * 100)
            : null,
      }
    })

    const bestBucket =
      sessionBuckets
        .filter((bucket) => bucket.attempts > 0 && bucket.accuracy !== null)
        .sort((a, b) =>
          (b.accuracy ?? 0) - (a.accuracy ?? 0) ||
          b.attempts - a.attempts
        )[0] ?? null

    const averageAttemptScore =
      totalScoredAttempts > 0
        ? scoredAttempts.reduce((sum: number, attempt: any) => sum + toNumber(attempt.score), 0) / totalScoredAttempts
        : null

    const consistencyScore =
      days > 0
        ? Math.min(100, round((activeDaySet.size / Math.min(days, 30)) * 100))
        : null

    const focusScore =
      averageAttemptScore !== null && consistencyScore !== null
        ? round(averageAttemptScore * 0.75 + consistencyScore * 0.25)
        : null

    return NextResponse.json({
      rangeDays: days,
      totalAttempts,
      totalScoredAttempts,
      modeMix,
      topMode,
      bestSessionLengthLabel: bestBucket?.label ?? null,
      bestSessionAccuracy: bestBucket?.accuracy ?? null,
      effectiveStudySeconds,
      effectiveStudyLabel: formatDuration(effectiveStudySeconds),
      activeDays: activeDaySet.size,
      focusScore,
      focusScoreFormula: "Average scored recall weighted with active-day consistency.",
      sessionBuckets,
      hasEnoughBehaviorData: totalAttempts > 0,
      hasEnoughSessionData: scoredSessions.length > 0,
    })
  } catch (error) {
    console.error("LEARNING INSIGHTS METRICS ERROR:", error)
    return NextResponse.json(
      { error: "Learning insights metrics could not be loaded." },
      { status: 500 }
    )
  }
}

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type FeatureFlagRow = {
  key: string
  value: unknown
}

type AttemptGroupRow = {
  question_id: string | null
  _count: {
    id: number
  }
  _sum: {
    is_correct: number | null
  }
}

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
    if (normalized === "1") return true
    if (normalized === "0") return false
    if (normalized === "yes") return true
    if (normalized === "no") return false
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "enabled" in value
  ) {
    const enabled = (value as { enabled?: unknown }).enabled
    return readBoolean(enabled, fallback)
  }

  return fallback
}

async function getMBEFlags() {
  const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
    select "key", "value"
    from public.feature_flags
    where "key" in ('mbe_premium_enabled', 'mbe_public_visible')
  `

  const byKey = new Map(rows.map((row) => [row.key, row.value]))

  return {
    mbePremiumEnabled: readBoolean(byKey.get("mbe_premium_enabled"), false),
    mbePublicVisible: readBoolean(byKey.get("mbe_public_visible"), false),
  }
}

export async function GET(req: Request) {
  try {
    const flags = await getMBEFlags()

    if (!flags.mbePublicVisible || !flags.mbePremiumEnabled) {
      return NextResponse.json({ subjects: [] })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ subjects: [] })
    }

    const [subjects, questions, attemptGroups] = await Promise.all([
      prisma.subjects.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.mBEQuestion.findMany({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          subject_id: true,
        },
      }),
      prisma.user_mbe_attempts.groupBy({
        by: ["question_id"],
        where: {
          user_id: userId,
          question_id: {
            not: null,
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          is_correct: true,
        },
      }),
    ])

    const questionToSubject = new Map<string, string>()
    for (const question of questions) {
      questionToSubject.set(question.id, question.subject_id)
    }

    const statsBySubject = new Map<
      string,
      { answered: number; correct: number }
    >()

    for (const subject of subjects) {
      statsBySubject.set(subject.id, {
        answered: 0,
        correct: 0,
      })
    }

    for (const row of attemptGroups as AttemptGroupRow[]) {
      if (!row.question_id) continue

      const subjectId = questionToSubject.get(row.question_id)
      if (!subjectId) continue

      const current = statsBySubject.get(subjectId) ?? {
        answered: 0,
        correct: 0,
      }

      current.answered += row._count.id ?? 0
      current.correct += Number(row._sum.is_correct ?? 0)

      statsBySubject.set(subjectId, current)
    }

    const results = subjects.map((subject) => {
      const stats = statsBySubject.get(subject.id) ?? {
        answered: 0,
        correct: 0,
      }

      const accuracy =
        stats.answered === 0
          ? 0
          : Math.round((stats.correct / stats.answered) * 100)

      return {
        subject: subject.name,
        accuracy,
        answered: stats.answered,
      }
    })

    return NextResponse.json({
      subjects: results,
    })
  } catch (error) {
    console.error("MBE SUBJECT ANALYTICS ERROR:", error)

    return NextResponse.json({
      subjects: [],
    })
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type FeatureFlagRow = {
  key: string
  value: unknown
}

type QuestionCountRow = {
  subject_id: string | null
  topic_id: string | null
  _count: {
    id: number
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

export async function GET() {
  try {
    const flags = await getMBEFlags()

    if (!flags.mbePublicVisible || !flags.mbePremiumEnabled) {
      return NextResponse.json({
        success: false,
        error: "MBE Premium is coming soon",
        subjects: [],
      })
    }

    const [subjects, groupedCounts] = await Promise.all([
      prisma.subjects.findMany({
        include: {
          topics: {
            orderBy: {
              order_index: "asc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.mBEQuestion.groupBy({
        by: ["subject_id", "topic_id"],
        where: {
          is_active: true,
        },
        _count: {
          id: true,
        },
      }),
    ])

    const subjectCountMap = new Map<string, number>()
    const topicCountMap = new Map<string, number>()

    for (const row of groupedCounts as QuestionCountRow[]) {
      const count = row._count.id ?? 0

      if (row.subject_id) {
        subjectCountMap.set(
          row.subject_id,
          (subjectCountMap.get(row.subject_id) ?? 0) + count
        )
      }

      if (row.topic_id) {
        topicCountMap.set(row.topic_id, count)
      }
    }

    const result = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      questionCount: subjectCountMap.get(subject.id) ?? 0,
      topics: subject.topics.map((topic) => {
        const total = topicCountMap.get(topic.id) ?? 0

        return {
          id: topic.id,
          name: topic.name,
          questionCount: total,
          solvedCount: 0,
          correctCount: 0,
          remainingQuestions: total,
          accuracy: 0,
        }
      }),
    }))

    return NextResponse.json({
      success: true,
      subjects: result,
    })
  } catch (error) {
    console.error("SUBJECT TOPIC API ERROR:", error)

    return NextResponse.json({
      success: false,
      error: "Server error",
      subjects: [],
    })
  }
}
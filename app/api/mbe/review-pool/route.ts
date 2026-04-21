import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type FeatureFlagRow = {
  key: string
  value: unknown
}

type ReviewSource = "saved" | "missed" | "combined" | "weak"

type TopicCountRow = {
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

function isValidSource(source: string | null): source is ReviewSource {
  return (
    source === "saved" ||
    source === "missed" ||
    source === "combined" ||
    source === "weak"
  )
}

export async function GET(req: NextRequest) {
  try {
    const flags = await getMBEFlags()

    if (!flags.mbePublicVisible || !flags.mbePremiumEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "MBE Premium is coming soon",
          subjects: [],
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const source = searchParams.get("source")

    if (!isValidSource(source)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing source parameter",
          subjects: [],
        },
        { status: 400 }
      )
    }

    const [subjects, groupedCounts] = await Promise.all([
      prisma.subjects.findMany({
        include: {
          topics: {
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.mBEQuestion.groupBy({
        by: ["topic_id"],
        where: {
          is_active: true,
        },
        _count: {
          id: true,
        },
      }),
    ])

    const topicCountMap = new Map<string, number>()

    for (const row of groupedCounts as TopicCountRow[]) {
      if (row.topic_id) {
        topicCountMap.set(row.topic_id, row._count.id ?? 0)
      }
    }

    const normalizedSubjects = subjects
      .map((subject) => {
        const topics = subject.topics
          .map((topic) => ({
            id: topic.id,
            name: topic.name,
            subjectId: subject.id,
            questionCount: topicCountMap.get(topic.id) ?? 0,
          }))
          .filter((topic) => topic.questionCount > 0)

        return {
          id: subject.id,
          name: subject.name,
          questionCount: topics.reduce(
            (sum, topic) => sum + topic.questionCount,
            0
          ),
          topics,
        }
      })
      .filter((subject) => subject.questionCount > 0)

    return NextResponse.json({
      success: true,
      subjects: normalizedSubjects,
    })
  } catch (error) {
    console.error("REVIEW POOL ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load review pool",
        subjects: [],
      },
      { status: 500 }
    )
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type FeatureFlagRow = {
  key: string
  value: unknown
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const flags = await getMBEFlags()

    if (!flags.mbePublicVisible || !flags.mbePremiumEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "MBE Premium is coming soon",
          questions: [],
        },
        { status: 403 }
      )
    }

    const { sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing sessionId",
          questions: [],
        },
        { status: 400 }
      )
    }

    const session = await prisma.examSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        questions: {
          orderBy: {
            order_index: "asc",
          },
          include: {
            mbe_question: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Session not found",
          questions: [],
        },
        { status: 404 }
      )
    }

    const questions = session.questions
      .map((item) => item.mbe_question)
      .filter(Boolean)
      .map((q) => ({
        id: q!.id,
        title: q!.title,
        questionText: q!.question_text,
        answerA: q!.answer_a,
        answerB: q!.answer_b,
        answerC: q!.answer_c,
        answerD: q!.answer_d,
        correctAnswer: q!.correct_answer,
        explanation: q!.explanation,
        ruleText: q!.rule_text,
        subjectId: q!.subject_id,
        topicId: q!.topic_id,
        subject: null,
        topic: null,
      }))

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      mode: session.mode,
      startedAt: session.started_at,
      timeLimitSeconds: session.time_limit_seconds,
      questions,
    })
  } catch (error) {
    console.error("MBE SESSION GET ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        questions: [],
      },
      { status: 500 }
    )
  }
}
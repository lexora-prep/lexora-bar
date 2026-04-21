import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type IncomingSubject = {
  subjectId?: string
  name?: string
  topicIds?: string[]
}

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

export async function POST(req: Request) {
  try {
    const flags = await getMBEFlags()

    if (!flags.mbePublicVisible || !flags.mbePremiumEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "MBE Premium is coming soon",
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const rawSubjects: IncomingSubject[] = Array.isArray(body.subjects)
      ? body.subjects
      : []

    const rawReviewSelection: IncomingSubject[] = Array.isArray(body.reviewSelection)
      ? body.reviewSelection
      : []

    const requestedCount = Number(body.questionCount)

    const questionCount =
      Number.isFinite(requestedCount) &&
      requestedCount >= 1 &&
      requestedCount <= 100
        ? Math.floor(requestedCount)
        : 10

    const rawMode = typeof body.mode === "string" ? body.mode : "study"
    const mode =
      rawMode === "quiz"
        ? "QUIZ"
        : rawMode === "review"
          ? "REVIEW"
          : "STUDY"

    const rawTrack = typeof body.track === "string" ? body.track : "CLASSIC"
    const track = rawTrack === "NEXTGEN" ? "NEXTGEN" : "CLASSIC"

    const reviewSource =
      typeof body.reviewSource === "string" ? body.reviewSource : null

    const requestedSecondsPerQuestion = Number(body.secondsPerQuestion)

    const secondsPerQuestion =
      Number.isFinite(requestedSecondsPerQuestion) &&
      requestedSecondsPerQuestion > 0
        ? Math.floor(requestedSecondsPerQuestion)
        : null

    const userId = typeof body.userId === "string" ? body.userId : null

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userId",
        },
        { status: 400 }
      )
    }

    let questionPool: any[] = []

    if ((mode === "QUIZ" || mode === "REVIEW") && secondsPerQuestion === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Timer must be set for Quiz or Review mode",
        },
        { status: 400 }
      )
    }

    if (questionCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid question count",
        },
        { status: 400 }
      )
    }

    if (mode === "REVIEW") {
      if (rawReviewSelection.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No review subjects selected",
          },
          { status: 400 }
        )
      }

      const reviewFilters = rawReviewSelection
        .filter((s) => typeof s === "object" && typeof s.subjectId === "string")
        .map((s) => {
          const topicIds = Array.isArray(s.topicIds)
            ? s.topicIds.filter((id): id is string => typeof id === "string")
            : []

          if (topicIds.length > 0) {
            return {
              subject_id: s.subjectId!,
              topic_id: { in: topicIds },
            }
          }

          return {
            subject_id: s.subjectId!,
          }
        })

      if (reviewFilters.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid review selection",
          },
          { status: 400 }
        )
      }

      questionPool = await prisma.mBEQuestion.findMany({
        where: {
          OR: reviewFilters,
          track,
          is_active: true,
        },
      })

      if (questionPool.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No questions available for review source: ${reviewSource ?? "review"}`,
          },
          { status: 404 }
        )
      }
    } else {
      if (rawSubjects.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No subjects selected",
          },
          { status: 400 }
        )
      }

      const subjectFilters = rawSubjects
        .filter((s) => typeof s === "object" && typeof s.subjectId === "string")
        .map((s) => {
          const topicIds = Array.isArray(s.topicIds)
            ? s.topicIds.filter((id): id is string => typeof id === "string")
            : []

          if (topicIds.length > 0) {
            return {
              subject_id: s.subjectId!,
              topic_id: { in: topicIds },
            }
          }

          return {
            subject_id: s.subjectId!,
          }
        })

      if (subjectFilters.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid subject selection",
          },
          { status: 400 }
        )
      }

      questionPool = await prisma.mBEQuestion.findMany({
        where: {
          OR: subjectFilters,
          track,
          is_active: true,
        },
      })

      if (questionPool.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No questions available for the selected subjects/topics",
          },
          { status: 404 }
        )
      }
    }

    const shuffled = [...questionPool].sort(() => Math.random() - 0.5)

    const selectedQuestions = shuffled.slice(
      0,
      Math.min(questionCount, shuffled.length)
    )

    let timeLimitSeconds: number | null = null

    if (secondsPerQuestion !== null) {
      timeLimitSeconds = selectedQuestions.length * secondsPerQuestion
    }

    const session = await prisma.examSession.create({
      data: {
        user_id: userId,
        track,
        mode,
        review_source: reviewSource,
        total_questions: selectedQuestions.length,
        time_limit_seconds: timeLimitSeconds,
      },
    })

    await prisma.examSessionQuestion.createMany({
      data: selectedQuestions.map((q, index) => ({
        session_id: session.id,
        question_id: q.id,
        order_index: index,
      })),
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      questions: selectedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        questionText: q.question_text,
        answerA: q.answer_a,
        answerB: q.answer_b,
        answerC: q.answer_c,
        answerD: q.answer_d,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        ruleText: q.rule_text,
        subjectId: q.subject_id,
        topicId: q.topic_id,
      })),
    })
  } catch (err) {
    console.error("START SESSION ERROR:", err)

    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    )
  }
}
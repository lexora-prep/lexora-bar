import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type IncomingSubject = {
  subjectId?: number
  name?: string
  topicIds?: number[]
}

export async function POST(req: Request) {
  try {
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

    const mode = typeof body.mode === "string" ? body.mode : "study"

    const reviewSource =
      typeof body.reviewSource === "string" ? body.reviewSource : null

    const requestedSecondsPerQuestion = Number(body.secondsPerQuestion)

    const secondsPerQuestion =
      Number.isFinite(requestedSecondsPerQuestion) &&
      requestedSecondsPerQuestion > 0
        ? Math.floor(requestedSecondsPerQuestion)
        : null

    const userId = body.userId

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

    if ((mode === "quiz" || mode === "review") && secondsPerQuestion === null) {
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

    if (mode === "review") {
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
        .filter((s) => typeof s === "object" && s.subjectId)
        .map((s) => {
          const topicIds = Array.isArray(s.topicIds) ? s.topicIds : []

          if (topicIds.length > 0) {
            return {
              subjectId: s.subjectId,
              topicId: { in: topicIds },
            }
          }

          return {
            subjectId: s.subjectId,
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
        .filter((s) => typeof s === "object" && s.subjectId)
        .map((s) => {
          const topicIds = Array.isArray(s.topicIds) ? s.topicIds : []

          if (topicIds.length > 0) {
            return {
              subjectId: s.subjectId,
              topicId: { in: topicIds },
            }
          }

          return {
            subjectId: s.subjectId,
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

    if (mode !== "study" && secondsPerQuestion !== null) {
      timeLimitSeconds = selectedQuestions.length * secondsPerQuestion
    }

    if (mode === "study" && secondsPerQuestion !== null) {
      timeLimitSeconds = selectedQuestions.length * secondsPerQuestion
    }

    const session = await prisma.examSession.create({
      data: {
        userId,
        mode,
        totalQuestions: selectedQuestions.length,
        timeLimitSeconds,
      },
    })

    await prisma.examSessionQuestion.createMany({
      data: selectedQuestions.map((q, index) => ({
        sessionId: session.id,
        questionId: q.id,
        orderIndex: index,
      })),
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      questions: selectedQuestions,
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
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {

    const { sessionId } = await context.params
    const numericSessionId = Number(sessionId)

    if (!numericSessionId) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      )
    }

    const session = await prisma.examSession.findUnique({
      where: { id: numericSessionId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                subject: true,   // NEW
                topic: true      // NEW
              }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const questions = session.questions.map((q) => ({
      id: q.question.id,

      questionText: q.question.questionText,

      answerA: q.question.answerA,
      answerB: q.question.answerB,
      answerC: q.question.answerC,
      answerD: q.question.answerD,

      correctAnswer: q.question.correctAnswer,
      explanation: q.question.explanation,

      subjectId: q.question.subjectId,
      topicId: q.question.topicId,

      // NEW FIELDS FOR UI DESIGN
      subject: q.question.subject?.name ?? null,
      topic: q.question.topic?.name ?? null
    }))

    return NextResponse.json({
      sessionId: session.id,

      startedAt: session.startedAt,

      timeLimitSeconds: session.timeLimitSeconds ?? 0,

      questions
    })

  } catch (error) {

    console.error("Session API error:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )

  }
}
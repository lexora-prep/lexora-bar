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
            question: true
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

    const questionIds = session.questions.map(q => q.questionId)

    const attempts = await prisma.userMBEAttempt.findMany({
      where: {
        questionId: { in: questionIds }
      }
    })

    const answers: Record<number,string> = {}

    attempts.forEach((attempt) => {
      answers[attempt.questionId] = attempt.selectedAnswer
    })

    const questions = session.questions.map((q) => ({

      id: q.question.id,

      questionText: q.question.questionText,

      answerA: q.question.answerA,
      answerB: q.question.answerB,
      answerC: q.question.answerC,
      answerD: q.question.answerD,

      correctAnswer: q.question.correctAnswer,

      explanation: q.question.explanation ?? "",

      subject: q.question.subjectId ?? null,
      topic: q.question.topicId ?? null

    }))

    return NextResponse.json({
      sessionId: session.id,
      questions,
      answers
    })

  } catch (error) {

    console.error("RESULTS API ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )

  }
}
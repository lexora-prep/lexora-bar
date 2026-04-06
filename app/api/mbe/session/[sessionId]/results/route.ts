import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      )
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { order_index: "asc" },
          include: {
            mbe_question: {
              include: {
                subjects: true,
                topics: true
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
      id: q.mbe_question.id,
      questionText: q.mbe_question.question_text,
      answerA: q.mbe_question.answer_a,
      answerB: q.mbe_question.answer_b,
      answerC: q.mbe_question.answer_c,
      answerD: q.mbe_question.answer_d,
      correctAnswer: q.mbe_question.correct_answer,
      explanation: q.mbe_question.explanation,
      ruleText: q.mbe_question.rule_text,
      subjectId: q.mbe_question.subject_id,
      topicId: q.mbe_question.topic_id,
      subject: q.mbe_question.subjects?.name ?? null,
      topic: q.mbe_question.topics?.name ?? null
    }))

    return NextResponse.json({
      sessionId: session.id,
      startedAt: session.started_at,
      mode: session.mode,
      timeLimitSeconds: session.time_limit_seconds ?? 0,
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
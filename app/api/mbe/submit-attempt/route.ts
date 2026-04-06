import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      userId,
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpentSec
    } = body

    await prisma.user_mbe_attempts.create({
      data: {
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_sec: timeSpentSec
      }
    })

    // get topic and subject for this question
    const question = await prisma.mBEQuestion.findUnique({
      where: { id: questionId },
      select: {
        topic_id: true,
        subject_id: true
      }
    })

    if (question?.topic_id && question?.subject_id) {
      const existing = await prisma.topicProgress.findUnique({
        where: {
          user_id_topic_id: {
            user_id: userId,
            topic_id: question.topic_id
          }
        }
      })

      if (!existing) {
        await prisma.topicProgress.create({
          data: {
            user_id: userId,
            subject_id: question.subject_id,
            topic_id: question.topic_id,
            solved_count: 1,
            correct_count: isCorrect ? 1 : 0,
            accuracy: isCorrect ? 100 : 0,
            last_attempted: new Date()
          }
        })
      } else {
        const nextSolved = existing.solved_count + 1
        const nextCorrect = existing.correct_count + (isCorrect ? 1 : 0)

        await prisma.topicProgress.update({
          where: {
            user_id_topic_id: {
              user_id: userId,
              topic_id: question.topic_id
            }
          },
          data: {
            solved_count: {
              increment: 1
            },
            correct_count: {
              increment: isCorrect ? 1 : 0
            },
            accuracy: nextSolved === 0 ? 0 : (nextCorrect / nextSolved) * 100,
            last_attempted: new Date()
          }
        })
      }
    }

    return NextResponse.json({
      success: true
    })
  } catch (err) {
    console.error("SUBMIT ATTEMPT ERROR:", err)

    return NextResponse.json({
      success: false,
      error: "Server error"
    })
  }
}
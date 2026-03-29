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

    await prisma.userMBEAttempt.create({
      data: {
        userId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpentSec
      }
    })

    // get topic for this question
    const question = await prisma.mBEQuestion.findUnique({
      where: { id: questionId },
      select: {
        topicId: true
      }
    })

    if (question?.topicId) {

      const existing = await prisma.topicProgress.findUnique({
        where: {
          userId_topicId: {
            userId,
            topicId: question.topicId
          }
        }
      })

      if (!existing) {

        await prisma.topicProgress.create({
          data: {
            userId,
            topicId: question.topicId,
            solvedCount: 1,
            correctCount: isCorrect ? 1 : 0
          }
        })

      } else {

        await prisma.topicProgress.update({
          where: {
            userId_topicId: {
              userId,
              topicId: question.topicId
            }
          },
          data: {
            solvedCount: {
              increment: 1
            },
            correctCount: {
              increment: isCorrect ? 1 : 0
            }
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
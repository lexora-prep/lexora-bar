import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ subjects: [] })
    }

    const subjects = await prisma.subjects.findMany({
      select: {
        id: true,
        name: true
      }
    })

    const results: any[] = []

    for (const subject of subjects) {
      let questions: any[] = []

      try {
        questions = await prisma.mBEQuestion.findMany({
          where: {
            subject_id: subject.id
          },
          select: {
            id: true
          }
        })
      } catch {
        questions = []
      }

      const questionIds = questions.map(q => q.id)

      if (questionIds.length === 0) {
        results.push({
          subject: subject.name,
          accuracy: 0,
          answered: 0
        })

        continue
      }

      let attempts: any[] = []

      try {
        attempts = await prisma.user_mbe_attempts.findMany({
          where: {
            user_id: userId,
            question_id: {
              in: questionIds
            }
          },
          select: {
            is_correct: true
          }
        })
      } catch {
        attempts = []
      }

      const total = attempts.length
      const correct = attempts.filter(a => a.is_correct).length

      const accuracy =
        total === 0
          ? 0
          : Math.round((correct / total) * 100)

      results.push({
        subject: subject.name,
        accuracy,
        answered: total
      })
    }

    return NextResponse.json({
      subjects: results
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      subjects: []
    })
  }
}
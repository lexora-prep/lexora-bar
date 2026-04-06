import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      userId,
      subjectId,
      topicId,
      correct
    } = body

    const progress = await prisma.topicProgress.upsert({
      where: {
        user_id_topic_id: {
          user_id: userId,
          topic_id: topicId
        }
      },

      update: {
        solved_count: {
          increment: 1
        },
        correct_count: correct ? { increment: 1 } : undefined
      },

      create: {
        user_id: userId,
        subject_id: subjectId,
        topic_id: topicId,
        solved_count: 1,
        correct_count: correct ? 1 : 0
      }
    })

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { success: false },
      { status: 500 }
    )
  }
}
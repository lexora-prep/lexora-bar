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
        userId_topicId: {
          userId,
          topicId
        }
      },

      update: {
        solvedCount: {
          increment: 1
        },
        correctCount: correct ? { increment: 1 } : undefined
      },

      create: {
        userId,
        subjectId,
        topicId,
        solvedCount: 1,
        correctCount: correct ? 1 : 0
      }

    })

    return NextResponse.json({ success: true })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { success:false },
      { status:500 }
    )

  }

}
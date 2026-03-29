import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {

    const body = await req.json()

    const userId = body.userId
    const mode = body.mode

    if (!userId || !mode) {
      return NextResponse.json(
        { error: "Missing userId or mode" },
        { status: 400 }
      )
    }

    const session = await prisma.studySession.create({
      data: {
        userId: userId,
        mode: mode,
        startedAt: new Date(),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
    })

  } catch (error) {

    console.error("Study session start error:", error)

    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    )

  }
}
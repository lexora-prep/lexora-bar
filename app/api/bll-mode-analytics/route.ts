import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      )
    }

    const stats = await prisma.userRuleStat.findMany({
      where: { userId },
      select: {
        attemptsTotal: true,
        correct: true,
        incorrect: true,
        accuracy: true,
      },
    })

    const totalAttempts = stats.reduce((sum, item) => sum + item.attemptsTotal, 0)
    const totalCorrect = stats.reduce((sum, item) => sum + item.correct, 0)
    const totalIncorrect = stats.reduce((sum, item) => sum + item.incorrect, 0)

    const overallAccuracy =
      totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0

    return NextResponse.json({
      success: true,
      analytics: {
        overallAccuracy,
        totalAttempts,
        totalCorrect,
        totalIncorrect,

        typingAccuracy: overallAccuracy,
        fillBlankAccuracy: overallAccuracy,
        orderingAccuracy: overallAccuracy,
        buzzwordAccuracy: overallAccuracy,
      },
    })
  } catch (error) {
    console.error("BLL MODE ANALYTICS ERROR:", error)

    return NextResponse.json(
      { success: false, error: "Failed to load BLL mode analytics" },
      { status: 500 }
    )
  }
}
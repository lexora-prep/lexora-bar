import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const userId = "demo-user"

    await prisma.user_mbe_attempts.deleteMany({
      where: { user_id: userId }
    })

    await prisma.user_rule_attempts.deleteMany({
      where: { user_id: userId }
    })

    await prisma.user_rule_progress.deleteMany({
      where: { user_id: userId }
    })

    await prisma.userRuleStat.deleteMany({
      where: { userId }
    })

    await prisma.topicProgress.deleteMany({
      where: { user_id: userId }
    })

    await prisma.userSubjectStat.deleteMany({
      where: { user_id: userId }
    })

    await prisma.userOverallStat.deleteMany({
      where: { user_id: userId }
    })

    await prisma.examSession.deleteMany({
      where: { user_id: userId }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error("RESET ANALYTICS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Reset failed"
      },
      { status: 500 }
    )
  }
}
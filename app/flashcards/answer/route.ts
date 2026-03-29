import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const { userId, ruleId, result } = body

  const progress = await prisma.userRuleProgress.upsert({

    where: {
      userId_ruleId: {
        userId,
        ruleId
      }
    },

    update: {
      attempts: { increment: 1 },
      correct: result === "knew" ? { increment: 1 } : undefined,
      incorrect: result === "missed" ? { increment: 1 } : undefined,
      lastReviewed: new Date()
    },

    create: {
      userId,
      ruleId,
      attempts: 1,
      correct: result === "knew" ? 1 : 0,
      incorrect: result === "missed" ? 1 : 0
    }

  })

  await prisma.ruleAttempt.create({
    data: {
      userId,
      ruleId,
      mode: "flashcard",
      scorePercent: result === "knew" ? 100 : 0,
      timeSpentSec: 0
    }
  })

  return NextResponse.json({
    success: true,
    progress
  })
}
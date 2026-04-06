import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()

  const { userId, ruleId, result } = body

  const progress = await prisma.user_rule_progress.upsert({
    where: {
      user_id_rule_id: {
        user_id: userId,
        rule_id: ruleId
      }
    },

    update: {
      attempts: { increment: 1 },
      correct_count: result === "knew" ? { increment: 1 } : undefined,
      incorrect_count: result === "missed" ? { increment: 1 } : undefined,
      last_reviewed: new Date(),
      last_score: result === "knew" ? 100 : 0
    },

    create: {
      user_id: userId,
      rule_id: ruleId,
      attempts: 1,
      correct_count: result === "knew" ? 1 : 0,
      incorrect_count: result === "missed" ? 1 : 0,
      last_reviewed: new Date(),
      last_score: result === "knew" ? 100 : 0,
      saved_for_review: false,
      needs_practice: result === "missed",
      mastery_level: result === "knew" ? 1 : 0,
      interval_days: 1
    }
  })

  await prisma.user_rule_attempts.create({
    data: {
      user_id: userId,
      rule_id: ruleId,
      score: result === "knew" ? 100 : 0,
      missed_buzzwords: result === "missed" ? ["flashcard_missed"] : []
    }
  })

  return NextResponse.json({
    success: true,
    progress
  })
}
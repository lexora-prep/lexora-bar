import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()
  const { userId, ruleId } = body

  await prisma.user_rule_progress.upsert({
    where: {
      user_id_rule_id: {
        user_id: userId,
        rule_id: ruleId
      }
    },

    update: {
      saved_for_review: true,
      last_reviewed: new Date()
    },

    create: {
      user_id: userId,
      rule_id: ruleId,
      attempts: 0,
      correct_count: 0,
      incorrect_count: 0,
      saved_for_review: true,
      needs_practice: false,
      mastery_level: 0,
      interval_days: 1,
      last_reviewed: new Date()
    }
  })

  return NextResponse.json({
    success: true
  })
}
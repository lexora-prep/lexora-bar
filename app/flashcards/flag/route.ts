import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()

  const { userId, ruleId } = body

  if (!userId || !ruleId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  const flagged = await prisma.user_rule_progress.upsert({
    where: {
      user_id_rule_id: {
        user_id: userId,
        rule_id: ruleId
      }
    },
    update: {
      needs_practice: true,
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
      needs_practice: true,
      mastery_level: 0,
      interval_days: 1,
      last_reviewed: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    flagged
  })
}
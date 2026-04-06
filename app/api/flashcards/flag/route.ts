import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const { userId, ruleId } = body

  if (!userId || !ruleId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  const existing = await prisma.user_rule_progress.findUnique({
    where: {
      user_id_rule_id: {
        user_id: userId,
        rule_id: ruleId
      }
    }
  })

  if (existing) {
    return NextResponse.json({
      success: true,
      message: "Already flagged"
    })
  }

  const flagged = await prisma.user_rule_progress.create({
    data: {
      user_id: userId,
      rule_id: ruleId,
      attempts: 0,
      correct_count: 0,
      incorrect_count: 0,
      saved_for_review: true,
      needs_practice: true,
      mastery_level: 0
    }
  })

  return NextResponse.json({
    success: true,
    flagged
  })
}
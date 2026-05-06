import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const userId = "demo-user"

    // ensure demo user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        jurisdiction: "Colorado",
      },
    })

    // check if at least one rule exists
    const rule = await prisma.rules.findFirst()

    if (!rule) {
      return NextResponse.json({
        error: "No rules in database. Add at least one rule first.",
      })
    }

    // check if at least one question exists
    const question = await prisma.mBEQuestion.findFirst()

    if (!question) {
      return NextResponse.json({
        error: "No MBE questions in database.",
      })
    }

    // create MBE attempts
    for (let i = 0; i < 50; i++) {
      const correct = Math.random() > 0.35

      await prisma.user_mbe_attempts.create({
        data: {
          user_id: userId,
          question_id: question.id,
          selected_answer: "A",
          is_correct: correct,
          time_spent_sec: 30,
        },
      })
    }

    // create rule attempts
    for (let i = 0; i < 40; i++) {
      const correct = Math.random() > 0.4

      await prisma.user_rule_attempts.create({
        data: {
          user_id: userId,
          rule_id: rule.id,
          score: correct ? 100 : 50,
          missed_buzzwords: correct ? [] : ["demo_missed_buzzword"],
        },
      })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      error: "Generator failed",
    })
  }
}
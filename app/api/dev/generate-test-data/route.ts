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
        email: "demo@test.com",
        passwordHash: "dev",
        jurisdiction: "Colorado"
      }
    })

    // check if at least one rule exists
    const rule = await prisma.rule.findFirst()

    if (!rule) {
      return NextResponse.json({
        error: "No rules in database. Add at least one rule first."
      })
    }

    // check if at least one question exists
    const question = await prisma.mBEQuestion.findFirst()

    if (!question) {
      return NextResponse.json({
        error: "No MBE questions in database."
      })
    }

    // generate MBE attempts
    for (let i = 0; i < 50; i++) {

      const correct = Math.random() > 0.35

      await prisma.userMBEAttempt.create({
        data: {
          userId,
          questionId: question.id,
          selectedAnswer: "A",
          isCorrect: correct,
          timeSpentSec: 30
        }
      })

    }

    // generate rule attempts
    for (let i = 0; i < 40; i++) {

      const correct = Math.random() > 0.4

      await prisma.ruleAttempt.create({
        data: {
          userId,
          ruleId: rule.id,
          mode: "typing",
          scorePercent: correct ? 100 : 50,
          timeSpentSec: 20
        }
      })

    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json({
      error: "Generator failed"
    })

  }

}
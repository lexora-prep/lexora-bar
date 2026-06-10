import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function productionNotFound() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

function methodNotAllowed() {
  return NextResponse.json(
    { ok: false, error: "Use POST in local development." },
    { status: 405 }
  )
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") return productionNotFound()
  return methodNotAllowed()
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") return productionNotFound()

  try {
    const userId = "demo-user"

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        jurisdiction: "Colorado",
      },
    })

    const rule = await prisma.rules.findFirst()

    if (!rule) {
      return NextResponse.json(
        { ok: false, error: "No rules in database. Add at least one rule first." },
        { status: 400 }
      )
    }

    const question = await prisma.mBEQuestion.findFirst()

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "No MBE questions in database." },
        { status: 400 }
      )
    }

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
      ok: true,
      success: true,
    })
  } catch (error) {
    console.error("GENERATE TEST DATA ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Generator failed" },
      { status: 500 }
    )
  }
}
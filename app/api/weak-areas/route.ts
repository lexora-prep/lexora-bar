import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId", weakAreas: [], count: 0 },
        { status: 400 }
      )
    }

    const stats = await prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
        attempts: { gte: 3 },
      },
      select: {
        rule_id: true,
        attempts: true,
        correct_count: true,
        needs_practice: true,
        updated_at: true,
        created_at: true,
        rules: {
          select: {
            title: true,
            subjects: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    const now = new Date()

    const weakAreas = stats
      .map((r) => {
        const accuracy =
          r.attempts === 0
            ? 0
            : Math.round((r.correct_count / r.attempts) * 100)

        const lastAttempt = r.updated_at || r.created_at || new Date()

        const daysAgo = Math.max(
          1,
          Math.floor(
            (now.getTime() - new Date(lastAttempt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )

        const recencyWeight = Math.max(0, 30 - daysAgo)

        const priority =
          (100 - accuracy) * 0.6 +
          r.attempts * 0.2 +
          recencyWeight * 0.2

        const trend = accuracy >= 60 ? "up" : "down"
        const needsPractice = !!r.needs_practice

        return {
          id: r.rule_id,
          ruleId: r.rule_id,
          subject: r.rules?.subjects?.name || "Unknown",
          rule: r.rules?.title || "Untitled",
          title: r.rules?.title || "Untitled",
          accuracy,
          attempts: r.attempts,
          priority: Math.round(priority),
          trend,
          needsPractice,
        }
      })
      .filter((r) => r.needsPractice || r.accuracy < 70)
      .sort((a, b) => b.priority - a.priority)

    return NextResponse.json({
      weakAreas,
      count: weakAreas.length,
    })
  } catch (error) {
    console.error("Weak areas error:", error)
    return NextResponse.json(
      { weakAreas: [], count: 0 },
      { status: 500 }
    )
  }
}
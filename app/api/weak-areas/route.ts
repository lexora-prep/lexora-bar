import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function calculateAccuracy(correctCount: number, attempts: number) {
  if (!attempts) return 0
  return Math.max(0, Math.min(100, Math.round((correctCount / attempts) * 100)))
}

function calculateTrend(params: {
  accuracy: number
  needsPractice: boolean
  masteryLevel: number
}) {
  const { accuracy, needsPractice, masteryLevel } = params

  if (needsPractice) return "down"
  if (masteryLevel >= 70 || accuracy >= 70) return "up"
  return "down"
}

function calculatePriority(params: {
  accuracy: number
  attempts: number
  lastUpdatedAt: Date | null
  needsPractice: boolean
}) {
  const { accuracy, attempts, lastUpdatedAt, needsPractice } = params

  const now = Date.now()
  const updatedAt = lastUpdatedAt?.getTime() ?? now
  const daysAgo = Math.max(0, Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)))
  const recencyWeight = Math.max(0, 30 - daysAgo)

  let priority =
    (100 - accuracy) * 0.6 +
    attempts * 0.2 +
    recencyWeight * 0.2

  if (needsPractice) {
    priority += 10
  }

  return Math.round(priority)
}

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
        attempts: {
          gte: 1,
        },
      },
      select: {
        rule_id: true,
        attempts: true,
        correct_count: true,
        needs_practice: true,
        mastery_level: true,
        updated_at: true,
        created_at: true,
        rules: {
          select: {
            title: true,
            rule_text: true,
            prompt_question: true,
            application_example: true,
            how_to_apply: true,
            common_traps: true,
            exam_tip: true,
            common_trap: true,
            topics: {
              select: {
                name: true,
              },
            },
            subtopics: {
              select: {
                name: true,
              },
            },
            subjects: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          updated_at: "desc",
        },
        {
          created_at: "desc",
        },
      ],
    })

    const weakAreas = stats
      .map((r) => {
        const attempts = Number(r.attempts ?? 0)
        const correctCount = Number(r.correct_count ?? 0)
        const accuracy = calculateAccuracy(correctCount, attempts)
        const needsPractice = !!r.needs_practice
        const masteryLevel = Number(r.mastery_level ?? accuracy)
        const trend = calculateTrend({
          accuracy,
          needsPractice,
          masteryLevel,
        })
        const priority = calculatePriority({
          accuracy,
          attempts,
          lastUpdatedAt: r.updated_at ?? r.created_at ?? null,
          needsPractice,
        })

        return {
          id: r.rule_id,
          ruleId: r.rule_id,
          subject: r.rules?.subjects?.name || "Unknown",
          topic: r.rules?.topics?.name || "",
          subtopic: r.rules?.subtopics?.name || "",
          rule: r.rules?.title || "Untitled",
          title: r.rules?.title || "Untitled",
          ruleText: r.rules?.rule_text || "",
          promptQuestion: r.rules?.prompt_question || "",
          applicationExample: r.rules?.application_example || "",
          howToApply: Array.isArray(r.rules?.how_to_apply) ? r.rules.how_to_apply : [],
          commonTraps: Array.isArray(r.rules?.common_traps) ? r.rules.common_traps : [],
          examTip: r.rules?.exam_tip || "",
          commonTrap: r.rules?.common_trap || "",
          accuracy,
          attempts,
          priority,
          trend,
          needsPractice,
          mastery: masteryLevel,
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
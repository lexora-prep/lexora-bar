import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  LEARNING_PROGRESS_SELECT,
  learningPriority,
  resolveLearningProgress,
} from "@/lib/learning/analytics"

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) return auth.response

    const stats = await prisma.user_rule_progress.findMany({
      where: {
        user_id: auth.userId,
        attempts: { gte: 1 },
      },
      select: {
        rule_id: true,
        updated_at: true,
        created_at: true,
        ...LEARNING_PROGRESS_SELECT,
        rules: {
          select: {
            id: true,
            title: true,
            rule_text: true,
            application_example: true,
            common_trap: true,
            prompt_question: true,
            topics: { select: { name: true } },
            subtopics: { select: { name: true } },
            subjects: { select: { name: true } },
          },
        },
      },
    })

    const weakAreas = stats
      .map((row) => {
        const progress = resolveLearningProgress(row)
        const updatedAt = row.updated_at ?? row.created_at ?? null

        return {
          id: row.rule_id,
          ruleId: row.rule_id,
          subject: row.rules?.subjects?.name || "Unknown",
          topic: row.rules?.topics?.name || "",
          subtopic: row.rules?.subtopics?.name || "",
          rule: row.rules?.title || "Untitled",
          title: row.rules?.title || "Untitled",
          ruleText: row.rules?.rule_text || "",
          applicationExample: row.rules?.application_example || "",
          commonTrap: row.rules?.common_trap || "",
          promptQuestion: row.rules?.prompt_question || "",
          accuracy: progress.accuracy,
          attempts: progress.attempts,
          priority: learningPriority({ progress, updatedAt }),
          trend: progress.isWeak ? "down" : "up",
          needsPractice: progress.isWeak,
          mastery: progress.mastery,
          confidence: progress.confidence,
          learningStatus: progress.status,
        }
      })
      .filter((row) => row.needsPractice)
      .sort((a, b) => b.priority - a.priority)

    return NextResponse.json(
      { weakAreas, count: weakAreas.length },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    )
  } catch (error) {
    console.error("Weak areas error:", error)
    return NextResponse.json({ weakAreas: [], count: 0 }, { status: 500 })
  }
}

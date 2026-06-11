import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  LEARNING_PROGRESS_SELECT,
  learningPriority,
  resolveLearningProgress,
} from "@/lib/learning/analytics"
import type { LearningStatus } from "@/lib/learning/types"

type WeakRuleRow = {
  id: string
  ruleId: string
  title: string
  rule: string
  subject: string
  topic: string
  subtopic: string
  ruleText: string
  applicationExample: string
  commonTrap: string
  promptQuestion: string
  accuracy: number
  attempts: number
  priority: number
  trend: "up" | "down"
  needsPractice: boolean
  mastery: number
  confidence: number
  level: LearningStatus
  updatedAt: string | null
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuthenticatedUser(req)
    if (!auth.ok) return auth.response

    const progressRows = await prisma.user_rule_progress.findMany({
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
            prompt_question: true,
            application_example: true,
            how_to_apply: true,
            common_traps: true,
            exam_tip: true,
            common_trap: true,
            topics: { select: { name: true } },
            subtopics: { select: { name: true } },
            subjects: { select: { name: true } },
          },
        },
      },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
    })

    const weakAreas: WeakRuleRow[] = progressRows
      .map((row) => {
        const progress = resolveLearningProgress(row)
        const updatedAt = row.updated_at ?? row.created_at ?? null

        return {
          id: row.rule_id,
          ruleId: row.rule_id,
          title: row.rules?.title || "Untitled",
          rule: row.rules?.title || "Untitled",
          subject: row.rules?.subjects?.name || "Unknown",
          topic: row.rules?.topics?.name || "",
          subtopic: row.rules?.subtopics?.name || "",
          ruleText: row.rules?.rule_text || "",
          applicationExample: row.rules?.application_example || "",
          howToApply: Array.isArray(row.rules?.how_to_apply)
            ? row.rules.how_to_apply
            : [],
          commonTraps: Array.isArray(row.rules?.common_traps)
            ? row.rules.common_traps
            : [],
          examTip: row.rules?.exam_tip || "",
          commonTrap: row.rules?.common_trap || "",
          promptQuestion: row.rules?.prompt_question || "",
          accuracy: progress.accuracy,
          attempts: progress.attempts,
          priority: learningPriority({ progress, updatedAt }),
          trend: progress.isWeak ? "down" : "up" as "up" | "down",
          needsPractice: progress.isWeak,
          mastery: progress.mastery,
          confidence: progress.confidence,
          level: progress.status,
          updatedAt: updatedAt?.toISOString() ?? null,
        }
      })
      .filter((row) => row.needsPractice)
      .sort((a, b) => b.priority - a.priority)

    const topWeakRules = weakAreas.slice(0, 5)
    const groupedSubjectMap = new Map<
      string,
      {
        subject: string
        masteryTotal: number
        masteryCount: number
        critical: number
        needsWork: number
        improving: number
        mastered: number
        rules: WeakRuleRow[]
      }
    >()

    for (const item of weakAreas) {
      const existing = groupedSubjectMap.get(item.subject) ?? {
        subject: item.subject,
        masteryTotal: 0,
        masteryCount: 0,
        critical: 0,
        needsWork: 0,
        improving: 0,
        mastered: 0,
        rules: [],
      }

      existing.masteryTotal += item.mastery
      existing.masteryCount += 1
      if (item.level === "CRITICAL") existing.critical += 1
      if (item.level === "NEEDS_WORK") existing.needsWork += 1
      if (item.level === "IMPROVING") existing.improving += 1
      if (item.level === "STRONG" || item.level === "MASTERED") {
        existing.mastered += 1
      }
      existing.rules.push(item)
      groupedSubjectMap.set(item.subject, existing)
    }

    const subjects = Array.from(groupedSubjectMap.values())
      .map((group) => ({
        subject: group.subject,
        mastery:
          group.masteryCount > 0
            ? Math.round(group.masteryTotal / group.masteryCount)
            : 0,
        critical: group.critical,
        needsWork: group.needsWork,
        improving: group.improving,
        mastered: group.mastered,
        rules: group.rules.sort((a, b) => b.priority - a.priority),
      }))
      .sort((a, b) => (b.rules[0]?.priority ?? 0) - (a.rules[0]?.priority ?? 0))

    return NextResponse.json(
      { count: weakAreas.length, weakAreas, topWeakRules, subjects },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    )
  } catch (error) {
    console.error("RULE WEAK AREAS ERROR:", error)
    return NextResponse.json(
      { count: 0, weakAreas: [], topWeakRules: [], subjects: [] },
      { status: 500 }
    )
  }
}

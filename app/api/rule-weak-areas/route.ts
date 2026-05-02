import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  level: "CRITICAL" | "NEEDS_WORK" | "IMPROVING" | "MASTERED"
  updatedAt: string | null
}

function calculateAccuracy(correctCount: number, attempts: number) {
  if (!attempts) return 0
  return Math.max(0, Math.min(100, Math.round((correctCount / attempts) * 100)))
}

function calculateLevel(accuracy: number): WeakRuleRow["level"] {
  if (accuracy >= 80) return "MASTERED"
  if (accuracy >= 60) return "IMPROVING"
  if (accuracy >= 30) return "NEEDS_WORK"
  return "CRITICAL"
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          error: "Missing userId",
          count: 0,
          weakAreas: [],
          topWeakRules: [],
          subjects: [],
        },
        { status: 400 }
      )
    }

    const progressRows = await prisma.user_rule_progress.findMany({
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
            id: true,
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

    const weakAreas: WeakRuleRow[] = progressRows
      .map((row) => {
        const attempts = Number(row.attempts ?? 0)
        const correctCount = Number(row.correct_count ?? 0)
        const accuracy = calculateAccuracy(correctCount, attempts)
        const needsPractice = !!row.needs_practice
        const mastery = Number(row.mastery_level ?? accuracy)
        const trend = calculateTrend({
          accuracy,
          needsPractice,
          masteryLevel: mastery,
        })
        const priority = calculatePriority({
          accuracy,
          attempts,
          lastUpdatedAt: row.updated_at ?? row.created_at ?? null,
          needsPractice,
        })
        const level = calculateLevel(accuracy)

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
          howToApply: Array.isArray(row.rules?.how_to_apply) ? row.rules.how_to_apply : [],
          commonTraps: Array.isArray(row.rules?.common_traps) ? row.rules.common_traps : [],
          examTip: row.rules?.exam_tip || "",
          commonTrap: row.rules?.common_trap || "",
          promptQuestion: row.rules?.prompt_question || "",
          accuracy,
          attempts,
          priority,
          trend: trend as "up" | "down",
          needsPractice,
          mastery,
          level,
          updatedAt: (row.updated_at ?? row.created_at ?? null)?.toISOString?.() ?? null,
        }
      })
      .filter((row) => row.needsPractice || row.accuracy < 70)
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

      existing.masteryTotal += item.accuracy
      existing.masteryCount += 1

      if (item.level === "CRITICAL") existing.critical += 1
      if (item.level === "NEEDS_WORK") existing.needsWork += 1
      if (item.level === "IMPROVING") existing.improving += 1
      if (item.level === "MASTERED") existing.mastered += 1

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
      .sort((a, b) => {
        const aWorst = a.rules[0]?.priority ?? 0
        const bWorst = b.rules[0]?.priority ?? 0
        return bWorst - aWorst
      })

    return NextResponse.json({
      count: weakAreas.length,
      weakAreas,
      topWeakRules,
      subjects,
    })
  } catch (error) {
    console.error("RULE WEAK AREAS ERROR:", error)

    return NextResponse.json(
      {
        count: 0,
        weakAreas: [],
        topWeakRules: [],
        subjects: [],
      },
      { status: 500 }
    )
  }
}
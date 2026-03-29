import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const subjects = await prisma.subjects.findMany({
      orderBy: {
        order_index: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    })

    const rules = await prisma.rules.findMany({
      select: {
        id: true,
        subject_id: true,
      },
    })

    const rulesBySubject: Record<string, string[]> = {}

    for (const rule of rules) {
      if (!rule.subject_id) continue

      if (!rulesBySubject[rule.subject_id]) {
        rulesBySubject[rule.subject_id] = []
      }

      rulesBySubject[rule.subject_id].push(rule.id)
    }

    let progressByRuleId: Record<string, { attempted: boolean; weak: boolean }> = {}

    if (userId) {
      const progress = await prisma.user_rule_progress.findMany({
        where: {
          user_id: userId,
        },
        select: {
          rule_id: true,
          attempts: true,
          mastery_level: true,
        },
      })

      for (const row of progress) {
        progressByRuleId[row.rule_id] = {
          attempted: (row.attempts ?? 0) > 0,
          weak: (row.mastery_level ?? 0) < 60,
        }
      }
    }

    const result = subjects.map((subject) => {
      const subjectRuleIds = rulesBySubject[subject.id] ?? []

      let completed_rules = 0
      let weak_rules = 0

      for (const ruleId of subjectRuleIds) {
        const progress = progressByRuleId[ruleId]

        if (progress?.attempted) {
          completed_rules++
        }

        if (progress?.weak) {
          weak_rules++
        }
      }

      return {
        id: subject.id,
        name: subject.name,
        total_rules: subjectRuleIds.length,
        completed_rules,
        weak_rules,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET SUBJECTS ERROR:", error)

    return NextResponse.json(
      {
        error: "Failed to load subjects",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
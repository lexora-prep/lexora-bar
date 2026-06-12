import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  LEARNING_PROGRESS_SELECT,
  resolveLearningProgress,
} from "@/lib/learning/analytics"
import { getLearningCycleSummary } from "@/lib/learning"

function buildExamBadge(subject: {
  name: string
  exam_status?: string | null
}) {
  const status = String(subject.exam_status ?? "").trim()

  if (subject.name === "Family Law" || subject.name === "Trusts and Estates") {
    return {
      badge_text: "No longer tested on MEE starting July 2026",
      badge_tone: "removed",
      badge_subtext:
        "Still tested regularly through the MPT through February 2028",
    }
  }

  if (status === "removed_from_mee") {
    return {
      badge_text: "No longer tested on MEE starting July 2026",
      badge_tone: "removed",
      badge_subtext: "",
    }
  }

  return {
    badge_text: "",
    badge_tone: "",
    badge_subtext: "",
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuthenticatedUser(req)
    if (!auth.ok) return auth.response

    const [subjects, cycleSummary, progressRows] = await Promise.all([
      prisma.subjects.findMany({
        where: { show_in_rule_training: true },
        orderBy: { order_index: "asc" },
        select: {
          id: true,
          name: true,
          exam_status: true,
          show_in_rule_training: true,
          show_in_analytics: true,
        },
      }),
      getLearningCycleSummary(auth.userId),
      prisma.user_rule_progress.findMany({
        where: {
          user_id: auth.userId,
          rules: {
            is_active: true,
            rule_type: null,
          },
        },
        select: {
          rule_id: true,
          rules: { select: { subject_id: true } },
          ...LEARNING_PROGRESS_SELECT,
        },
      }),
    ])

    const weakBySubject = new Map<string, number>()
    for (const row of progressRows) {
      const subjectId = row.rules?.subject_id
      if (!subjectId) continue
      if (!resolveLearningProgress(row).isWeak) continue
      weakBySubject.set(subjectId, (weakBySubject.get(subjectId) ?? 0) + 1)
    }

    const cycleSubjectById = new Map(
      cycleSummary.subjects.map((subject) => [subject.subjectId, subject])
    )

    const result = subjects
      .map((subject) => {
        const cycleSubject = cycleSubjectById.get(subject.id)
        const badge = buildExamBadge(subject)
        const totalRules = cycleSubject?.totalRules ?? 0
        const coveredRules = cycleSubject?.coveredRules ?? 0
        const assessedRules = cycleSubject?.assessedRules ?? 0
        const passedRules = cycleSubject?.passedRules ?? 0

        return {
          id: subject.id,
          name: subject.name,
          exam_status: subject.exam_status ?? "core",
          show_in_rule_training: subject.show_in_rule_training ?? true,
          show_in_analytics: subject.show_in_analytics ?? true,
          total_rules: totalRules,
          completed_rules: coveredRules,
          covered_rules: coveredRules,
          assessed_rules: assessedRules,
          passed_rules: passedRules,
          remaining_study_rules: Math.max(0, totalRules - coveredRules),
          remaining_quiz_rules: Math.max(0, totalRules - assessedRules),
          cycle_progress_percentage:
            cycleSubject?.coveragePercentage ?? 0,
          cycle_complete: cycleSubject?.isComplete ?? false,
          weak_rules: weakBySubject.get(subject.id) ?? 0,
          cycle_number: cycleSummary.cycle.number,
          topics: (cycleSubject?.topics ?? []).map((topic) => ({
            id: topic.topicId,
            name: topic.topicName,
            total_rules: topic.totalRules,
            covered_rules: topic.coveredRules,
            assessed_rules: topic.assessedRules,
            passed_rules: topic.passedRules,
            remaining_study_rules: topic.remainingStudyRules,
            remaining_quiz_rules: topic.remainingQuizRules,
            cycle_progress_percentage: topic.coveragePercentage,
            cycle_complete: topic.isComplete,
          })),
          badge_text: badge.badge_text,
          badge_tone: badge.badge_tone,
          badge_subtext: badge.badge_subtext,
        }
      })
      .filter((subject) => subject.total_rules > 0)

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
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

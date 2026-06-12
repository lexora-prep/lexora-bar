import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  LEARNING_PROGRESS_SELECT,
  calculateLearningReadiness,
  resolveLearningProgress,
} from "@/lib/learning/analytics"
import { getCanonicalLearningRules } from "@/lib/learning/cycles"

function toPercent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

function toSubjectKey(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

export async function GET(req: Request) {
  try {
    const startedAt = Date.now()
    const auth = await requireAuthenticatedUser(req)
    if (!auth.ok) return auth.response

    const [subjects, canonicalRules, userRuleProgress, mbeQuestionCountBySubject, userMbeAttempts] =
      await Promise.all([
        prisma.subjects.findMany({
          select: { id: true, name: true, order_index: true },
          orderBy: { order_index: "asc" },
        }),
        getCanonicalLearningRules(),
        prisma.user_rule_progress.findMany({
          where: { user_id: auth.userId },
          select: {
            rule_id: true,
            ...LEARNING_PROGRESS_SELECT,
            rules: { select: { subject_id: true } },
          },
        }),
        prisma.mBEQuestion.groupBy({
          by: ["subject_id"],
          where: { is_active: true },
          _count: { _all: true },
        }),
        prisma.user_mbe_attempts.findMany({
          where: { user_id: auth.userId },
          select: {
            is_correct: true,
            mbe_question: { select: { subject_id: true } },
          },
        }),
      ])

    const canonicalRuleIds = new Set(canonicalRules.map((rule) => rule.id))
    const rulesTotalMap = new Map<string, number>()
    for (const rule of canonicalRules) {
      rulesTotalMap.set(
        rule.subjectId,
        (rulesTotalMap.get(rule.subjectId) ?? 0) + 1
      )
    }

    const mbeQuestionTotalMap = new Map<string, number>()
    for (const row of mbeQuestionCountBySubject) {
      const subjectId = toSubjectKey(row.subject_id)
      if (subjectId) mbeQuestionTotalMap.set(subjectId, row._count._all)
    }

    const bllRowsBySubject = new Map<string, typeof userRuleProgress>()
    for (const row of userRuleProgress) {
      if (!canonicalRuleIds.has(row.rule_id)) continue
      const subjectId = toSubjectKey(row.rules?.subject_id)
      if (!subjectId) continue
      const list = bllRowsBySubject.get(subjectId) ?? []
      list.push(row)
      bllRowsBySubject.set(subjectId, list)
    }

    const mbeAggMap = new Map<string, { correct: number; attempts: number }>()
    for (const row of userMbeAttempts) {
      const subjectId = toSubjectKey(row.mbe_question?.subject_id)
      if (!subjectId) continue
      const existing = mbeAggMap.get(subjectId) ?? { correct: 0, attempts: 0 }
      existing.attempts += 1
      if (row.is_correct) existing.correct += 1
      mbeAggMap.set(subjectId, existing)
    }

    const bllResults = subjects.map((subject) => {
      const rows = bllRowsBySubject.get(subject.id) ?? []
      const completed = rows.filter((row) => resolveLearningProgress(row).attempts > 0).length

      return {
        name: subject.name,
        accuracy: calculateLearningReadiness(rows),
        completed,
        total: rulesTotalMap.get(subject.id) ?? 0,
      }
    })

    const mbeResults = subjects.map((subject) => {
      const aggregate = mbeAggMap.get(subject.id) ?? { correct: 0, attempts: 0 }
      const accuracy = toPercent(aggregate.correct, aggregate.attempts)
      return {
        name: subject.name,
        accuracy,
        completed: aggregate.attempts,
        total: mbeQuestionTotalMap.get(subject.id) ?? 0,
        avg: Math.max(0, accuracy - 8),
      }
    })

    console.log(
      `[bll-subject-analytics] userId=${auth.userId} subjects=${subjects.length} duration=${Date.now() - startedAt}ms`
    )

    return NextResponse.json(
      { subjects: bllResults, mbeSubjects: mbeResults },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    )
  } catch (err) {
    console.error("Subject analytics error:", err)
    return NextResponse.json({ subjects: [], mbeSubjects: [] }, { status: 500 })
  }
}

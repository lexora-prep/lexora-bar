import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function toPercent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export async function GET(req: Request) {
  try {
    const startedAt = Date.now()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "missing userId" }, { status: 400 })
    }

    const [
      subjects,
      rulesCountBySubject,
      userRuleProgress,
      mbeQuestionCountBySubject,
      userMbeAttempts,
    ] = await Promise.all([
      prisma.subjects.findMany({
        select: {
          id: true,
          name: true,
          order_index: true,
        },
        orderBy: {
          order_index: "asc",
        },
      }),

      prisma.rules.groupBy({
        by: ["subject_id"],
        _count: {
          _all: true,
        },
      }),

      prisma.user_rule_progress.findMany({
        where: {
          user_id: userId,
        },
        select: {
          correct_count: true,
          attempts: true,
          rules: {
            select: {
              subject_id: true,
            },
          },
        },
      }),

      prisma.mBEQuestion.groupBy({
        by: ["subject_id"],
        where: {
          is_active: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.user_mbe_attempts.findMany({
        where: {
          user_id: userId,
        },
        select: {
          is_correct: true,
          mbe_question: {
            select: {
              subject_id: true,
            },
          },
        },
      }),
    ])

    const rulesTotalMap = new Map<number, number>()
    for (const row of rulesCountBySubject) {
      rulesTotalMap.set(row.subject_id, row._count._all)
    }

    const mbeQuestionTotalMap = new Map<number, number>()
    for (const row of mbeQuestionCountBySubject) {
      mbeQuestionTotalMap.set(row.subject_id, row._count._all)
    }

    const bllAggMap = new Map<
      number,
      { correct: number; attempts: number; completed: number }
    >()

    for (const row of userRuleProgress) {
      const subjectId = row.rules?.subject_id
      if (!subjectId) continue

      const existing = bllAggMap.get(subjectId) ?? {
        correct: 0,
        attempts: 0,
        completed: 0,
      }

      existing.correct += row.correct_count ?? 0
      existing.attempts += row.attempts ?? 0
      existing.completed += 1

      bllAggMap.set(subjectId, existing)
    }

    const mbeAggMap = new Map<number, { correct: number; attempts: number }>()

    for (const row of userMbeAttempts) {
      const subjectId = row.mbe_question?.subject_id
      if (!subjectId) continue

      const existing = mbeAggMap.get(subjectId) ?? {
        correct: 0,
        attempts: 0,
      }

      existing.attempts += 1
      if (row.is_correct) {
        existing.correct += 1
      }

      mbeAggMap.set(subjectId, existing)
    }

    const bllResults: Array<{
      name: string
      accuracy: number
      completed: number
      total: number
    }> = []

    const mbeResults: Array<{
      name: string
      accuracy: number
      completed: number
      total: number
      avg: number
    }> = []

    for (const subject of subjects) {
      const bllAgg = bllAggMap.get(subject.id) ?? {
        correct: 0,
        attempts: 0,
        completed: 0,
      }

      const rulesTotal = rulesTotalMap.get(subject.id) ?? 0

      bllResults.push({
        name: subject.name,
        accuracy: toPercent(bllAgg.correct, bllAgg.attempts),
        completed: bllAgg.completed,
        total: rulesTotal,
      })

      const mbeAgg = mbeAggMap.get(subject.id) ?? {
        correct: 0,
        attempts: 0,
      }

      const mbeQuestionTotal = mbeQuestionTotalMap.get(subject.id) ?? 0
      const mbeAccuracy = toPercent(mbeAgg.correct, mbeAgg.attempts)

      mbeResults.push({
        name: subject.name,
        accuracy: mbeAccuracy,
        completed: mbeAgg.attempts,
        total: mbeQuestionTotal,
        avg: Math.max(0, mbeAccuracy - 8),
      })
    }

    const durationMs = Date.now() - startedAt
    console.log(
      `[bll-subject-analytics] userId=${userId} subjects=${subjects.length} duration=${durationMs}ms`
    )

    return NextResponse.json({
      subjects: bllResults,
      mbeSubjects: mbeResults,
    })
  } catch (err) {
    console.error("Subject analytics error:", err)

    return NextResponse.json(
      {
        subjects: [],
        mbeSubjects: [],
      },
      { status: 500 }
    )
  }
}
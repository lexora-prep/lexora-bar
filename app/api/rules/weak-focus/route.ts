import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getApplicableRuleUniverseForUser } from "@/lib/rules/registry"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  LEARNING_PROGRESS_SELECT,
  learningPriority,
  resolveLearningProgress,
} from "@/lib/learning/analytics"
import {
  buildAdaptiveReviewDecision,
  countConsecutiveRecallFailures,
  formatReviewTiming,
  getLearningStatusLabel,
  getReviewTierLabel,
  shouldEnterWeakFocus,
} from "@/lib/learning/review-queue"

function priorityWeight(value: unknown) {
  const clean = String(value ?? "").trim().toLowerCase()
  if (["critical", "emergency", "golden", "highly_tested"].includes(clean)) {
    return 4
  }
  if (["high", "priority", "most_tested"].includes(clean)) return 3
  if (["medium", "core"].includes(clean)) return 2
  return 1
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const requestedLimit = Number(searchParams.get("limit") ?? 100)
    const limit = Math.max(1, Math.min(250, Math.round(requestedLimit || 100)))
    const now = new Date()
    const recentCutoff = new Date(now.getTime() - 180 * 86_400_000)
    const ruleUniverse = await getApplicableRuleUniverseForUser(auth.userId)
    const applicableRuleIds = new Set(ruleUniverse.rules.map((rule) => rule.id))

    const allStats = await prisma.user_rule_progress.findMany({
      where: {
        user_id: auth.userId,
        attempts: { gte: 1 },
      },
      select: {
        rule_id: true,
        updated_at: true,
        created_at: true,
        next_review_at: true,
        last_score: true,
        ...LEARNING_PROGRESS_SELECT,
        rules: {
          select: {
            id: true,
            title: true,
            rule_text: true,
            application_example: true,
            common_trap: true,
            prompt_question: true,
            priority: true,
            topics: { select: { name: true } },
            subtopics: { select: { name: true } },
            subjects: { select: { name: true } },
          },
        },
      },
    })

    const stats = allStats.filter((row) => applicableRuleIds.has(row.rule_id))
    const ruleIds = stats.map((row) => row.rule_id)
    const recentAttempts = ruleIds.length
      ? await prisma.user_rule_attempts.findMany({
          where: {
            user_id: auth.userId,
            rule_id: { in: ruleIds },
            created_at: { gte: recentCutoff },
            training_context: { in: ["quiz", "timed", "weak_focus"] },
            revealed_answer: false,
            self_reported: false,
          },
          orderBy: { created_at: "desc" },
          take: 2500,
          select: {
            rule_id: true,
            score: true,
          },
        })
      : []

    const scoresByRule = new Map<string, number[]>()
    for (const attempt of recentAttempts) {
      const scores = scoresByRule.get(attempt.rule_id) ?? []
      if (scores.length >= 5) continue
      scores.push(Number(attempt.score ?? 0))
      scoresByRule.set(attempt.rule_id, scores)
    }

    const weakAreas = stats
      .map((row) => {
        const progress = resolveLearningProgress(row)
        const updatedAt = row.updated_at ?? row.created_at ?? null
        const scores = scoresByRule.get(row.rule_id) ?? []
        const failureStreak = countConsecutiveRecallFailures(scores)
        const assessed =
          scores.length > 0 ||
          !["UNTRAINED", "STUDIED"].includes(progress.status)
        const review = buildAdaptiveReviewDecision({
          covered: true,
          assessed,
          isWeak: progress.isWeak,
          learningStatus: progress.status,
          mastery: progress.mastery,
          confidence: progress.confidence,
          nextReviewAt: row.next_review_at,
          failureStreak,
          lastScore: row.last_score,
          priorityWeight: priorityWeight(row.rules?.priority),
          now,
        })
        const belongsInWeakFocus = shouldEnterWeakFocus({
          assessed,
          isWeak: progress.isWeak,
          failureStreak,
          lastScore: row.last_score,
        })
        const basePriority = learningPriority({ progress, updatedAt })

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
          priority: Math.round(basePriority + review.priorityScore),
          trend: progress.isWeak ? "down" : "up",
          needsPractice: belongsInWeakFocus,
          mastery: progress.mastery,
          confidence: progress.confidence,
          learningStatus: progress.status,
          lastScore:
            row.last_score === null || row.last_score === undefined
              ? null
              : Number(row.last_score),
          failureStreak,
          reviewTier: review.tier,
          reviewUrgency: review.urgency,
          reviewAvailableNow: review.availableNow,
          nextReviewAt: row.next_review_at?.toISOString() ?? null,
          priorityReason: review.reason,
          recommendationReason: review.reason,
          reviewTimingLabel: formatReviewTiming(review.dueAt, now),
          reviewTierLabel: getReviewTierLabel(review.tier),
          learningStatusLabel: getLearningStatusLabel(progress.status),
        }
      })
      .filter((row) => row.needsPractice)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          b.failureStreak - a.failureStreak ||
          a.mastery - b.mastery
      )
      .slice(0, limit)

    return NextResponse.json(
      {
        weakAreas,
        rules: weakAreas,
        count: weakAreas.length,
        dueCount: weakAreas.filter((row) => row.reviewAvailableNow).length,
        repeatedFailureCount: weakAreas.filter(
          (row) => row.failureStreak >= 2
        ).length,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    )
  } catch (error) {
    console.error("Weak areas error:", error)
    return NextResponse.json(
      {
        weakAreas: [],
        rules: [],
        count: 0,
        dueCount: 0,
        repeatedFailureCount: 0,
      },
      { status: 500 }
    )
  }
}

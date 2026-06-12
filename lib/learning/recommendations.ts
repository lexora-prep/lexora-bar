import { prisma } from "@/lib/prisma"
import { getLearningCycleSummary } from "./cycles"
import { LEARNING_PROGRESS_SELECT, resolveLearningProgress } from "./analytics"
import {
  buildAdaptiveReviewDecision,
  countConsecutiveRecallFailures,
  formatReviewTiming,
  getLearningStatusLabel,
  getReviewTierLabel,
  type AdaptiveReviewDecision,
} from "./review-queue"
import type { LearningStatus } from "./types"

export type RecommendationPhase = "foundation" | "accelerated" | "sprint"
export type RecommendedBlockMode = "study" | "quiz" | "timed" | "weak_focus"

export type RecommendationRuleCategory =
  | "due_review"
  | "priority_rule"
  | "first_recall"
  | "new_rule"

export type RecommendedRuleExplanation = {
  ruleId: string
  title: string
  subjectName: string
  topicName: string
  statusLabel: string
  reason: string
  timingLabel: string
  dueAt: string | null
  failureStreak: number
  mastery: number
  category: RecommendationRuleCategory
}

export type RecommendedSessionBlock = {
  id: string
  mode: RecommendedBlockMode
  title: string
  description: string
  reason: string
  minutes: number
  estimatedRules: number
  ruleIds: string[]
  subjectNames: string[]
  completedToday: boolean
  ruleExplanations: RecommendedRuleExplanation[]
}

export type DailyLearningRecommendation = {
  generatedAt: string
  dateKey: string
  requestedMinutes: number
  recommendedMinutes: number
  phase: RecommendationPhase
  phaseLabel: string
  headline: string
  summary: string
  examDate: string | null
  daysUntilExam: number | null
  cycleNumber: number
  primaryBlockId: string | null
  totals: {
    availableRules: number
    coveredRules: number
    assessedRules: number
    remainingRules: number
    weakRules: number
    dueRules: number
    overdueRules: number
    repeatedFailureRules: number
    scheduledReviewRules: number
  }
  todayProgress: {
    plannedMinutes: number
    completedMinutes: number
    remainingMinutes: number
    studiedRules: number
    assessedRules: number
    planComplete: boolean
    eligibleWorkComplete: boolean
  }
  blocks: RecommendedSessionBlock[]
}

type AllocationInput = {
  minutes: number
  phase: RecommendationPhase
  uncoveredCount: number
  recallCount: number
  minimumMinutes?: number
}

export type RecommendationAllocation = {
  studyMinutes: number
  recallMinutes: number
  studyCount: number
  recallCount: number
  recallMode: Exclude<RecommendedBlockMode, "study">
}


type RuleMetaRow = {
  id: string
  title: string
  priority: string | null
  subjects: { name: string } | null
  topics: { name: string } | null
}

type ProgressDbRow = {
  rule_id: string
  attempts: number | null
  correct_count: number | null
  incorrect_count: number | null
  needs_practice: boolean | null
  mastery_level: number | null
  rolling_average: unknown
  mastery_confidence: number | null
  learning_status: string | null
  effective_evidence: unknown
  successful_recall_count: number | null
  distinct_modes: number | null
  engine_version: string | null
  next_review_at: Date | null
  interval_minutes: number | null
  last_score: number | null
}

type CycleDbRow = {
  rule_id: string
  last_studied_at: Date | null
  last_assessed_at: Date | null
}

type RecentAttemptRow = {
  rule_id: string
  score: number
}

type CandidateRule = {
  id: string
  title: string
  subjectName: string
  topicName: string
  priority: string
  covered: boolean
  assessed: boolean
  passed: boolean
  needsPractice: boolean
  mastery: number
  confidence: number
  attempts: number
  correctCount: number
  incorrectCount: number
  lastScore: number | null
  learningStatus: LearningStatus
  failureStreak: number
  nextReviewAt: Date | null
  lastStudiedAt: Date | null
  lastAssessedAt: Date | null
  review: AdaptiveReviewDecision
}

const MIN_DAILY_MINUTES = 10
const MAX_DAILY_MINUTES = 120
const DEFAULT_DAILY_MINUTES = 30

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeMinutes(
  value: unknown,
  minimumMinutes: number = MIN_DAILY_MINUTES
) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_DAILY_MINUTES
  return clamp(
    Math.round(numeric),
    Math.max(0, Math.round(minimumMinutes)),
    MAX_DAILY_MINUTES
  )
}

function recallSecondsPerRule(phase: RecommendationPhase) {
  return phase === "sprint" ? 75 : phase === "accelerated" ? 95 : 110
}

export function estimateTodayProgress(params: {
  plannedMinutes: number
  phase: RecommendationPhase
  studiedRules: number
  assessedRules: number
}) {
  const plannedMinutes = normalizeMinutes(params.plannedMinutes)
  const studyMinutes = Math.max(0, params.studiedRules) * 2.4
  const recallMinutes =
    (Math.max(0, params.assessedRules) * recallSecondsPerRule(params.phase)) / 60
  const completedMinutes = Math.min(
    plannedMinutes,
    Math.max(0, Math.round(studyMinutes + recallMinutes))
  )

  return {
    plannedMinutes,
    completedMinutes,
    remainingMinutes: Math.max(0, plannedMinutes - completedMinutes),
  }
}

function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function priorityWeight(value: string) {
  const clean = value.trim().toLowerCase()
  if (["critical", "emergency", "golden", "highly_tested"].includes(clean)) return 4
  if (["high", "priority", "most_tested"].includes(clean)) return 3
  if (["medium", "core"].includes(clean)) return 2
  return 1
}

export function getRecommendationPhase(daysUntilExam: number | null): RecommendationPhase {
  if (daysUntilExam !== null && daysUntilExam <= 14) return "sprint"
  if (daysUntilExam !== null && daysUntilExam <= 45) return "accelerated"
  return "foundation"
}

export function buildRecommendationAllocation({
  minutes,
  phase,
  uncoveredCount,
  recallCount,
  minimumMinutes = MIN_DAILY_MINUTES,
}: AllocationInput): RecommendationAllocation {
  const safeMinutes = normalizeMinutes(minutes, minimumMinutes)

  if (safeMinutes <= 0) {
    return {
      studyMinutes: 0,
      recallMinutes: 0,
      studyCount: 0,
      recallCount: 0,
      recallMode:
        phase === "sprint"
          ? "timed"
          : phase === "accelerated"
            ? "weak_focus"
            : "quiz",
    }
  }

  let studyShare = phase === "foundation" ? 0.6 : phase === "accelerated" ? 0.35 : 0.1

  if (uncoveredCount <= 0) studyShare = 0
  if (recallCount <= 0) studyShare = 1

  let studyMinutes = Math.round(safeMinutes * studyShare)
  let recallMinutes = safeMinutes - studyMinutes

  if (safeMinutes < 10) {
    if (recallCount > 0) {
      studyMinutes = 0
      recallMinutes = safeMinutes
    } else {
      studyMinutes = safeMinutes
      recallMinutes = 0
    }
  }

  if (safeMinutes >= 10 && studyMinutes > 0 && studyMinutes < 5) {
    studyMinutes = 5
    recallMinutes = Math.max(0, safeMinutes - studyMinutes)
  }

  if (safeMinutes >= 10 && recallMinutes > 0 && recallMinutes < 5) {
    recallMinutes = 5
    studyMinutes = Math.max(0, safeMinutes - recallMinutes)
  }

  const studyCount = Math.min(
    uncoveredCount,
    studyMinutes > 0 ? Math.max(1, Math.floor(studyMinutes / 2.4)) : 0
  )
  const secondsPerRecallRule = recallSecondsPerRule(phase)
  const recallCountForBudget = Math.min(
    recallCount,
    recallMinutes > 0
      ? Math.max(1, Math.floor((recallMinutes * 60) / secondsPerRecallRule))
      : 0
  )

  return {
    studyMinutes: studyCount > 0 ? studyMinutes : 0,
    recallMinutes: recallCountForBudget > 0 ? recallMinutes : 0,
    studyCount,
    recallCount: recallCountForBudget,
    recallMode:
      phase === "sprint"
        ? "timed"
        : phase === "accelerated"
          ? "weak_focus"
          : "quiz",
  }
}

function calculateDaysUntilExam(examDate: Date | null) {
  if (!examDate) return null
  const today = startOfLocalDay(new Date())
  const exam = startOfLocalDay(examDate)
  return Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86_400_000))
}

function phaseCopy(phase: RecommendationPhase) {
  if (phase === "sprint") {
    return {
      label: "Adaptive Recall Sprint",
      headline: "Protect recall under exam pressure",
      summary:
        "The exam is close, so today prioritizes fast independent recall, weak rules, and overdue reviews instead of broad new coverage.",
    }
  }

  if (phase === "accelerated") {
    return {
      label: "Accelerated Recall",
      headline: "Balance new coverage with targeted retrieval",
      summary:
        "Today combines a smaller new-rule block with a larger recall block so coverage keeps moving without sacrificing retention.",
    }
  }

  return {
    label: "Foundation Cycle",
    headline: "Build coverage without losing yesterday's rules",
    summary:
      "Today emphasizes new rule coverage and reserves focused time for independent recall of rules already introduced.",
  }
}

function isToday(value: Date | null, todayStart: Date) {
  if (!value) return false
  return value.getTime() >= todayStart.getTime()
}

export async function buildDailyLearningRecommendation(params: {
  userId: string
  minutes?: number
}): Promise<DailyLearningRecommendation> {
  const requestedMinutes = normalizeMinutes(params.minutes)
  const now = new Date()
  const todayStart = startOfLocalDay(now)
  const todayKey = dateKey(now)

  const [cycleSummary, studyPlan] = await Promise.all([
    getLearningCycleSummary(params.userId),
    prisma.studyPlan.findUnique({
      where: { userId: params.userId },
      select: { examDate: true },
    }),
  ])

  const canonicalRuleIds = Object.keys(cycleSummary.ruleStateById)
  const recentAttemptCutoff = new Date(now.getTime() - 180 * 86_400_000)

  const [ruleRows, progressRows, cycleRows, recentAttemptRows] =
    await Promise.all([
      canonicalRuleIds.length
        ? prisma.rules.findMany({
            where: { id: { in: canonicalRuleIds } },
            select: {
              id: true,
              title: true,
              priority: true,
              subjects: { select: { name: true } },
              topics: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      canonicalRuleIds.length
        ? prisma.user_rule_progress.findMany({
            where: {
              user_id: params.userId,
              rule_id: { in: canonicalRuleIds },
            },
            select: {
              rule_id: true,
              next_review_at: true,
              interval_minutes: true,
              last_score: true,
              ...LEARNING_PROGRESS_SELECT,
            },
          })
        : Promise.resolve([]),
      canonicalRuleIds.length
        ? prisma.user_rule_cycle_progress.findMany({
            where: {
              user_id: params.userId,
              cycle_id: cycleSummary.cycle.id,
              rule_id: { in: canonicalRuleIds },
            },
            select: {
              rule_id: true,
              last_studied_at: true,
              last_assessed_at: true,
            },
          })
        : Promise.resolve([]),
      canonicalRuleIds.length
        ? prisma.user_rule_attempts.findMany({
            where: {
              user_id: params.userId,
              rule_id: { in: canonicalRuleIds },
              created_at: { gte: recentAttemptCutoff },
              training_context: { in: ["quiz", "timed", "weak_focus"] },
              revealed_answer: false,
              self_reported: false,
            },
            orderBy: { created_at: "desc" },
            take: 5000,
            select: {
              rule_id: true,
              score: true,
            },
          })
        : Promise.resolve([]),
    ])

  const ruleMeta = new Map<string, RuleMetaRow>(
    (ruleRows as RuleMetaRow[]).map((row) => [row.id, row])
  )
  const progressMap = new Map<string, ProgressDbRow>(
    (progressRows as ProgressDbRow[]).map((row) => [row.rule_id, row])
  )
  const cycleMap = new Map<string, CycleDbRow>(
    (cycleRows as CycleDbRow[]).map((row) => [row.rule_id, row])
  )
  const recentScoresByRule = new Map<string, number[]>()

  for (const row of recentAttemptRows as RecentAttemptRow[]) {
    const scores = recentScoresByRule.get(row.rule_id) ?? []
    if (scores.length >= 5) continue
    scores.push(Number(row.score ?? 0))
    recentScoresByRule.set(row.rule_id, scores)
  }

  const candidates: CandidateRule[] = canonicalRuleIds.map((ruleId) => {
    const state = cycleSummary.ruleStateById[ruleId]
    const meta = ruleMeta.get(ruleId)
    const progressRow = progressMap.get(ruleId)
    const cycle = cycleMap.get(ruleId)
    const progress = resolveLearningProgress(progressRow ?? {})
    const scores = recentScoresByRule.get(ruleId) ?? []
    const failureStreak = countConsecutiveRecallFailures(scores)
    const covered = Boolean(state?.covered)
    const assessed = Boolean(state?.assessed)
    const lastStudiedAt = cycle?.last_studied_at ?? null
    const nextReviewAt = progressRow?.next_review_at ?? null
    const priority = String(meta?.priority ?? "")
    const review = buildAdaptiveReviewDecision({
      covered,
      assessed,
      isWeak: progress.isWeak,
      learningStatus: progress.status,
      mastery: progress.mastery,
      confidence: progress.confidence,
      nextReviewAt,
      lastStudiedAt,
      failureStreak,
      lastScore: progressRow?.last_score ?? null,
      priorityWeight: priorityWeight(priority),
      now,
    })

    return {
      id: ruleId,
      title: meta?.title ?? "Rule",
      subjectName: meta?.subjects?.name ?? "Unassigned subject",
      topicName: meta?.topics?.name ?? "General",
      priority,
      covered,
      assessed,
      passed: Boolean(state?.passed),
      needsPractice: progress.isWeak,
      mastery: progress.mastery,
      confidence: progress.confidence,
      attempts: progress.attempts,
      correctCount: Number(progressRow?.correct_count ?? 0),
      incorrectCount: Number(progressRow?.incorrect_count ?? 0),
      lastScore:
        progressRow?.last_score === null ||
        progressRow?.last_score === undefined
          ? null
          : Number(progressRow.last_score),
      learningStatus: progress.status,
      failureStreak,
      nextReviewAt,
      lastStudiedAt,
      lastAssessedAt: cycle?.last_assessed_at ?? null,
      review,
    }
  })

  const examDate = studyPlan?.examDate ?? null
  const daysUntilExam = calculateDaysUntilExam(examDate)
  const phase = getRecommendationPhase(daysUntilExam)
  const copy = phaseCopy(phase)

  const uncovered = candidates
    .filter((rule) => !rule.covered)
    .sort((a, b) => {
      const priorityDifference =
        priorityWeight(b.priority) - priorityWeight(a.priority)
      if (priorityDifference !== 0) return priorityDifference
      return (
        stableHash(`${todayKey}:${a.id}`) -
        stableHash(`${todayKey}:${b.id}`)
      )
    })

  const recallPool = candidates
    .filter(
      (rule) =>
        rule.review.availableNow &&
        !isToday(rule.lastAssessedAt, todayStart)
    )
    .sort((a, b) => {
      if (a.review.priorityScore !== b.review.priorityScore) {
        return b.review.priorityScore - a.review.priorityScore
      }
      if (a.mastery !== b.mastery) return a.mastery - b.mastery
      const priorityDifference =
        priorityWeight(b.priority) - priorityWeight(a.priority)
      if (priorityDifference !== 0) return priorityDifference
      return (
        stableHash(`${todayKey}:recall:${a.id}`) -
        stableHash(`${todayKey}:recall:${b.id}`)
      )
    })

  const studiedRulesToday = candidates.filter((rule) =>
    isToday(rule.lastStudiedAt, todayStart)
  ).length
  const assessedRulesToday = candidates.filter((rule) =>
    isToday(rule.lastAssessedAt, todayStart)
  ).length
  const progress = estimateTodayProgress({
    plannedMinutes: requestedMinutes,
    phase,
    studiedRules: studiedRulesToday,
    assessedRules: assessedRulesToday,
  })

  const allocation = buildRecommendationAllocation({
    minutes: progress.remainingMinutes,
    minimumMinutes: 0,
    phase,
    uncoveredCount: uncovered.length,
    recallCount: recallPool.length,
  })

  const blocks: RecommendedSessionBlock[] = []

  if (allocation.studyCount > 0) {
    const selected = uncovered.slice(0, allocation.studyCount)
    blocks.push({
      id: `study-${todayKey}`,
      mode: "study",
      title: "New rule coverage",
      description: `${selected.length} new ${
        selected.length === 1 ? "rule" : "rules"
      } from the current learning cycle`,
      reason:
        phase === "foundation"
          ? "Move the cycle forward while the rule remains visible for careful encoding. Each studied rule will later enter independent recall."
          : "Add only a controlled amount of new material so scheduled recall remains the priority.",
      minutes: allocation.studyMinutes,
      estimatedRules: selected.length,
      ruleIds: selected.map((rule) => rule.id),
      subjectNames: Array.from(
        new Set(selected.map((rule) => rule.subjectName))
      ).slice(0, 4),
      completedToday: selected.every((rule) =>
        isToday(rule.lastStudiedAt, todayStart)
      ),
      ruleExplanations: selected.map((rule) => ({
        ruleId: rule.id,
        title: rule.title,
        subjectName: rule.subjectName,
        topicName: rule.topicName,
        statusLabel: "New this cycle",
        reason: "This rule has not been covered in the current learning cycle yet.",
        timingLabel: "First recall scheduled after study",
        dueAt: null,
        failureStreak: 0,
        mastery: rule.mastery,
        category: "new_rule",
      })),
    })
  }

  if (allocation.recallCount > 0) {
    const selected = recallPool.slice(0, allocation.recallCount)
    const repeatedFailures = selected.filter(
      (rule) => rule.failureStreak >= 2
    ).length
    const weakDue = selected.filter(
      (rule) =>
        rule.review.tier === "OVERDUE_LAPSE" ||
        rule.review.tier === "DUE_WEAK"
    ).length
    const firstRecalls = selected.filter(
      (rule) => rule.review.tier === "FIRST_RECALL"
    ).length
    const mode =
      phase === "sprint"
        ? "timed"
        : repeatedFailures > 0 || weakDue > 0
          ? "weak_focus"
          : allocation.recallMode

    const selectionParts = [
      repeatedFailures > 0
        ? `${repeatedFailures} repeated ${
            repeatedFailures === 1 ? "lapse" : "lapses"
          }`
        : null,
      weakDue > 0
        ? `${weakDue} weak ${weakDue === 1 ? "rule" : "rules"} due`
        : null,
      firstRecalls > 0
        ? `${firstRecalls} first ${
            firstRecalls === 1 ? "recall" : "recalls"
          }`
        : null,
    ].filter(Boolean)

    blocks.push({
      id: `recall-${todayKey}`,
      mode,
      title:
        mode === "timed"
          ? "Timed recall sprint"
          : mode === "weak_focus"
            ? "Adaptive weak-focus review"
            : "Scheduled independent recall",
      description:
        selectionParts.length > 0
          ? `${selected.length} ${
              selected.length === 1 ? "rule" : "rules"
            }: ${selectionParts.join(" • ")}`
          : `${selected.length} scheduled ${
              selected.length === 1 ? "review" : "reviews"
            } selected by retention strength`,
      reason:
        mode === "timed"
          ? "The exam is close, so due and weak rules are retrieved under time pressure. Strong rules remain on longer intervals."
          : repeatedFailures > 0
            ? "Rules missed repeatedly return sooner. A successful independent recall will begin extending their intervals again."
            : "The queue follows each rule’s next-review date. Weak rules return sooner, while strong rules remain spaced farther apart.",
      minutes: allocation.recallMinutes,
      estimatedRules: selected.length,
      ruleIds: selected.map((rule) => rule.id),
      subjectNames: Array.from(
        new Set(selected.map((rule) => rule.subjectName))
      ).slice(0, 4),
      completedToday: selected.every((rule) =>
        isToday(rule.lastAssessedAt, todayStart)
      ),
      ruleExplanations: selected.map((rule) => ({
        ruleId: rule.id,
        title: rule.title,
        subjectName: rule.subjectName,
        topicName: rule.topicName,
        statusLabel:
          rule.review.tier === "FIRST_RECALL"
            ? getReviewTierLabel(rule.review.tier)
            : getLearningStatusLabel(rule.learningStatus),
        reason: rule.review.reason,
        timingLabel: formatReviewTiming(rule.review.dueAt, now),
        dueAt: rule.review.dueAt?.toISOString() ?? null,
        failureStreak: rule.failureStreak,
        mastery: rule.mastery,
        category:
          rule.review.tier === "FIRST_RECALL"
            ? "first_recall"
            : rule.failureStreak >= 2 || rule.needsPractice
              ? "priority_rule"
              : "due_review",
      })),
    })
  }

  const dueRules = candidates.filter(
    (rule) =>
      rule.assessed &&
      (rule.review.urgency === "DUE" ||
        rule.review.urgency === "OVERDUE")
  ).length
  const overdueRules = candidates.filter(
    (rule) => rule.assessed && rule.review.urgency === "OVERDUE"
  ).length
  const repeatedFailureRules = candidates.filter(
    (rule) => rule.assessed && rule.failureStreak >= 2
  ).length
  const scheduledReviewRules = candidates.filter(
    (rule) =>
      rule.assessed &&
      rule.review.urgency === "NOT_DUE" &&
      rule.nextReviewAt !== null
  ).length
  const remainingRules = candidates.filter((rule) => !rule.covered).length
  const weakRules = candidates.filter(
    (rule) => rule.assessed && rule.needsPractice
  ).length
  const primary =
    blocks.find((block) => !block.completedToday) ?? blocks[0] ?? null
  const eligibleWorkComplete = blocks.length === 0
  const planComplete = progress.remainingMinutes <= 0 || eligibleWorkComplete

  return {
    generatedAt: now.toISOString(),
    dateKey: todayKey,
    requestedMinutes,
    recommendedMinutes: DEFAULT_DAILY_MINUTES,
    phase,
    phaseLabel: copy.label,
    headline: planComplete
      ? "Today’s learning plan is complete"
      : copy.headline,
    summary: planComplete
      ? eligibleWorkComplete && progress.remainingMinutes > 0
        ? scheduledReviewRules > 0
          ? "No additional reviews are due right now. The next rules will return automatically when their spaced-review intervals mature."
          : "You completed all currently eligible rules for today. Optional extra practice remains available from the manual session builder."
        : "Your planned learning budget is complete. Stop here or continue with optional manual practice."
      : copy.summary,
    examDate: examDate?.toISOString() ?? null,
    daysUntilExam,
    cycleNumber: cycleSummary.cycle.number,
    primaryBlockId: primary?.id ?? null,
    totals: {
      availableRules: candidates.length,
      coveredRules: candidates.filter((rule) => rule.covered).length,
      assessedRules: candidates.filter((rule) => rule.assessed).length,
      remainingRules,
      weakRules,
      dueRules,
      overdueRules,
      repeatedFailureRules,
      scheduledReviewRules,
    },
    todayProgress: {
      plannedMinutes: progress.plannedMinutes,
      completedMinutes: progress.completedMinutes,
      remainingMinutes: progress.remainingMinutes,
      studiedRules: studiedRulesToday,
      assessedRules: assessedRulesToday,
      planComplete,
      eligibleWorkComplete,
    },
    blocks,
  }
}

import { prisma } from "@/lib/prisma"
import { getApplicableRuleUniverseForUser } from "@/lib/rules/registry"
import { normalizeTrainingContext } from "./evidence"
import type { TrainingContext } from "./types"

type DbClient = Pick<
  typeof prisma,
  "rules" | "learning_cycles" | "user_rule_cycle_progress"
>

type CanonicalRule = {
  id: string
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string
  title: string
}

export type LearningCycleRuleState = {
  ruleId: string
  covered: boolean
  studied: boolean
  assessed: boolean
  passed: boolean
  studyExposures: number
  assessedAttempts: number
  passedAssessments: number
  bestAssessmentScore: number | null
}

export type LearningCycleSummary = {
  cycle: {
    id: string
    number: number
    status: string
    startedAt: string
    completedAt: string | null
  }
  totals: {
    rules: number
    covered: number
    assessed: number
    passed: number
    remainingStudy: number
    remainingQuiz: number
    coveragePercentage: number
    assessmentPercentage: number
    isComplete: boolean
  }
  subjects: Array<{
    subjectId: string
    subjectName: string
    totalRules: number
    coveredRules: number
    assessedRules: number
    passedRules: number
    coveragePercentage: number
    isComplete: boolean
    topics: Array<{
      topicId: string | null
      topicName: string
      totalRules: number
      coveredRules: number
      assessedRules: number
      passedRules: number
      remainingStudyRules: number
      remainingQuizRules: number
      coveragePercentage: number
      isComplete: boolean
    }>
  }>
  ruleStateById: Record<string, LearningCycleRuleState>
}

function makeRuleKey(rule: {
  subject_id?: string | null
  topic_id?: string | null
  subtopic_id?: string | null
  title?: string | null
}) {
  return [
    String(rule.subject_id ?? "").trim().toLowerCase(),
    String(rule.topic_id ?? "").trim().toLowerCase(),
    String(rule.subtopic_id ?? "").trim().toLowerCase(),
    String(rule.title ?? "").trim().toLowerCase(),
  ].join("::")
}

function isBetterRule(
  candidate: {
    prompt_question?: string | null
    rule_text?: string | null
    updated_at?: Date | null
    created_at?: Date | null
  },
  current?: {
    prompt_question?: string | null
    rule_text?: string | null
    updated_at?: Date | null
    created_at?: Date | null
  } | null
) {
  if (!current) return true

  const candidateHasPrompt = Boolean(String(candidate.prompt_question ?? "").trim())
  const currentHasPrompt = Boolean(String(current.prompt_question ?? "").trim())
  if (candidateHasPrompt !== currentHasPrompt) return candidateHasPrompt

  const candidateHasRule = Boolean(String(candidate.rule_text ?? "").trim())
  const currentHasRule = Boolean(String(current.rule_text ?? "").trim())
  if (candidateHasRule !== currentHasRule) return candidateHasRule

  const candidateUpdated = candidate.updated_at?.getTime() ?? 0
  const currentUpdated = current.updated_at?.getTime() ?? 0
  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated

  return (candidate.created_at?.getTime() ?? 0) > (current.created_at?.getTime() ?? 0)
}

export async function getCanonicalLearningRules(
  client: DbClient = prisma
): Promise<CanonicalRule[]> {
  const rows = await client.rules.findMany({
    where: {
      is_active: true,
      rule_type: null,
      prompt_question: { not: null },
      rule_text: { not: "" },
      subject_id: { not: null },
    },
    select: {
      id: true,
      subject_id: true,
      topic_id: true,
      subtopic_id: true,
      title: true,
      prompt_question: true,
      rule_text: true,
      updated_at: true,
      created_at: true,
      subjects: { select: { name: true } },
      topics: { select: { name: true } },
    },
  })

  const canonical = new Map<string, (typeof rows)[number]>()

  for (const row of rows) {
    if (!row.subject_id) continue
    if (!String(row.prompt_question ?? "").trim()) continue
    if (!String(row.rule_text ?? "").trim()) continue

    const key = makeRuleKey(row)
    const current = canonical.get(key)
    if (isBetterRule(row, current)) canonical.set(key, row)
  }

  return Array.from(canonical.values()).map((row) => ({
    id: row.id,
    subjectId: row.subject_id!,
    subjectName: row.subjects?.name ?? "Unassigned subject",
    topicId: row.topic_id ?? null,
    topicName: row.topics?.name ?? "General",
    title: row.title,
  }))
}

export async function getApplicableLearningRulesForUser(
  userId: string
): Promise<CanonicalRule[]> {
  const universe = await getApplicableRuleUniverseForUser(userId)

  return universe.rules.map((rule) => ({
    id: rule.id,
    subjectId: rule.subjectId,
    subjectName: rule.subjectName,
    topicId: rule.topicId,
    topicName: rule.topicName,
    title: rule.title,
  }))
}

export async function ensureActiveLearningCycle(
  userId: string,
  client: DbClient = prisma
) {
  const active = await client.learning_cycles.findFirst({
    where: { user_id: userId, status: "ACTIVE" },
    orderBy: { cycle_number: "desc" },
  })

  if (active) return active

  const latest = await client.learning_cycles.findFirst({
    where: { user_id: userId },
    orderBy: { cycle_number: "desc" },
    select: { cycle_number: true },
  })

  const cycleNumber = (latest?.cycle_number ?? 0) + 1

  return client.learning_cycles.upsert({
    where: {
      user_id_cycle_number: {
        user_id: userId,
        cycle_number: cycleNumber,
      },
    },
    update: {
      status: "ACTIVE",
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      cycle_number: cycleNumber,
      status: "ACTIVE",
    },
  })
}

export async function recordLearningCycleProgress(params: {
  client: DbClient
  userId: string
  ruleId: string
  trainingContext: TrainingContext | string
  score: number
  revealedAnswer: boolean
  selfReported: boolean
  now: Date
}) {
  const {
    client,
    userId,
    ruleId,
    score,
    revealedAnswer,
    selfReported,
    now,
  } = params
  const context = normalizeTrainingContext(params.trainingContext)
  const cycle = await ensureActiveLearningCycle(userId, client)
  const isStudy = context === "study" || revealedAnswer || selfReported
  const isAssessment = !isStudy
  const passed = isAssessment && score >= 80

  const existing = await client.user_rule_cycle_progress.findUnique({
    where: {
      cycle_id_rule_id: {
        cycle_id: cycle.id,
        rule_id: ruleId,
      },
    },
    select: {
      study_exposures: true,
      assessed_attempts: true,
      passed_assessments: true,
      best_assessment_score: true,
      first_studied_at: true,
      first_assessed_at: true,
      covered_at: true,
    },
  })

  const nextBest = isAssessment
    ? Math.max(existing?.best_assessment_score ?? 0, score)
    : existing?.best_assessment_score ?? null

  return client.user_rule_cycle_progress.upsert({
    where: {
      cycle_id_rule_id: {
        cycle_id: cycle.id,
        rule_id: ruleId,
      },
    },
    update: {
      study_exposures: isStudy ? { increment: 1 } : undefined,
      assessed_attempts: isAssessment ? { increment: 1 } : undefined,
      passed_assessments: passed ? { increment: 1 } : undefined,
      best_assessment_score: nextBest,
      first_studied_at: isStudy && !existing?.first_studied_at ? now : undefined,
      last_studied_at: isStudy ? now : undefined,
      first_assessed_at:
        isAssessment && !existing?.first_assessed_at ? now : undefined,
      last_assessed_at: isAssessment ? now : undefined,
      covered_at: existing?.covered_at ?? now,
      updated_at: now,
    },
    create: {
      user_id: userId,
      cycle_id: cycle.id,
      rule_id: ruleId,
      study_exposures: isStudy ? 1 : 0,
      assessed_attempts: isAssessment ? 1 : 0,
      passed_assessments: passed ? 1 : 0,
      best_assessment_score: isAssessment ? score : null,
      first_studied_at: isStudy ? now : null,
      last_studied_at: isStudy ? now : null,
      first_assessed_at: isAssessment ? now : null,
      last_assessed_at: isAssessment ? now : null,
      covered_at: now,
      updated_at: now,
    },
  })
}

export async function getLearningCycleSummary(
  userId: string,
  client: DbClient = prisma
): Promise<LearningCycleSummary> {
  const cycle = await ensureActiveLearningCycle(userId, client)
  const [rules, rows] = await Promise.all([
    getApplicableLearningRulesForUser(userId),
    client.user_rule_cycle_progress.findMany({
      where: { user_id: userId, cycle_id: cycle.id },
      select: {
        rule_id: true,
        study_exposures: true,
        assessed_attempts: true,
        passed_assessments: true,
        best_assessment_score: true,
      },
    }),
  ])

  const progressByRule = new Map(rows.map((row) => [row.rule_id, row]))
  const ruleStateById: Record<string, LearningCycleRuleState> = {}
  const subjectMap = new Map<
    string,
    {
      subjectId: string
      subjectName: string
      rules: CanonicalRule[]
    }
  >()

  for (const rule of rules) {
    const progress = progressByRule.get(rule.id)
    const studied = (progress?.study_exposures ?? 0) > 0
    const assessed = (progress?.assessed_attempts ?? 0) > 0
    const passed = (progress?.passed_assessments ?? 0) > 0

    ruleStateById[rule.id] = {
      ruleId: rule.id,
      covered: studied || assessed,
      studied,
      assessed,
      passed,
      studyExposures: progress?.study_exposures ?? 0,
      assessedAttempts: progress?.assessed_attempts ?? 0,
      passedAssessments: progress?.passed_assessments ?? 0,
      bestAssessmentScore: progress?.best_assessment_score ?? null,
    }

    const subject = subjectMap.get(rule.subjectId) ?? {
      subjectId: rule.subjectId,
      subjectName: rule.subjectName,
      rules: [],
    }
    subject.rules.push(rule)
    subjectMap.set(rule.subjectId, subject)
  }

  const subjects = Array.from(subjectMap.values())
    .map((subject) => {
      const topicMap = new Map<string, CanonicalRule[]>()
      for (const rule of subject.rules) {
        const key = rule.topicId ?? `general:${subject.subjectId}`
        const list = topicMap.get(key) ?? []
        list.push(rule)
        topicMap.set(key, list)
      }

      const topics = Array.from(topicMap.values())
        .map((topicRules) => {
          const first = topicRules[0]
          const coveredRules = topicRules.filter(
            (rule) => ruleStateById[rule.id]?.covered
          ).length
          const assessedRules = topicRules.filter(
            (rule) => ruleStateById[rule.id]?.assessed
          ).length
          const passedRules = topicRules.filter(
            (rule) => ruleStateById[rule.id]?.passed
          ).length
          const totalRules = topicRules.length

          return {
            topicId: first.topicId,
            topicName: first.topicName,
            totalRules,
            coveredRules,
            assessedRules,
            passedRules,
            remainingStudyRules: Math.max(0, totalRules - coveredRules),
            remainingQuizRules: Math.max(0, totalRules - assessedRules),
            coveragePercentage:
              totalRules > 0 ? Math.round((coveredRules / totalRules) * 100) : 0,
            isComplete: totalRules > 0 && coveredRules >= totalRules,
          }
        })
        .sort((a, b) => a.topicName.localeCompare(b.topicName))

      const totalRules = subject.rules.length
      const coveredRules = subject.rules.filter(
        (rule) => ruleStateById[rule.id]?.covered
      ).length
      const assessedRules = subject.rules.filter(
        (rule) => ruleStateById[rule.id]?.assessed
      ).length
      const passedRules = subject.rules.filter(
        (rule) => ruleStateById[rule.id]?.passed
      ).length

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalRules,
        coveredRules,
        assessedRules,
        passedRules,
        coveragePercentage:
          totalRules > 0 ? Math.round((coveredRules / totalRules) * 100) : 0,
        isComplete: totalRules > 0 && coveredRules >= totalRules,
        topics,
      }
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName))

  const totalRules = rules.length
  const covered = Object.values(ruleStateById).filter((row) => row.covered).length
  const assessed = Object.values(ruleStateById).filter((row) => row.assessed).length
  const passed = Object.values(ruleStateById).filter((row) => row.passed).length

  return {
    cycle: {
      id: cycle.id,
      number: cycle.cycle_number,
      status: cycle.status,
      startedAt: cycle.started_at.toISOString(),
      completedAt: cycle.completed_at?.toISOString() ?? null,
    },
    totals: {
      rules: totalRules,
      covered,
      assessed,
      passed,
      remainingStudy: Math.max(0, totalRules - covered),
      remainingQuiz: Math.max(0, totalRules - assessed),
      coveragePercentage:
        totalRules > 0 ? Math.round((covered / totalRules) * 100) : 0,
      assessmentPercentage:
        totalRules > 0 ? Math.round((assessed / totalRules) * 100) : 0,
      isComplete: totalRules > 0 && covered >= totalRules,
    },
    subjects,
    ruleStateById,
  }
}

export async function advanceLearningCycle(params: {
  userId: string
  action: "start_next" | "restart_current"
  reason?: string
}) {
  const { userId, action, reason } = params

  return prisma.$transaction(async (tx) => {
    const current = await ensureActiveLearningCycle(userId, tx)
    const now = new Date()

    await tx.learning_cycles.update({
      where: { id: current.id },
      data: {
        status: action === "start_next" ? "COMPLETED" : "ARCHIVED",
        completed_at: action === "start_next" ? now : undefined,
        archived_at: action === "restart_current" ? now : undefined,
        reset_reason: action === "restart_current" ? reason?.trim() || null : undefined,
        updated_at: now,
      },
    })

    return tx.learning_cycles.create({
      data: {
        user_id: userId,
        cycle_number: current.cycle_number + 1,
        status: "ACTIVE",
        started_at: now,
        updated_at: now,
      },
    })
  })
}

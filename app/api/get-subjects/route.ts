import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

  const candidateHasPrompt = !!String(candidate.prompt_question ?? "").trim()
  const currentHasPrompt = !!String(current.prompt_question ?? "").trim()

  if (candidateHasPrompt && !currentHasPrompt) return true
  if (!candidateHasPrompt && currentHasPrompt) return false

  const candidateHasRuleText = !!String(candidate.rule_text ?? "").trim()
  const currentHasRuleText = !!String(current.rule_text ?? "").trim()

  if (candidateHasRuleText && !currentHasRuleText) return true
  if (!candidateHasRuleText && currentHasRuleText) return false

  const candidateUpdated = candidate.updated_at?.getTime() ?? 0
  const currentUpdated = current.updated_at?.getTime() ?? 0
  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated

  const candidateCreated = candidate.created_at?.getTime() ?? 0
  const currentCreated = current.created_at?.getTime() ?? 0
  return candidateCreated > currentCreated
}

function buildExamBadge(subject: {
  name: string
  exam_status?: string | null
}) {
  const status = String(subject.exam_status ?? "").trim()

  if (subject.name === "Family Law") {
    return {
      badge_text: "No longer tested on MEE starting July 2026",
      badge_tone: "removed",
      badge_subtext: "Still tested regularly through the MPT through February 2028",
    }
  }

  if (subject.name === "Trusts and Estates") {
    return {
      badge_text: "No longer tested on MEE starting July 2026",
      badge_tone: "removed",
      badge_subtext: "Still tested regularly through the MPT through February 2028",
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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const subjects = await prisma.subjects.findMany({
      where: {
        show_in_rule_training: true,
      },
      orderBy: {
        order_index: "asc",
      },
      select: {
        id: true,
        name: true,
        exam_status: true,
        show_in_rule_training: true,
        show_in_analytics: true,
      },
    })

    const rawRules = await prisma.rules.findMany({
      where: {
        is_active: true,
        prompt_question: {
          not: null,
        },
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
      },
    })

    const canonicalByKey = new Map<string, (typeof rawRules)[number]>()
    const ruleIdToCanonicalKey = new Map<string, string>()
    const canonicalKeyToSubjectId = new Map<string, string>()

    for (const rule of rawRules) {
      if (!rule.subject_id) continue
      if (!String(rule.prompt_question ?? "").trim()) continue
      if (!String(rule.rule_text ?? "").trim()) continue

      const key = makeRuleKey(rule)
      ruleIdToCanonicalKey.set(rule.id, key)
      canonicalKeyToSubjectId.set(key, rule.subject_id)

      const existing = canonicalByKey.get(key)
      if (isBetterRule(rule, existing)) {
        canonicalByKey.set(key, rule)
      }
    }

    const canonicalKeysBySubject = new Map<string, Set<string>>()

    for (const [key, rule] of canonicalByKey.entries()) {
      if (!rule.subject_id) continue

      const existing = canonicalKeysBySubject.get(rule.subject_id) ?? new Set<string>()
      existing.add(key)
      canonicalKeysBySubject.set(rule.subject_id, existing)
    }

    const attemptedBySubject = new Map<string, Set<string>>()
    const weakBySubject = new Map<string, Set<string>>()

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
        const canonicalKey = ruleIdToCanonicalKey.get(row.rule_id)
        if (!canonicalKey) continue

        const subjectId = canonicalKeyToSubjectId.get(canonicalKey)
        if (!subjectId) continue

        if ((row.attempts ?? 0) > 0) {
          const set = attemptedBySubject.get(subjectId) ?? new Set<string>()
          set.add(canonicalKey)
          attemptedBySubject.set(subjectId, set)
        }

        if ((row.mastery_level ?? 0) < 60) {
          const set = weakBySubject.get(subjectId) ?? new Set<string>()
          set.add(canonicalKey)
          weakBySubject.set(subjectId, set)
        }
      }
    }

    const result = subjects
      .map((subject) => {
        const totalRules = canonicalKeysBySubject.get(subject.id)?.size ?? 0
        const completedRules = attemptedBySubject.get(subject.id)?.size ?? 0
        const weakRules = weakBySubject.get(subject.id)?.size ?? 0
        const badge = buildExamBadge(subject)

        return {
          id: subject.id,
          name: subject.name,
          exam_status: subject.exam_status ?? "core",
          show_in_rule_training: subject.show_in_rule_training ?? true,
          show_in_analytics: subject.show_in_analytics ?? true,
          total_rules: totalRules,
          completed_rules: completedRules,
          weak_rules: weakRules,
          badge_text: badge.badge_text,
          badge_tone: badge.badge_tone,
          badge_subtext: badge.badge_subtext,
        }
      })
      .filter((subject) => subject.total_rules > 0)

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
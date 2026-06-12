import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import { getLearningCycleSummary } from "@/lib/learning"
import { getApplicableRuleUniverseForUser } from "@/lib/rules/registry"

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

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
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

export async function GET(req: Request) {
  try {
    const auth = await requireAuthenticatedUser(req)
    if (!auth.ok) return auth.response

    const [cycleSummary, ruleUniverse] = await Promise.all([
      getLearningCycleSummary(auth.userId),
      getApplicableRuleUniverseForUser(auth.userId),
    ])
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId missing" }, { status: 400 })
    }

    const applicableRuleIds = new Set(
      ruleUniverse.rules
        .filter((rule) => rule.subjectId === subjectId)
        .map((rule) => rule.id)
    )

    if (applicableRuleIds.size === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      })
    }

    const rawRules = await prisma.rules.findMany({
      where: {
        subject_id: subjectId,
        is_active: true,
        publication_status: "PUBLISHED",
        prompt_question: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        rule_text: true,
        buzzwords: true,
        topic_id: true,
        subtopic_id: true,
        subject_id: true,
        prompt_question: true,
        application_example: true,
        common_trap: true,
        priority: true,
        updated_at: true,
        created_at: true,
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
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
    })

    const canonicalMap = new Map<string, (typeof rawRules)[number]>()

    for (const rule of rawRules) {
      if (!applicableRuleIds.has(rule.id)) continue
      if (!String(rule.prompt_question ?? "").trim()) continue
      if (!String(rule.rule_text ?? "").trim()) continue

      const key = makeRuleKey(rule)
      const existing = canonicalMap.get(key)

      if (isBetterRule(rule, existing)) {
        canonicalMap.set(key, rule)
      }
    }

    const normalized = Array.from(canonicalMap.values())
      .map((rule) => ({
        id: rule.id,
        title: String(rule.title ?? "").trim(),
        rule_text: String(rule.rule_text ?? "").trim(),
        keywords: normalizeKeywords(rule.buzzwords),
        topic: rule.topics?.name ?? "",
        subtopic: rule.subtopics?.name ?? "",
        subject: rule.subjects?.name ?? "",
        topic_id: rule.topic_id ?? "",
        subtopic_id: rule.subtopic_id ?? "",
        subject_id: rule.subject_id ?? "",
        prompt_question: String(rule.prompt_question ?? "").trim(),
        application_example: String(rule.application_example ?? "").trim(),
        common_trap: String(rule.common_trap ?? "").trim(),
        priority: String(rule.priority ?? "").trim(),
        cycleCovered: Boolean(cycleSummary.ruleStateById[rule.id]?.covered),
        cycleStudied: Boolean(cycleSummary.ruleStateById[rule.id]?.studied),
        cycleAssessed: Boolean(cycleSummary.ruleStateById[rule.id]?.assessed),
        cyclePassed: Boolean(cycleSummary.ruleStateById[rule.id]?.passed),
        cycleNumber: cycleSummary.cycle.number,
      }))
      .sort((a, b) => {
        const topicCompare = a.topic.localeCompare(b.topic)
        if (topicCompare !== 0) return topicCompare

        const subtopicCompare = a.subtopic.localeCompare(b.subtopic)
        if (subtopicCompare !== 0) return subtopicCompare

        return a.title.localeCompare(b.title)
      })

    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    })
  } catch (err) {
    console.error("GET RULES BY SUBJECT ERROR:", err)

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}
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

export async function GET() {
  try {
    const rawRules = await prisma.rules.findMany({
      where: {
        is_active: true,
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
        subject_id: rule.subject_id ?? "",
        subject: rule.subjects?.name ?? "",
        topic_id: rule.topic_id ?? "",
        topic: rule.topics?.name ?? "",
        subtopic_id: rule.subtopic_id ?? "",
        subtopic: rule.subtopics?.name ?? "",
        prompt_question: String(rule.prompt_question ?? "").trim(),
        application_example: String(rule.application_example ?? "").trim(),
        common_trap: String(rule.common_trap ?? "").trim(),
        priority: String(rule.priority ?? "").trim(),
        avgScore: 0,
      }))
      .sort((a, b) => {
        const subjectCompare = a.subject.localeCompare(b.subject)
        if (subjectCompare !== 0) return subjectCompare

        const topicCompare = a.topic.localeCompare(b.topic)
        if (topicCompare !== 0) return topicCompare

        const subtopicCompare = a.subtopic.localeCompare(b.subtopic)
        if (subtopicCompare !== 0) return subtopicCompare

        return a.title.localeCompare(b.title)
      })

    return NextResponse.json(normalized)
  } catch (error) {
    console.error("GET ALL RULES ERROR:", error)
    return NextResponse.json({ error: "Failed to load all rules" }, { status: 500 })
  }
}
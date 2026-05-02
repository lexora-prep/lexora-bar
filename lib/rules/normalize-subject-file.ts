export type TrapItem = {
  title: string
  explanation: string
}

export type CanonicalRule = {
  id: string
  topic: string
  subtopic: string
  title: string
  prompt_question: string
  rule_statement: string
  keywords: string[]
  application_example: string
  how_to_apply: string[]
  common_traps: TrapItem[]
  exam_tip: string
  common_trap: string
  priority: "high" | "medium" | "low"
}

export type CanonicalSubjectFile = {
  subject: string
  version: number
  rule_count: number
  rules: CanonicalRule[]
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function cleanKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

function cleanTrapItems(value: unknown): TrapItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const explanation = item.trim()
        if (!explanation) return null

        return {
          title: `Trap ${index + 1}`,
          explanation,
        }
      }

      if (!item || typeof item !== "object") return null

      const record = item as Record<string, unknown>

      const title =
        cleanString(record.title) ||
        cleanString(record.heading) ||
        cleanString(record.label) ||
        `Trap ${index + 1}`

      const explanation =
        cleanString(record.explanation) ||
        cleanString(record.text) ||
        cleanString(record.body)

      if (!explanation) return null

      return {
        title,
        explanation,
      }
    })
    .filter((item): item is TrapItem => Boolean(item))
}

function cleanPriority(value: unknown): "high" | "medium" | "low" {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "low") return "low"
  if (v === "medium") return "medium"
  return "high"
}

function makeRuleKey(rule: Partial<CanonicalRule>) {
  return [
    cleanString(rule.topic).toLowerCase(),
    cleanString(rule.subtopic).toLowerCase(),
    cleanString(rule.title).toLowerCase(),
  ].join("::")
}

function ruleScore(rule: CanonicalRule) {
  return (
    Number(Boolean(rule.prompt_question)) +
    Number(Boolean(rule.application_example)) +
    Number(rule.how_to_apply.length > 0) +
    Number(rule.common_traps.length > 0) +
    Number(Boolean(rule.exam_tip)) +
    Number(Boolean(rule.common_trap))
  )
}

export function normalizeSubjectFile(input: any): CanonicalSubjectFile {
  const rawRules = Array.isArray(input?.rules) ? input.rules : []

  const deduped = new Map<string, CanonicalRule>()

  for (const raw of rawRules) {
    const commonTraps = cleanTrapItems(raw?.common_traps)

    const normalized: CanonicalRule = {
      id: cleanString(raw?.id),
      topic: cleanString(raw?.topic),
      subtopic: cleanString(raw?.subtopic),
      title: cleanString(raw?.title),
      prompt_question: cleanString(raw?.prompt_question),
      rule_statement: cleanString(raw?.rule_statement),
      keywords: cleanKeywords(raw?.keywords),
      application_example: cleanString(raw?.application_example),
      how_to_apply: cleanStringArray(raw?.how_to_apply),
      common_traps: commonTraps,
      exam_tip: cleanString(raw?.exam_tip),
      common_trap: cleanString(raw?.common_trap),
      priority: cleanPriority(raw?.priority),
    }

    if (!normalized.id || !normalized.title || !normalized.rule_statement) {
      continue
    }

    const key = makeRuleKey(normalized)
    const existing = deduped.get(key)

    if (!existing) {
      deduped.set(key, normalized)
      continue
    }

    if (ruleScore(normalized) > ruleScore(existing)) {
      deduped.set(key, normalized)
    }
  }

  const rules = Array.from(deduped.values()).sort((a, b) => {
    const topicCompare = a.topic.localeCompare(b.topic)
    if (topicCompare !== 0) return topicCompare

    const subtopicCompare = a.subtopic.localeCompare(b.subtopic)
    if (subtopicCompare !== 0) return subtopicCompare

    return a.title.localeCompare(b.title)
  })

  return {
    subject: cleanString(input?.subject),
    version: Number(input?.version || 2),
    rule_count: rules.length,
    rules,
  }
}
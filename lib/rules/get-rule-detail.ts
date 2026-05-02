import fs from "node:fs/promises"
import path from "node:path"

type TrapItem =
  | string
  | {
      title?: string
      heading?: string
      label?: string
      explanation?: string
      text?: string
      body?: string
    }

type RuleRecord = {
  id?: string
  title?: string
  subject?: string
  topic?: string
  subtopic?: string
  rule_statement?: string
  ruleText?: string
  rule_text?: string
  application_example?: string
  how_to_apply?: string[] | string
  howToApply?: string[] | string
  application_steps?: string[] | string
  common_trap?: string
  common_traps?: TrapItem[] | string[] | string
  commonTraps?: TrapItem[] | string[] | string
  exam_tip?: string
  examTip?: string
}

type SubjectFile = {
  subject?: string
  rules?: RuleRecord[]
}

export type NormalizedTrap = {
  title: string
  explanation: string
}

export type RuleDetailResult = {
  id: string
  title: string
  subject: string
  topic: string
  subtopic: string
  ruleText: string
  howToApply: string[]
  commonTraps: NormalizedTrap[]
  applicationExample: string
  examTip: string
}

const DATA_DIR = path.join(process.cwd(), "data")

function toStringArray(value: unknown): string[] {
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
      // Plain string. Keep it as one item.
    }

    return [trimmed]
  }

  return []
}

function pickFirstNonEmptyStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const arr = toStringArray(value)
    if (arr.length > 0) return arr
  }

  return []
}

function normalizeHowToApply(rule: RuleRecord): string[] {
  const direct = pickFirstNonEmptyStringArray(
    rule.how_to_apply,
    rule.howToApply,
    rule.application_steps
  )

  if (direct.length > 0) return direct

  const example =
    typeof rule.application_example === "string"
      ? rule.application_example.trim()
      : ""

  if (!example) return []

  return [
    "Identify the trigger facts that make this rule relevant.",
    "State the rule clearly before analyzing the facts.",
    `Apply the rule to the facts using this example as a model: ${example}`,
    "Conclude directly and note any limitation or exception if the facts suggest one.",
  ]
}

function normalizeTrapArray(value: TrapItem[] | string[]): NormalizedTrap[] {
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

      const title =
        item.title?.trim() ||
        item.heading?.trim() ||
        item.label?.trim() ||
        `Trap ${index + 1}`

      const explanation =
        item.explanation?.trim() ||
        item.text?.trim() ||
        item.body?.trim() ||
        ""

      if (!explanation) return null

      return {
        title,
        explanation,
      }
    })
    .filter((item): item is NormalizedTrap => Boolean(item))
}

function normalizeCommonTraps(rule: RuleRecord): NormalizedTrap[] {
  const arraySource = rule.common_traps ?? rule.commonTraps

  if (Array.isArray(arraySource) && arraySource.length > 0) {
    return normalizeTrapArray(arraySource)
  }

  if (typeof arraySource === "string" && arraySource.trim()) {
    try {
      const parsed = JSON.parse(arraySource)

      if (Array.isArray(parsed)) {
        return normalizeTrapArray(parsed as TrapItem[])
      }
    } catch {
      const explanation = arraySource.trim()

      if (explanation) {
        return [
          {
            title: "Common Trap",
            explanation: explanation.replace(/^Common Trap:\s*/i, "").trim(),
          },
        ]
      }
    }
  }

  const singleTrap =
    typeof rule.common_trap === "string" ? rule.common_trap.trim() : ""

  if (singleTrap) {
    return [
      {
        title: "Common Trap",
        explanation: singleTrap.replace(/^Common Trap:\s*/i, "").trim(),
      },
    ]
  }

  return []
}

function normalizeRuleText(rule: RuleRecord): string {
  return (
    rule.rule_statement?.trim() ||
    rule.rule_text?.trim() ||
    rule.ruleText?.trim() ||
    ""
  )
}

function normalizeExamTip(rule: RuleRecord): string {
  return rule.exam_tip?.trim() || rule.examTip?.trim() || ""
}

async function getOrderedJsonFiles(): Promise<string[]> {
  const files = await fs.readdir(DATA_DIR)

  const jsonFiles = files.filter((file) => file.endsWith(".json"))

  const enriched = jsonFiles
    .filter((file) => file.endsWith(".enriched.json"))
    .sort((a, b) => a.localeCompare(b))

  const normal = jsonFiles
    .filter((file) => !file.endsWith(".enriched.json"))
    .sort((a, b) => a.localeCompare(b))

  return [...enriched, ...normal]
}

export async function getRuleDetailById(
  ruleId: string
): Promise<RuleDetailResult | null> {
  const normalizedRuleId = ruleId.trim()
  if (!normalizedRuleId) return null

  const orderedFiles = await getOrderedJsonFiles()

  for (const file of orderedFiles) {
    const fullPath = path.join(DATA_DIR, file)
    const raw = await fs.readFile(fullPath, "utf8")
    const parsed = JSON.parse(raw) as SubjectFile

    if (!Array.isArray(parsed.rules)) continue

    const rule = parsed.rules.find((item) => item?.id?.trim() === normalizedRuleId)
    if (!rule) continue

    const ruleText = normalizeRuleText(rule)
    const howToApply = normalizeHowToApply(rule)
    const commonTraps = normalizeCommonTraps(rule)
    const applicationExample =
      typeof rule.application_example === "string"
        ? rule.application_example.trim()
        : ""
    const examTip = normalizeExamTip(rule)

    return {
      id: rule.id?.trim() || normalizedRuleId,
      title: rule.title?.trim() || "Untitled Rule",
      subject: parsed.subject?.trim() || rule.subject?.trim() || "Unknown Subject",
      topic: rule.topic?.trim() || "",
      subtopic: rule.subtopic?.trim() || "",
      ruleText,
      howToApply,
      commonTraps,
      applicationExample,
      examTip,
    }
  }

  return null
}
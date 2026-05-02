import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type RuleBankRule = {
  id?: string
  subject?: string
  topic?: string
  subtopic?: string
  title: string
  prompt_question?: string
  promptQuestion?: string
  rule_statement?: string
  rule_text?: string
  ruleText?: string
  explanation?: string
  application_example?: string
  common_trap?: string
  priority?: string
  keywords?: string[]
  buzzwords?: string[]
  cloze_template?: string
  is_active?: boolean
}

type StructuredRuleBankFile = {
  subject?: string
  version?: number
  coverage_standard?: string
  rule_count?: number
  rules: RuleBankRule[]
}

type RuleBankFile = StructuredRuleBankFile | RuleBankRule[]

type SubjectStatus = {
  exam_status: string
  show_in_rule_training: boolean
  show_in_analytics: boolean
}

const SUBJECT_STATUS_MAP: Record<string, SubjectStatus> = {
  "Civil Procedure": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Constitutional Law": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  Contracts: {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  Torts: {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  Evidence: {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Real Property": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  Property: {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Criminal Law and Procedure": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Criminal Law": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Business Associations": {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Family Law": {
    exam_status: "mpt_only",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Trusts and Estates": {
    exam_status: "mpt_only",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  Trusts: {
    exam_status: "mpt_only",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Conflict of Laws": {
    exam_status: "removed_from_mee",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Secured Transactions": {
    exam_status: "removed_from_mee",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
}

function normalizeSubjectName(value: string): string {
  const trimmed = value.trim()

  if (trimmed === "Property") return "Real Property"
  if (trimmed === "Criminal Law") return "Criminal Law and Procedure"
  if (trimmed === "Trusts") return "Trusts and Estates"

  return trimmed
}

function normalizeTopicName(value?: string | null): string | null {
  const clean = String(value ?? "").trim()
  return clean.length > 0 ? clean : null
}

function normalizeSubtopicName(value?: string | null): string | null {
  const clean = String(value ?? "").trim()
  return clean.length > 0 ? clean : null
}

function normalizeBuzzwords(rule: RuleBankRule): string[] {
  const source = Array.isArray(rule.keywords)
    ? rule.keywords
    : Array.isArray(rule.buzzwords)
      ? rule.buzzwords
      : []

  return source
    .map((item) => String(item).trim())
    .filter(Boolean)
}

function normalizeRuleText(rule: RuleBankRule): string {
  return String(
    rule.rule_statement ??
      rule.rule_text ??
      rule.ruleText ??
      ""
  ).trim()
}

function normalizePromptQuestion(rule: RuleBankRule): string | null {
  const value = String(
    rule.prompt_question ??
      rule.promptQuestion ??
      ""
  ).trim()

  return value || null
}

function buildRuleKey(
  subjectName: string,
  topicName: string | null,
  subtopicName: string | null,
  title: string
): string {
  return [
    subjectName.trim().toLowerCase(),
    (topicName ?? "").trim().toLowerCase(),
    (subtopicName ?? "").trim().toLowerCase(),
    title.trim().toLowerCase(),
  ].join("::")
}

async function upsertSubject(subjectNameRaw: string) {
  const subjectName = normalizeSubjectName(subjectNameRaw)
  const status = SUBJECT_STATUS_MAP[subjectName] ?? {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  }

  const existing = await prisma.subjects.findFirst({
    where: { name: subjectName },
  })

  if (existing) {
    return prisma.subjects.update({
      where: { id: existing.id },
      data: {
        exam_status: status.exam_status,
        show_in_rule_training: status.show_in_rule_training,
        show_in_analytics: status.show_in_analytics,
      },
    })
  }

  const maxOrder = await prisma.subjects.aggregate({
    _max: { order_index: true },
  })

  return prisma.subjects.create({
    data: {
      name: subjectName,
      exam_status: status.exam_status,
      show_in_rule_training: status.show_in_rule_training,
      show_in_analytics: status.show_in_analytics,
      order_index: (maxOrder._max.order_index ?? 0) + 1,
    },
  })
}

async function upsertTopic(subjectId: string, topicName: string) {
  const existing = await prisma.topics.findFirst({
    where: {
      subject_id: subjectId,
      name: topicName,
    },
  })

  if (existing) return existing

  const maxOrder = await prisma.topics.aggregate({
    where: { subject_id: subjectId },
    _max: { order_index: true },
  })

  return prisma.topics.create({
    data: {
      subject_id: subjectId,
      name: topicName,
      order_index: (maxOrder._max.order_index ?? 0) + 1,
    },
  })
}

async function upsertSubtopic(topicId: string, subtopicName: string) {
  const existing = await prisma.subtopics.findFirst({
    where: {
      topic_id: topicId,
      name: subtopicName,
    },
  })

  if (existing) return existing

  const maxOrder = await prisma.subtopics.aggregate({
    where: { topic_id: topicId },
    _max: { order_index: true },
  })

  return prisma.subtopics.create({
    data: {
      topic_id: topicId,
      name: subtopicName,
      order_index: (maxOrder._max.order_index ?? 0) + 1,
    },
  })
}

function isStructuredRuleBankFile(value: RuleBankFile): value is StructuredRuleBankFile {
  return !Array.isArray(value)
}

function groupFlatRulesBySubject(rules: RuleBankRule[]) {
  const grouped = new Map<string, RuleBankRule[]>()

  for (const rule of rules) {
    const rawSubject = String(rule.subject ?? "").trim()
    if (!rawSubject) {
      continue
    }

    const subjectName = normalizeSubjectName(rawSubject)
    const existing = grouped.get(subjectName) ?? []
    existing.push(rule)
    grouped.set(subjectName, existing)
  }

  return grouped
}

async function importRulesForSubject(subjectNameRaw: string, fileRules: RuleBankRule[], sourceLabel: string) {
  const subject = await upsertSubject(subjectNameRaw)

  const existingRules = await prisma.rules.findMany({
    where: { subject_id: subject.id },
    select: {
      id: true,
      title: true,
      topics: { select: { name: true } },
      subtopics: { select: { name: true } },
    },
  })

  const existingRuleMap = new Map<string, { id: string }>()
  for (const row of existingRules) {
    const key = buildRuleKey(
      subject.name,
      row.topics?.name ?? null,
      row.subtopics?.name ?? null,
      row.title
    )
    existingRuleMap.set(key, { id: row.id })
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const rawRule of fileRules) {
    const title = String(rawRule.title ?? "").trim()
    const ruleText = normalizeRuleText(rawRule)
    const topicName = normalizeTopicName(rawRule.topic)
    const subtopicName = normalizeSubtopicName(rawRule.subtopic)

    if (!title || !ruleText) {
      skipped += 1
      continue
    }

    let topicId: string | null = null
    let subtopicId: string | null = null

    if (topicName) {
      const topic = await upsertTopic(subject.id, topicName)
      topicId = topic.id

      if (subtopicName) {
        const subtopic = await upsertSubtopic(topic.id, subtopicName)
        subtopicId = subtopic.id
      }
    }

    const key = buildRuleKey(subject.name, topicName, subtopicName, title)

    const payload = {
      subject_id: subject.id,
      topic_id: topicId,
      subtopic_id: subtopicId,
      title,
      rule_text: ruleText,
      prompt_question: normalizePromptQuestion(rawRule),
      explanation: String(rawRule.explanation ?? "").trim() || null,
      application_example: String(rawRule.application_example ?? "").trim() || null,
      common_trap: String(rawRule.common_trap ?? "").trim() || null,
      priority: String(rawRule.priority ?? "").trim() || null,
      buzzwords: normalizeBuzzwords(rawRule),
      cloze_template: String(rawRule.cloze_template ?? "").trim() || null,
      is_active: rawRule.is_active ?? true,
      updated_at: new Date(),
    }

    const existing = existingRuleMap.get(key)

    if (existing) {
      await prisma.rules.update({
        where: { id: existing.id },
        data: payload,
      })
      updated += 1
    } else {
      await prisma.rules.create({
        data: {
          ...payload,
          created_at: new Date(),
        },
      })
      created += 1
    }
  }

  console.log(
    `Imported ${sourceLabel} / ${subject.name} -> created=${created}, updated=${updated}, skipped=${skipped}`
  )
}

async function importRuleBankFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf-8")
  const parsed = JSON.parse(raw) as RuleBankFile

  if (isStructuredRuleBankFile(parsed)) {
    if (!parsed.subject || !Array.isArray(parsed.rules)) {
      throw new Error(`Invalid rule bank format: ${filePath}`)
    }

    const normalizedRules = parsed.rules.map((item) => ({
      ...item,
      subject: parsed.subject,
    }))

    await importRulesForSubject(parsed.subject, normalizedRules, path.basename(filePath))
    return
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid rule bank format: ${filePath}`)
  }

  const grouped = groupFlatRulesBySubject(parsed)

  if (grouped.size === 0) {
    throw new Error(`Flat rule file contains no usable subject rows: ${filePath}`)
  }

  for (const [subjectName, rules] of grouped.entries()) {
    await importRulesForSubject(subjectName, rules, path.basename(filePath))
  }
}

async function main() {
  const rulesDir = path.join(process.cwd(), "rule-banks")
  const files = await fs.readdir(rulesDir)

  const jsonFiles = files
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${rulesDir}`)
  }

  for (const file of jsonFiles) {
    await importRuleBankFile(path.join(rulesDir, file))
  }

  console.log("Rule bank import complete.")
}

main()
  .catch((error) => {
    console.error("Rule bank import failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import {
  normalizeSubjectFile,
  type CanonicalRule,
  type CanonicalSubjectFile,
} from "../lib/rules/normalize-subject-file"
import { mapCanonicalRuleToDb } from "../lib/rules/map-canonical-rule-to-db"

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), "data")

const SUBJECT_STATUS: Record<
  string,
  { exam_status: string; show_in_rule_training: boolean; show_in_analytics: boolean }
> = {
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
  "Criminal Law and Procedure": {
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
  Torts: {
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
    exam_status: "written_component",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Secured Transactions": {
    exam_status: "written_component",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Conflict of Laws": {
    exam_status: "written_component",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
  "Trusts and Estates": {
    exam_status: "written_component",
    show_in_rule_training: true,
    show_in_analytics: true,
  },
}

function clean(value: unknown) {
  return String(value ?? "").trim()
}

function normalizeSubjectName(value: string) {
  const name = value.trim()
  if (name === "Property") return "Real Property"
  if (name === "Criminal Law") return "Criminal Law and Procedure"
  if (name === "Trusts") return "Trusts and Estates"
  return name
}

function ruleCompositeKey(params: {
  subjectId: string
  topicId: string | null
  subtopicId: string | null
  title: string
}) {
  return [
    params.subjectId,
    params.topicId ?? "",
    params.subtopicId ?? "",
    params.title.trim().toLowerCase(),
  ].join("::")
}

async function loadCanonicalSubjectFiles(): Promise<CanonicalSubjectFile[]> {
  const filenames = (await fs.readdir(DATA_DIR))
    .filter((filename) => filename.endsWith(".json"))
    .sort((a, b) => {
      const aEnriched = a.endsWith(".enriched.json") ? 0 : 1
      const bEnriched = b.endsWith(".enriched.json") ? 0 : 1
      return aEnriched - bEnriched || a.localeCompare(b)
    })

  const bySubject = new Map<string, CanonicalSubjectFile>()

  for (const filename of filenames) {
    const raw = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, filename), "utf8")
    )

    if (!raw || Array.isArray(raw) || !Array.isArray(raw.rules)) continue

    const normalized = normalizeSubjectFile(raw)
    normalized.subject = normalizeSubjectName(normalized.subject)

    if (!normalized.subject || normalized.rules.length === 0) continue
    if (bySubject.has(normalized.subject)) continue

    bySubject.set(normalized.subject, normalized)
  }

  return Array.from(bySubject.values()).sort((a, b) =>
    a.subject.localeCompare(b.subject)
  )
}

async function upsertSubject(subjectName: string) {
  const status = SUBJECT_STATUS[subjectName] ?? {
    exam_status: "core",
    show_in_rule_training: true,
    show_in_analytics: true,
  }

  const existing = await prisma.subjects.findFirst({
    where: { name: { equals: subjectName, mode: "insensitive" } },
  })

  if (existing) {
    return prisma.subjects.update({
      where: { id: existing.id },
      data: status,
    })
  }

  const order = await prisma.subjects.aggregate({
    _max: { order_index: true },
  })

  return prisma.subjects.create({
    data: {
      name: subjectName,
      order_index: (order._max.order_index ?? 0) + 1,
      ...status,
    },
  })
}

async function upsertTopic(subjectId: string, topicName: string) {
  const existing = await prisma.topics.findFirst({
    where: {
      subject_id: subjectId,
      name: { equals: topicName, mode: "insensitive" },
    },
  })

  if (existing) return existing

  const order = await prisma.topics.aggregate({
    where: { subject_id: subjectId },
    _max: { order_index: true },
  })

  return prisma.topics.create({
    data: {
      subject_id: subjectId,
      name: topicName,
      order_index: (order._max.order_index ?? 0) + 1,
    },
  })
}

async function upsertSubtopic(topicId: string, subtopicName: string) {
  const existing = await prisma.subtopics.findFirst({
    where: {
      topic_id: topicId,
      name: { equals: subtopicName, mode: "insensitive" },
    },
  })

  if (existing) return existing

  const order = await prisma.subtopics.aggregate({
    where: { topic_id: topicId },
    _max: { order_index: true },
  })

  return prisma.subtopics.create({
    data: {
      topic_id: topicId,
      name: subtopicName,
      order_index: (order._max.order_index ?? 0) + 1,
    },
  })
}

async function upsertRule(params: {
  subjectId: string
  topicId: string | null
  subtopicId: string | null
  rule: CanonicalRule
}) {
  const externalKey = clean(params.rule.id)
  if (!externalKey) throw new Error(`Rule is missing an external key: ${params.rule.title}`)

  const byExternalKey = await prisma.rules.findUnique({
    where: { external_key: externalKey },
  })

  const existing =
    byExternalKey ??
    (await prisma.rules.findFirst({
      where: {
        subject_id: params.subjectId,
        topic_id: params.topicId,
        subtopic_id: params.subtopicId,
        title: { equals: params.rule.title, mode: "insensitive" },
      },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
    }))

  const mapped = mapCanonicalRuleToDb(params.rule)
  const payload = {
    ...mapped,
    subject_id: params.subjectId,
    topic_id: params.topicId,
    subtopic_id: params.subtopicId,
    external_key: externalKey,
    source_type: "LEXORA_CORE",
    publication_status: "PUBLISHED",
    current_version: existing?.current_version ?? 1,
    published_at: existing?.published_at ?? new Date(),
    archived_at: null,
    updated_at: new Date(),
  }

  const stored = existing
    ? await prisma.rules.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prisma.rules.create({
        data: {
          ...payload,
          created_at: new Date(),
        },
      })

  await prisma.rule_versions.upsert({
    where: {
      rule_id_version_number: {
        rule_id: stored.id,
        version_number: 1,
      },
    },
    update: {
      title: stored.title,
      rule_text: stored.rule_text,
      explanation: stored.explanation,
      buzzwords: stored.buzzwords ?? undefined,
      cloze_template: stored.cloze_template,
      prompt_question: stored.prompt_question,
      application_example: stored.application_example,
      common_trap: stored.common_trap,
      common_traps: stored.common_traps ?? undefined,
      exam_tip: stored.exam_tip,
      how_to_apply: stored.how_to_apply ?? undefined,
      priority: stored.priority,
      publication_status: "PUBLISHED",
      published_at: stored.published_at ?? new Date(),
    },
    create: {
      rule_id: stored.id,
      version_number: 1,
      title: stored.title,
      rule_text: stored.rule_text,
      explanation: stored.explanation,
      buzzwords: stored.buzzwords ?? undefined,
      cloze_template: stored.cloze_template,
      prompt_question: stored.prompt_question,
      application_example: stored.application_example,
      common_trap: stored.common_trap,
      common_traps: stored.common_traps ?? undefined,
      exam_tip: stored.exam_tip,
      how_to_apply: stored.how_to_apply ?? undefined,
      priority: stored.priority,
      publication_status: "PUBLISHED",
      published_at: stored.published_at ?? new Date(),
    },
  })

  return { stored, created: !existing }
}

async function ensureRegistryFoundation() {
  const jurisdiction = await prisma.jurisdictions.upsert({
    where: { code: "UBE" },
    update: {
      name: "UBE / Uniform Current",
      jurisdiction_type: "UNIFORM",
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      code: "UBE",
      name: "UBE / Uniform Current",
      jurisdiction_type: "UNIFORM",
    },
  })

  const regime = await prisma.exam_regimes.upsert({
    where: { code: "UBE_CURRENT" },
    update: {
      name: "UBE / Uniform Current",
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      code: "UBE_CURRENT",
      name: "UBE / Uniform Current",
      description: "Current uniform and national-core rule curriculum.",
    },
  })

  await prisma.jurisdiction_exam_regimes.upsert({
    where: { mapping_key: "UBE::UBE_CURRENT::1900-01-01" },
    update: {
      jurisdiction_id: jurisdiction.id,
      exam_regime_id: regime.id,
      effective_from: new Date("1900-01-01T00:00:00.000Z"),
      effective_until: null,
      priority: 100,
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      mapping_key: "UBE::UBE_CURRENT::1900-01-01",
      jurisdiction_id: jurisdiction.id,
      exam_regime_id: regime.id,
      effective_from: new Date("1900-01-01T00:00:00.000Z"),
      priority: 100,
    },
  })

  return { jurisdiction, regime }
}

async function main() {
  const files = await loadCanonicalSubjectFiles()
  const expectedTotal = files.reduce((sum, file) => sum + file.rules.length, 0)

  if (expectedTotal !== 1162) {
    throw new Error(
      `Expected 1,162 canonical source rules, but found ${expectedTotal}. ` +
        "Review the data directory before running the baseline backfill."
    )
  }

  const { regime } = await ensureRegistryFoundation()
  const importedRuleIds = new Set<string>()
  let created = 0
  let updated = 0

  for (const file of files) {
    const subject = await upsertSubject(file.subject)
    const curriculumKey = `UBE_CURRENT::GLOBAL::${subject.id}`

    const curriculum = await prisma.curriculum_subjects.upsert({
      where: { registry_key: curriculumKey },
      update: {
        exam_regime_id: regime.id,
        subject_id: subject.id,
        display_name: subject.name,
        is_required: true,
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        registry_key: curriculumKey,
        exam_regime_id: regime.id,
        subject_id: subject.id,
        display_name: subject.name,
        is_required: true,
      },
    })

    for (const rule of file.rules) {
      const topicName = clean(rule.topic)
      const subtopicName = clean(rule.subtopic)
      const topic = topicName ? await upsertTopic(subject.id, topicName) : null
      const subtopic =
        topic && subtopicName ? await upsertSubtopic(topic.id, subtopicName) : null

      const result = await upsertRule({
        subjectId: subject.id,
        topicId: topic?.id ?? null,
        subtopicId: subtopic?.id ?? null,
        rule,
      })

      importedRuleIds.add(result.stored.id)
      if (result.created) created += 1
      else updated += 1

      const applicabilityKey = `UBE_CURRENT::GLOBAL::${result.stored.id}`
      const priorityWeight =
        rule.priority === "high" ? 3 : rule.priority === "low" ? 1 : 2

      await prisma.rule_applicability.upsert({
        where: { applicability_key: applicabilityKey },
        update: {
          rule_id: result.stored.id,
          exam_regime_id: regime.id,
          curriculum_subject_id: curriculum.id,
          source_package: "core",
          is_tested: true,
          priority_weight: priorityWeight,
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          applicability_key: applicabilityKey,
          rule_id: result.stored.id,
          exam_regime_id: regime.id,
          curriculum_subject_id: curriculum.id,
          source_package: "core",
          is_tested: true,
          priority_weight: priorityWeight,
        },
      })
    }

    console.log(`PASS: ${subject.name} registered (${file.rules.length} rules).`)
  }

  const missingFromDatabase = expectedTotal - importedRuleIds.size
  if (missingFromDatabase !== 0) {
    throw new Error(
      `Registry backfill produced ${importedRuleIds.size} unique rules; expected ${expectedTotal}.`
    )
  }

  const registeredCount = await prisma.rule_applicability.count({
    where: {
      exam_regime_id: regime.id,
      is_active: true,
      is_tested: true,
      rule_id: { in: Array.from(importedRuleIds) },
    },
  })

  if (registeredCount !== expectedTotal) {
    throw new Error(
      `Registry contains ${registeredCount} baseline applicability rows; expected ${expectedTotal}.`
    )
  }

  console.log("PASS: Dynamic Rule Registry baseline backfill completed.")
  console.log(`PASS: Canonical full rules registered: ${expectedTotal}`)
  console.log(`PASS: Existing rules updated without changing IDs: ${updated}`)
  console.log(`PASS: Missing canonical rules created: ${created}`)
  console.log("PASS: Buzzwords remain fields inside rules and were not counted separately.")
}

main()
  .catch((error) => {
    console.error("FAIL: Dynamic Rule Registry backfill failed.")
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

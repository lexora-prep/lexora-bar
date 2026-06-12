import { Prisma, type PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export type RulePublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

export type NormalizedRuleInput = {
  id?: string | null
  externalKey?: string | null
  title: string
  ruleText: string
  explanation?: string | null
  promptQuestion?: string | null
  subjectName: string
  topicName?: string | null
  subtopicName?: string | null
  buzzwords?: string[]
  howToApply?: string[]
  commonTraps?: string[]
  applicationExample?: string | null
  examTip?: string | null
  priority?: string | null
  publicationStatus?: RulePublicationStatus
  sourceType?: string | null
  sourcePackage?: string | null
  jurisdictionCode?: string | null
  examRegimeCode: string
  effectiveFrom?: string | null
  effectiveUntil?: string | null
  priorityWeight?: number | null
  changeNote?: string | null
}

type DbClient = Prisma.TransactionClient | PrismaClient

export async function requireRuleAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      admin: null,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_rules: true,
    },
  })

  const allowed =
    !!profile &&
    !profile.is_blocked &&
    (profile.admin_role === "super_admin" ||
      ((profile.is_admin || profile.role === "admin") && profile.can_manage_rules))

  if (!allowed || !profile) {
    return {
      admin: null,
      response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  return { admin: profile, response: null }
}

export function cleanString(value: unknown) {
  return String(value ?? "").trim()
}

export function nullableString(value: unknown) {
  const clean = cleanString(value)
  return clean || null
}

export function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => cleanString(item)).filter(Boolean))
    )
  }

  const clean = cleanString(value)
  if (!clean) return []

  return Array.from(
    new Set(
      clean
        .split(/\s*(?:\||;|\n)\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

export function normalizeDateOnly(value: unknown) {
  const clean = cleanString(value)
  if (!clean) return null
  const date = new Date(`${clean.slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
}

async function uniqueExternalKey(db: DbClient, preferred: string) {
  const base = slugify(preferred) || `rule_${Date.now()}`
  let candidate = base
  let suffix = 2

  while (await db.rules.findUnique({ where: { external_key: candidate }, select: { id: true } })) {
    candidate = `${base}_${suffix}`
    suffix += 1
  }

  return candidate
}

async function findOrCreateSubject(db: DbClient, name: string) {
  const existing = await db.subjects.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) return existing

  const max = await db.subjects.aggregate({ _max: { order_index: true } })
  return db.subjects.create({
    data: {
      name,
      order_index: (max._max.order_index ?? 0) + 1,
      exam_status: "jurisdiction_specific",
      show_in_rule_training: true,
      show_in_analytics: true,
    },
  })
}

async function findOrCreateTopic(db: DbClient, subjectId: string, name: string | null) {
  if (!name) return null
  const existing = await db.topics.findFirst({
    where: {
      subject_id: subjectId,
      name: { equals: name, mode: "insensitive" },
    },
  })
  if (existing) return existing

  const max = await db.topics.aggregate({
    where: { subject_id: subjectId },
    _max: { order_index: true },
  })
  return db.topics.create({
    data: {
      subject_id: subjectId,
      name,
      order_index: (max._max.order_index ?? 0) + 1,
    },
  })
}

async function findOrCreateSubtopic(db: DbClient, topicId: string | null, name: string | null) {
  if (!topicId || !name) return null
  const existing = await db.subtopics.findFirst({
    where: {
      topic_id: topicId,
      name: { equals: name, mode: "insensitive" },
    },
  })
  if (existing) return existing

  const max = await db.subtopics.aggregate({
    where: { topic_id: topicId },
    _max: { order_index: true },
  })
  return db.subtopics.create({
    data: {
      topic_id: topicId,
      name,
      order_index: (max._max.order_index ?? 0) + 1,
    },
  })
}

async function resolveRegistryTargets(
  db: DbClient,
  input: NormalizedRuleInput,
  subjectId: string
) {
  const regime = await db.exam_regimes.findFirst({
    where: {
      code: { equals: input.examRegimeCode, mode: "insensitive" },
      is_active: true,
    },
  })
  if (!regime) throw new Error(`Unknown exam regime: ${input.examRegimeCode}`)

  const jurisdictionCode = nullableString(input.jurisdictionCode)?.toUpperCase() ?? null
  const jurisdiction = jurisdictionCode
    ? await db.jurisdictions.findFirst({
        where: {
          code: { equals: jurisdictionCode, mode: "insensitive" },
          is_active: true,
        },
      })
    : null

  if (jurisdictionCode && !jurisdiction) {
    throw new Error(`Unknown jurisdiction: ${jurisdictionCode}`)
  }

  const curriculumKey = [jurisdiction?.code ?? "GLOBAL", regime.code, subjectId].join("::")
  const curriculum = await db.curriculum_subjects.upsert({
    where: { registry_key: curriculumKey },
    update: {
      jurisdiction_id: jurisdiction?.id ?? null,
      exam_regime_id: regime.id,
      subject_id: subjectId,
      display_name: input.subjectName,
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      registry_key: curriculumKey,
      jurisdiction_id: jurisdiction?.id ?? null,
      exam_regime_id: regime.id,
      subject_id: subjectId,
      display_name: input.subjectName,
      is_required: true,
      is_active: true,
    },
  })

  return { regime, jurisdiction, curriculum }
}

function jsonOrUndefined(value: string[]) {
  return value.length > 0 ? (value as Prisma.InputJsonValue) : Prisma.JsonNull
}

export async function saveRuleWithVersion(
  db: DbClient,
  input: NormalizedRuleInput,
  adminId: string
) {
  const title = cleanString(input.title)
  const ruleText = cleanString(input.ruleText)
  const subjectName = cleanString(input.subjectName)
  const examRegimeCode = cleanString(input.examRegimeCode).toUpperCase()

  if (!title) throw new Error("Rule title is required.")
  if (!ruleText) throw new Error("Rule text is required.")
  if (!subjectName) throw new Error("Subject is required.")
  if (!examRegimeCode) throw new Error("Exam regime is required.")

  const existing = input.id
    ? await db.rules.findUnique({ where: { id: input.id } })
    : input.externalKey
      ? await db.rules.findUnique({ where: { external_key: input.externalKey } })
      : null

  const subject = await findOrCreateSubject(db, subjectName)
  const topic = await findOrCreateTopic(db, subject.id, nullableString(input.topicName))
  const subtopic = await findOrCreateSubtopic(db, topic?.id ?? null, nullableString(input.subtopicName))

  const requestedKey = nullableString(input.externalKey)
  const externalKey = existing?.external_key ?? requestedKey ?? (await uniqueExternalKey(
    db,
    `${input.jurisdictionCode ?? "global"}_${examRegimeCode}_${subjectName}_${title}`
  ))

  if (requestedKey && existing?.external_key !== requestedKey) {
    const owner = await db.rules.findUnique({ where: { external_key: requestedKey } })
    if (owner && owner.id !== existing?.id) {
      throw new Error(`External key already belongs to another rule: ${requestedKey}`)
    }
  }

  const status = input.publicationStatus ?? "DRAFT"
  const nextVersion = existing ? existing.current_version + 1 : 1
  const publishedAt = status === "PUBLISHED" ? new Date() : existing?.published_at ?? null
  const archivedAt = status === "ARCHIVED" ? new Date() : null

  const data = {
    subject_id: subject.id,
    topic_id: topic?.id ?? null,
    subtopic_id: subtopic?.id ?? null,
    title,
    rule_text: ruleText,
    explanation: nullableString(input.explanation),
    prompt_question: nullableString(input.promptQuestion),
    buzzwords: jsonOrUndefined(normalizeList(input.buzzwords)),
    application_example: nullableString(input.applicationExample),
    how_to_apply: jsonOrUndefined(normalizeList(input.howToApply)),
    common_traps: jsonOrUndefined(normalizeList(input.commonTraps)),
    exam_tip: nullableString(input.examTip),
    priority: nullableString(input.priority) ?? "medium",
    external_key: requestedKey ?? externalKey,
    source_type: nullableString(input.sourceType) ?? "ADMIN",
    publication_status: status,
    current_version: nextVersion,
    is_active: status !== "ARCHIVED",
    published_at: publishedAt,
    archived_at: archivedAt,
    updated_by: adminId,
    updated_at: new Date(),
  } satisfies Prisma.rulesUncheckedCreateInput

  const stored = existing
    ? await db.rules.update({ where: { id: existing.id }, data })
    : await db.rules.create({
        data: {
          ...data,
          created_by: adminId,
          created_at: new Date(),
        },
      })

  await db.rule_versions.create({
    data: {
      rule_id: stored.id,
      version_number: nextVersion,
      title: stored.title,
      rule_text: stored.rule_text,
      explanation: stored.explanation,
      buzzwords: stored.buzzwords ?? Prisma.JsonNull,
      prompt_question: stored.prompt_question,
      application_example: stored.application_example,
      common_traps: stored.common_traps ?? Prisma.JsonNull,
      exam_tip: stored.exam_tip,
      how_to_apply: stored.how_to_apply ?? Prisma.JsonNull,
      priority: stored.priority,
      publication_status: status,
      change_note: nullableString(input.changeNote),
      effective_from: normalizeDateOnly(input.effectiveFrom),
      effective_until: normalizeDateOnly(input.effectiveUntil),
      created_by: adminId,
      approved_by: status === "PUBLISHED" ? adminId : null,
      published_at: status === "PUBLISHED" ? new Date() : null,
    },
  })

  const targets = await resolveRegistryTargets(db, { ...input, examRegimeCode }, subject.id)
  const applicabilityKey = [
    targets.regime.code,
    targets.jurisdiction?.code ?? "GLOBAL",
    stored.id,
  ].join("::")

  await db.rule_applicability.upsert({
    where: { applicability_key: applicabilityKey },
    update: {
      jurisdiction_id: targets.jurisdiction?.id ?? null,
      exam_regime_id: targets.regime.id,
      curriculum_subject_id: targets.curriculum.id,
      source_package: nullableString(input.sourcePackage) ?? "core",
      is_tested: true,
      priority_weight: Math.max(1, Math.min(10, Number(input.priorityWeight ?? 1))),
      effective_from: normalizeDateOnly(input.effectiveFrom),
      effective_until: normalizeDateOnly(input.effectiveUntil),
      is_active: status !== "ARCHIVED",
      updated_at: new Date(),
    },
    create: {
      applicability_key: applicabilityKey,
      rule_id: stored.id,
      jurisdiction_id: targets.jurisdiction?.id ?? null,
      exam_regime_id: targets.regime.id,
      curriculum_subject_id: targets.curriculum.id,
      source_package: nullableString(input.sourcePackage) ?? "core",
      is_tested: true,
      priority_weight: Math.max(1, Math.min(10, Number(input.priorityWeight ?? 1))),
      effective_from: normalizeDateOnly(input.effectiveFrom),
      effective_until: normalizeDateOnly(input.effectiveUntil),
      is_active: status !== "ARCHIVED",
    },
  })

  return stored
}

export function normalizeRuleInput(raw: Record<string, unknown>): NormalizedRuleInput {
  return {
    id: nullableString(raw.id),
    externalKey: nullableString(raw.externalKey ?? raw.external_key),
    title: cleanString(raw.title),
    ruleText: cleanString(raw.ruleText ?? raw.rule_text ?? raw.rule_statement),
    explanation: nullableString(raw.explanation),
    promptQuestion: nullableString(raw.promptQuestion ?? raw.prompt_question),
    subjectName: cleanString(raw.subjectName ?? raw.subject),
    topicName: nullableString(raw.topicName ?? raw.topic),
    subtopicName: nullableString(raw.subtopicName ?? raw.subtopic),
    buzzwords: normalizeList(raw.buzzwords ?? raw.keywords),
    howToApply: normalizeList(raw.howToApply ?? raw.how_to_apply),
    commonTraps: normalizeList(raw.commonTraps ?? raw.common_traps ?? raw.common_trap),
    applicationExample: nullableString(raw.applicationExample ?? raw.application_example),
    examTip: nullableString(raw.examTip ?? raw.exam_tip),
    priority: nullableString(raw.priority) ?? "medium",
    publicationStatus: (cleanString(raw.publicationStatus ?? raw.publication_status).toUpperCase() || "DRAFT") as RulePublicationStatus,
    sourceType: nullableString(raw.sourceType ?? raw.source_type) ?? "ADMIN",
    sourcePackage: nullableString(raw.sourcePackage ?? raw.source_package) ?? "core",
    jurisdictionCode: nullableString(raw.jurisdictionCode ?? raw.jurisdiction_code),
    examRegimeCode: cleanString(raw.examRegimeCode ?? raw.exam_regime_code).toUpperCase(),
    effectiveFrom: nullableString(raw.effectiveFrom ?? raw.effective_from),
    effectiveUntil: nullableString(raw.effectiveUntil ?? raw.effective_until),
    priorityWeight: Number(raw.priorityWeight ?? raw.priority_weight ?? 1),
    changeNote: nullableString(raw.changeNote ?? raw.change_note),
  }
}

export function validateRuleInput(input: NormalizedRuleInput) {
  const errors: string[] = []
  if (!input.title) errors.push("Title is required.")
  if (!input.ruleText) errors.push("Rule text is required.")
  if (!input.subjectName) errors.push("Subject is required.")
  if (!input.examRegimeCode) errors.push("Exam regime code is required.")
  if (!input.externalKey) errors.push("External key is required for bulk import.")
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(input.publicationStatus ?? "")) {
    errors.push("Publication status must be DRAFT, PUBLISHED, or ARCHIVED.")
  }
  if (input.effectiveFrom && !normalizeDateOnly(input.effectiveFrom)) {
    errors.push("Effective-from date is invalid.")
  }
  if (input.effectiveUntil && !normalizeDateOnly(input.effectiveUntil)) {
    errors.push("Effective-until date is invalid.")
  }
  if (
    input.effectiveFrom &&
    input.effectiveUntil &&
    normalizeDateOnly(input.effectiveFrom)! > normalizeDateOnly(input.effectiveUntil)!
  ) {
    errors.push("Effective-until date must not be earlier than effective-from date.")
  }
  return errors
}

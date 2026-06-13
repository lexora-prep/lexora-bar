import { prisma } from "@/lib/prisma"

export type ApplicableRuleUniverseParams = {
  jurisdictionCode?: string | null
  examRegimeCode?: string | null
  examDate?: Date | string | null
  sourcePackages?: string[]
  includeDrafts?: boolean
}

export type ApplicableRegistryRule = {
  id: string
  externalKey: string | null
  title: string
  ruleText: string
  promptQuestion: string | null
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string
  subtopicId: string | null
  subtopicName: string
  sourceType: string
  publicationStatus: string
  sourcePackage: string
  priorityWeight: number
  jurisdictionCode: string | null
  examRegimeCode: string
}

export type ApplicableRuleUniverse = {
  jurisdiction: {
    id: string | null
    code: string
    name: string
  }
  examRegime: {
    id: string | null
    code: string
    name: string
  }
  effectiveDate: string
  rules: ApplicableRegistryRule[]
  totals: {
    rules: number
    subjects: number
  }
  source: "registry" | "legacy-fallback"
}

function normalizeDate(value?: Date | string | null): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    )
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function normalizeJurisdictionCode(value?: string | null) {
  const clean = String(value ?? "").trim()
  return clean ? clean.toUpperCase() : "UBE"
}

function normalizeExamRegimeCode(value?: string | null) {
  const clean = String(value ?? "").trim()
  return clean ? clean.toUpperCase() : null
}

function isEffectiveOn(
  effectiveFrom: Date | null,
  effectiveUntil: Date | null,
  date: Date
) {
  if (effectiveFrom && effectiveFrom.getTime() > date.getTime()) return false
  if (effectiveUntil && effectiveUntil.getTime() < date.getTime()) return false
  return true
}

async function resolveJurisdiction(codeOrName: string) {
  return prisma.jurisdictions.findFirst({
    where: {
      is_active: true,
      OR: [
        { code: { equals: codeOrName, mode: "insensitive" } },
        { name: { equals: codeOrName, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true },
  })
}

async function resolveExamRegime(params: {
  jurisdictionId: string | null
  requestedCode: string | null
  date: Date
}) {
  if (params.requestedCode) {
    const requested = await prisma.exam_regimes.findFirst({
      where: {
        code: { equals: params.requestedCode, mode: "insensitive" },
        is_active: true,
      },
      select: { id: true, code: true, name: true },
    })

    if (requested) return requested
  }

  if (params.jurisdictionId) {
    const mappings = await prisma.jurisdiction_exam_regimes.findMany({
      where: {
        jurisdiction_id: params.jurisdictionId,
        is_active: true,
        exam_regime: { is_active: true },
      },
      include: {
        exam_regime: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ priority: "desc" }, { effective_from: "desc" }],
    })

    const active = mappings.find((mapping) =>
      isEffectiveOn(mapping.effective_from, mapping.effective_until, params.date)
    )

    if (active) return active.exam_regime
  }

  return prisma.exam_regimes.findFirst({
    where: { code: "UBE_CURRENT", is_active: true },
    select: { id: true, code: true, name: true },
  })
}

async function getLegacyFallbackUniverse(
  effectiveDate: Date
): Promise<ApplicableRuleUniverse> {
  const rows = await prisma.rules.findMany({
    where: {
      is_active: true,
      rule_type: null,
      prompt_question: { not: null },
      rule_text: { not: "" },
      subject_id: { not: null },
    },
    select: {
      id: true,
      external_key: true,
      title: true,
      rule_text: true,
      prompt_question: true,
      subject_id: true,
      topic_id: true,
      subtopic_id: true,
      source_type: true,
      publication_status: true,
      subjects: { select: { name: true } },
      topics: { select: { name: true } },
      subtopics: { select: { name: true } },
    },
  })

  const deduped = new Map<string, (typeof rows)[number]>()

  for (const row of rows) {
    if (!row.subject_id) continue
    if (!String(row.prompt_question ?? "").trim()) continue
    if (!String(row.rule_text ?? "").trim()) continue

    const key = [
      row.subject_id,
      row.topic_id ?? "",
      row.subtopic_id ?? "",
      row.title.trim().toLowerCase(),
    ].join("::")

    if (!deduped.has(key)) deduped.set(key, row)
  }

  const rules: ApplicableRegistryRule[] = Array.from(deduped.values()).map(
    (row) => ({
      id: row.id,
      externalKey: row.external_key,
      title: row.title,
      ruleText: row.rule_text,
      promptQuestion: row.prompt_question,
      subjectId: row.subject_id!,
      subjectName: row.subjects?.name ?? "Unassigned subject",
      topicId: row.topic_id,
      topicName: row.topics?.name ?? "General",
      subtopicId: row.subtopic_id,
      subtopicName: row.subtopics?.name ?? "",
      sourceType: row.source_type,
      publicationStatus: row.publication_status,
      sourcePackage: "core",
      priorityWeight: 1,
      jurisdictionCode: null,
      examRegimeCode: "UBE_CURRENT",
    })
  )

  return {
    jurisdiction: { id: null, code: "UBE", name: "UBE / Uniform Current" },
    examRegime: { id: null, code: "UBE_CURRENT", name: "UBE / Uniform Current" },
    effectiveDate: effectiveDate.toISOString().slice(0, 10),
    rules,
    totals: {
      rules: rules.length,
      subjects: new Set(rules.map((rule) => rule.subjectId)).size,
    },
    source: "legacy-fallback",
  }
}

export async function getApplicableRuleUniverse(
  params: ApplicableRuleUniverseParams = {}
): Promise<ApplicableRuleUniverse> {
  const effectiveDate = normalizeDate(params.examDate)
  const jurisdictionCode = normalizeJurisdictionCode(params.jurisdictionCode)
  const requestedRegime = normalizeExamRegimeCode(params.examRegimeCode)
  const sourcePackages =
    params.sourcePackages?.map((item) => item.trim()).filter(Boolean) ?? []

  const jurisdiction = await resolveJurisdiction(jurisdictionCode)
  const examRegime = await resolveExamRegime({
    jurisdictionId: jurisdiction?.id ?? null,
    requestedCode: requestedRegime,
    date: effectiveDate,
  })

  if (!examRegime) return getLegacyFallbackUniverse(effectiveDate)

  const rows = await prisma.rule_applicability.findMany({
    where: {
      exam_regime_id: examRegime.id,
      is_active: true,
      is_tested: true,
      ...(sourcePackages.length > 0
        ? { source_package: { in: sourcePackages } }
        : {}),
      AND: [
        jurisdiction
          ? {
              OR: [
                { jurisdiction_id: null },
                { jurisdiction_id: jurisdiction.id },
              ],
            }
          : { jurisdiction_id: null },
        {
          OR: [
            { effective_from: null },
            { effective_from: { lte: effectiveDate } },
          ],
        },
        {
          OR: [
            { effective_until: null },
            { effective_until: { gte: effectiveDate } },
          ],
        },
      ],
      rule: {
        is: {
          is_active: true,
          publication_status: params.includeDrafts
            ? { in: ["DRAFT", "IN_REVIEW", "PUBLISHED"] }
            : "PUBLISHED",
          rule_text: { not: "" },
          subject_id: { not: null },
        },
      },
    },
    include: {
      jurisdiction: { select: { code: true } },
      exam_regime: { select: { code: true } },
      rule: {
        include: {
          subjects: { select: { name: true } },
          topics: { select: { name: true } },
          subtopics: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { priority_weight: "desc" },
      { rule: { title: "asc" } },
    ],
  })

  if (rows.length === 0) return getLegacyFallbackUniverse(effectiveDate)

  const selected = new Map<string, (typeof rows)[number]>()

  for (const row of rows) {
    const current = selected.get(row.rule_id)
    if (!current) {
      selected.set(row.rule_id, row)
      continue
    }

    const currentIsSpecific = Boolean(current.jurisdiction_id)
    const candidateIsSpecific = Boolean(row.jurisdiction_id)

    if (candidateIsSpecific && !currentIsSpecific) {
      selected.set(row.rule_id, row)
      continue
    }

    if (row.priority_weight > current.priority_weight) {
      selected.set(row.rule_id, row)
    }
  }

  const rules: ApplicableRegistryRule[] = Array.from(selected.values()).map(
    (row) => ({
      id: row.rule.id,
      externalKey: row.rule.external_key,
      title: row.rule.title,
      ruleText: row.rule.rule_text,
      promptQuestion: row.rule.prompt_question,
      subjectId: row.rule.subject_id!,
      subjectName: row.rule.subjects?.name ?? "Unassigned subject",
      topicId: row.rule.topic_id,
      topicName: row.rule.topics?.name ?? "General",
      subtopicId: row.rule.subtopic_id,
      subtopicName: row.rule.subtopics?.name ?? "",
      sourceType: row.rule.source_type,
      publicationStatus: row.rule.publication_status,
      sourcePackage: row.source_package,
      priorityWeight: row.priority_weight,
      jurisdictionCode: row.jurisdiction?.code ?? null,
      examRegimeCode: row.exam_regime.code,
    })
  )

  return {
    jurisdiction: {
      id: jurisdiction?.id ?? null,
      code: jurisdiction?.code ?? jurisdictionCode,
      name: jurisdiction?.name ?? jurisdictionCode,
    },
    examRegime: {
      id: examRegime.id,
      code: examRegime.code,
      name: examRegime.name,
    },
    effectiveDate: effectiveDate.toISOString().slice(0, 10),
    rules,
    totals: {
      rules: rules.length,
      subjects: new Set(rules.map((rule) => rule.subjectId)).size,
    },
    source: "registry",
  }
}

export async function getApplicableRuleUniverseForUser(userId: string) {
  const [plan, profile] = await Promise.all([
    prisma.studyPlan.findUnique({
      where: { userId },
      select: {
        examDate: true,
        jurisdictionCode: true,
        examRegime: true,
      },
    }),
    prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        jurisdiction: true,
        exam_month: true,
        exam_year: true,
      },
    }),
  ])

  let examDate: Date | null = plan?.examDate ?? null

  if (!examDate && profile?.exam_year && profile.exam_month) {
    examDate = new Date(
      Date.UTC(profile.exam_year, Math.max(0, profile.exam_month - 1), 1)
    )
  }

  return getApplicableRuleUniverse({
    jurisdictionCode: plan?.jurisdictionCode ?? profile?.jurisdiction ?? "UBE",
    examRegimeCode: plan?.examRegime ?? null,
    examDate,
  })
}

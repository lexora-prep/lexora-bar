import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"

const SUBJECT_ALIASES: Record<string, string> = {
  Trusts: "Trusts and Estates",
  Wills: "Trusts and Estates",
  "Trusts and Estates": "Trusts and Estates",
}

function canonicalSubjectName(name: string) {
  return SUBJECT_ALIASES[name] ?? name
}

type MetadataCacheEntry = {
  expiresAt: number
  payload: unknown
}

let metadataCache: MetadataCacheEntry | null = null
const METADATA_CACHE_MS = 30_000

type SubjectAccumulator = {
  id: string
  name: string
  exam_status: string
  show_in_rule_training: boolean
  show_in_analytics: boolean
  order_index: number
  subjectIds: Set<string>
  topicIds: Set<string>
  storedRuleIds: Set<string>
  applicableRuleIds: Set<string>
  hasCanonicalRecord: boolean
}

export async function GET() {
  const startedAt = Date.now()

  const auth = await requireRuleAdmin()

  if (auth.response || !auth.admin) return auth.response

  if (metadataCache && metadataCache.expiresAt > Date.now()) {
    return NextResponse.json(metadataCache.payload)
  }


  const [
    jurisdictions,
    examRegimes,
    rawSubjects,
    storedRules,
    activeApplicability,
    batches,
    draftCount,
    archivedCount,
  ] = await Promise.all([
    prisma.jurisdictions.findMany({
      where: { is_active: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        jurisdiction_type: true,
      },
    }),

    prisma.exam_regimes.findMany({
      where: { is_active: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        effective_from: true,
        effective_until: true,
      },
    }),

    prisma.subjects.findMany({
      orderBy: [{ order_index: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        exam_status: true,
        order_index: true,
        show_in_rule_training: true,
        show_in_analytics: true,
        topics: {
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.rules.findMany({
      select: {
        id: true,
        subject_id: true,
        publication_status: true,
        is_active: true,
      },
    }),

    prisma.rule_applicability.findMany({
      where: {
        is_active: true,
        is_tested: true,
        rule: {
          is_active: true,
          publication_status: "PUBLISHED",
        },
      },
      select: {
        id: true,
        rule_id: true,
        rule: {
          select: {
            subject_id: true,
          },
        },
      },
    }),

    prisma.rule_import_batches.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: {
        id: true,
        file_name: true,
        file_format: true,
        status: true,
        total_rows: true,
        valid_rows: true,
        invalid_rows: true,
        created_rows: true,
        updated_rows: true,
        skipped_rows: true,
        created_at: true,
        validated_at: true,
        published_at: true,
      },
    }),

    prisma.rules.count({
      where: {
        publication_status: "DRAFT",
      },
    }),

    prisma.rules.count({
      where: {
        publication_status: "ARCHIVED",
      },
    }),
  ])


  const subjectById = new Map(
    rawSubjects.map((subject) => [subject.id, subject])
  )

  const groupedSubjects = new Map<string, SubjectAccumulator>()

  for (const subject of rawSubjects) {
    const canonicalName = canonicalSubjectName(subject.name)
    const existing = groupedSubjects.get(canonicalName)
    const isCanonicalRecord = subject.name === canonicalName

    if (!existing) {
      groupedSubjects.set(canonicalName, {
        id: subject.id,
        name: canonicalName,
        exam_status: subject.exam_status,
        show_in_rule_training: subject.show_in_rule_training,
        show_in_analytics: subject.show_in_analytics,
        order_index: subject.order_index,
        subjectIds: new Set([subject.id]),
        topicIds: new Set(subject.topics.map((topic) => topic.id)),
        storedRuleIds: new Set(),
        applicableRuleIds: new Set(),
        hasCanonicalRecord: isCanonicalRecord,
      })
      continue
    }

    existing.subjectIds.add(subject.id)
    existing.order_index = Math.min(
      existing.order_index,
      subject.order_index
    )

    existing.show_in_rule_training =
      existing.show_in_rule_training ||
      subject.show_in_rule_training

    existing.show_in_analytics =
      existing.show_in_analytics ||
      subject.show_in_analytics

    for (const topic of subject.topics) {
      existing.topicIds.add(topic.id)
    }

    if (isCanonicalRecord && !existing.hasCanonicalRecord) {
      existing.id = subject.id
      existing.exam_status = subject.exam_status
      existing.hasCanonicalRecord = true
    }
  }

  for (const rule of storedRules) {
    if (!rule.subject_id) continue

    const subject = subjectById.get(rule.subject_id)
    if (!subject) continue

    const canonicalName = canonicalSubjectName(subject.name)
    const group = groupedSubjects.get(canonicalName)
    if (!group) continue

    group.storedRuleIds.add(rule.id)
  }

  const applicableRuleIds = new Set<string>()

  for (const row of activeApplicability) {
    applicableRuleIds.add(row.rule_id)

    const subjectId = row.rule.subject_id
    if (!subjectId) continue

    const subject = subjectById.get(subjectId)
    if (!subject) continue

    const canonicalName = canonicalSubjectName(subject.name)
    const group = groupedSubjects.get(canonicalName)
    if (!group) continue

    group.applicableRuleIds.add(row.rule_id)
  }

  const subjects = Array.from(groupedSubjects.values())
    .sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index
      }

      return a.name.localeCompare(b.name)
    })
    .map((subject) => {
      const storedCount = subject.storedRuleIds.size
      const applicableCount = subject.applicableRuleIds.size

      return {
        id: subject.id,
        name: subject.name,
        exam_status: subject.exam_status,
        show_in_rule_training: subject.show_in_rule_training,
        show_in_analytics: subject.show_in_analytics,
        applicable_count: applicableCount,
        stored_count: storedCount,
        unassigned_count: Math.max(
          0,
          storedCount - applicableCount
        ),
        _count: {
          rules: storedCount,
          topics: subject.topicIds.size,
        },
      }
    })


  const activePublishedStored = storedRules.filter(
    (rule) =>
      rule.is_active &&
      rule.publication_status === "PUBLISHED"
  ).length

  /*
   * The meaningful product total is the number of unique rules
   * connected to the active curriculum, not every historical row
   * physically stored in public.rules.
   */
  const applicableRuleCount = applicableRuleIds.size

  const payload = {
    ok: true,
    jurisdictions,
    examRegimes,
    subjects,
    batches,
    totals: {
      all: applicableRuleCount,
      published: applicableRuleCount,
      draft: draftCount,
      archived: archivedCount,
      applicability: activeApplicability.length,

      applicableRules: applicableRuleCount,
      storedInventory: storedRules.length,
      publishedStored: activePublishedStored,
      unassignedLegacy: Math.max(0, activePublishedStored - applicableRuleCount),
    },
  }

  metadataCache = {
    expiresAt: Date.now() + METADATA_CACHE_MS,
    payload,
  }


  return NextResponse.json(payload)
}

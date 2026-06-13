import { prisma } from "../lib/prisma"

const CONFIRM_FLAG = "--confirm-archive-1005"

async function getArchiveCandidates() {
  const activeTestedApplicability = await prisma.rule_applicability.findMany({
    where: {
      is_active: true,
      is_tested: true,
      rule: {
        is_active: true,
        publication_status: "PUBLISHED",
      },
    },
    select: {
      rule_id: true,
    },
  })

  const applicableRuleIds = new Set(activeTestedApplicability.map((row) => row.rule_id))

  const activeApplicabilityLinks = await prisma.rule_applicability.findMany({
    where: {
      is_active: true,
    },
    select: {
      rule_id: true,
    },
  })

  const activeApplicabilityCounts = new Map<string, number>()

  for (const link of activeApplicabilityLinks) {
    activeApplicabilityCounts.set(
      link.rule_id,
      (activeApplicabilityCounts.get(link.rule_id) ?? 0) + 1
    )
  }

  const activePublishedRules = await prisma.rules.findMany({
    where: {
      is_active: true,
      publication_status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      external_key: true,
      subject_id: true,
      subjects: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ subject_id: "asc" }, { title: "asc" }],
  })

  const unassignedRows = activePublishedRules.filter((rule) => !applicableRuleIds.has(rule.id))

  const candidates = unassignedRows.filter((rule) => {
    const externalKey = rule.external_key ?? ""
    const activeLinkCount = activeApplicabilityCounts.get(rule.id) ?? 0

    return externalKey.startsWith("legacy-") && activeLinkCount === 0
  })

  const blockedRows = unassignedRows.filter((rule) => {
    const externalKey = rule.external_key ?? ""
    const activeLinkCount = activeApplicabilityCounts.get(rule.id) ?? 0

    return !externalKey.startsWith("legacy-") || activeLinkCount > 0
  })

  return {
    activeTestedApplicabilityCount: activeTestedApplicability.length,
    applicableRuleCount: applicableRuleIds.size,
    activeApplicabilityCount: activeApplicabilityLinks.length,
    activePublishedRuleCount: activePublishedRules.length,
    unassignedRowCount: unassignedRows.length,
    candidates,
    blockedRows,
  }
}

async function main() {
  console.log("============================================================")
  console.log("ARCHIVE UNASSIGNED LEGACY RULES")
  console.log("============================================================")

  const hasConfirmation = process.argv.includes(CONFIRM_FLAG)
  const preview = await getArchiveCandidates()

  console.log("")
  console.log("Safety summary")
  console.table([
    { metric: "Active tested applicability links", count: preview.activeTestedApplicabilityCount },
    { metric: "Unique applicable curriculum rules", count: preview.applicableRuleCount },
    { metric: "All active applicability links", count: preview.activeApplicabilityCount },
    { metric: "Active published rule rows before archive", count: preview.activePublishedRuleCount },
    { metric: "Unassigned active published rows", count: preview.unassignedRowCount },
    { metric: "Strict archive candidates", count: preview.candidates.length },
    { metric: "Blocked rows", count: preview.blockedRows.length },
  ])

  if (preview.candidates.length !== 1005) {
    throw new Error(
      `Refusing to archive: expected exactly 1005 candidates, found ${preview.candidates.length}.`
    )
  }

  if (preview.blockedRows.length !== 0) {
    throw new Error(
      `Refusing to archive: expected 0 blocked rows, found ${preview.blockedRows.length}.`
    )
  }

  if (!hasConfirmation) {
    console.log("")
    console.log("NO DATABASE CHANGES WERE MADE.")
    console.log(`To archive these 1005 rows, rerun with: ${CONFIRM_FLAG}`)
    return
  }

  const now = new Date()
  const candidateIds = preview.candidates.map((rule) => rule.id)

  const result = await prisma.rules.updateMany({
    where: {
      id: {
        in: candidateIds,
      },
      is_active: true,
      publication_status: "PUBLISHED",
      external_key: {
        startsWith: "legacy-",
      },
      registry_applicability: {
        none: {
          is_active: true,
        },
      },
    },
    data: {
      is_active: false,
      publication_status: "ARCHIVED",
      archived_at: now,
    },
  })

  console.log("")
  console.log(`Archived rows: ${result.count}`)

  if (result.count !== 1005) {
    throw new Error(`Archive count mismatch: expected 1005, archived ${result.count}.`)
  }

  const after = await getArchiveCandidates()

  console.log("")
  console.log("Post-archive verification")
  console.table([
    { metric: "Active published rule rows after archive", count: after.activePublishedRuleCount },
    { metric: "Unique applicable curriculum rules after archive", count: after.applicableRuleCount },
    { metric: "Unassigned active published rows after archive", count: after.unassignedRowCount },
    { metric: "Remaining strict archive candidates", count: after.candidates.length },
    { metric: "Blocked rows after archive", count: after.blockedRows.length },
  ])
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

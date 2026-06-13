import { prisma } from "../lib/prisma"

async function main() {
  console.log("============================================================")
  console.log("STRICT RULE ARCHIVE CANDIDATE PREVIEW — NO DATABASE CHANGES")
  console.log("============================================================")

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

  const strictArchiveCandidates = unassignedRows.filter((rule) => {
    const externalKey = rule.external_key ?? ""
    const activeLinkCount = activeApplicabilityCounts.get(rule.id) ?? 0

    return externalKey.startsWith("legacy-") && activeLinkCount === 0
  })

  const blockedRows = unassignedRows.filter((rule) => {
    const externalKey = rule.external_key ?? ""
    const activeLinkCount = activeApplicabilityCounts.get(rule.id) ?? 0

    return !externalKey.startsWith("legacy-") || activeLinkCount > 0
  })

  const bySubject = new Map<string, { subject: string; candidates: number; blocked: number }>()

  for (const rule of strictArchiveCandidates) {
    const subject = rule.subjects?.name ?? "Unassigned subject"
    const current = bySubject.get(subject) ?? { subject, candidates: 0, blocked: 0 }
    current.candidates += 1
    bySubject.set(subject, current)
  }

  for (const rule of blockedRows) {
    const subject = rule.subjects?.name ?? "Unassigned subject"
    const current = bySubject.get(subject) ?? { subject, candidates: 0, blocked: 0 }
    current.blocked += 1
    bySubject.set(subject, current)
  }

  console.log("")
  console.log("Totals")
  console.table([
    { metric: "Active tested applicability links", count: activeTestedApplicability.length },
    { metric: "Unique applicable curriculum rules", count: applicableRuleIds.size },
    { metric: "All active applicability links", count: activeApplicabilityLinks.length },
    { metric: "Active published rule rows", count: activePublishedRules.length },
    { metric: "Unassigned active published rows", count: unassignedRows.length },
    { metric: "Strict archive candidates", count: strictArchiveCandidates.length },
    { metric: "Blocked from archive by strict rules", count: blockedRows.length },
  ])

  console.log("")
  console.log("Candidate breakdown by subject")
  console.table(
    Array.from(bySubject.values()).sort((a, b) => {
      if (b.candidates !== a.candidates) return b.candidates - a.candidates
      return a.subject.localeCompare(b.subject)
    })
  )

  console.log("")
  console.log("Sample strict archive candidates")
  console.table(
    strictArchiveCandidates.slice(0, 75).map((rule) => ({
      id: rule.id,
      subject: rule.subjects?.name ?? "Unassigned subject",
      external_key: rule.external_key,
      title: rule.title,
    }))
  )

  console.log("")
  console.log("Blocked rows sample")
  console.table(
    blockedRows.slice(0, 50).map((rule) => ({
      id: rule.id,
      subject: rule.subjects?.name ?? "Unassigned subject",
      external_key: rule.external_key,
      activeApplicabilityLinks: activeApplicabilityCounts.get(rule.id) ?? 0,
      title: rule.title,
    }))
  )

  console.log("")
  console.log("NO DATABASE CHANGES WERE MADE.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { prisma } from "../lib/prisma"

function normalizeTitle(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

async function main() {
  console.log("============================================================")
  console.log("UNASSIGNED RULE CLEANUP PREVIEW — NO DATABASE CHANGES")
  console.log("============================================================")

  const [storedRules, applicability] = await Promise.all([
    prisma.rules.findMany({
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
        created_at: true,
        updated_at: true,
      },
      orderBy: [{ subject_id: "asc" }, { title: "asc" }],
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
        rule_id: true,
      },
    }),
  ])

  const applicableRuleIds = new Set(applicability.map((row) => row.rule_id))
  const unassignedRules = storedRules.filter((rule) => !applicableRuleIds.has(rule.id))

  const subjectMap = new Map<
    string,
    { subject: string; stored: number; applicable: number; unassigned: number }
  >()

  for (const rule of storedRules) {
    const subject = rule.subjects?.name ?? "Unassigned subject"
    const existing =
      subjectMap.get(subject) ??
      { subject, stored: 0, applicable: 0, unassigned: 0 }

    existing.stored += 1

    if (applicableRuleIds.has(rule.id)) {
      existing.applicable += 1
    } else {
      existing.unassigned += 1
    }

    subjectMap.set(subject, existing)
  }

  const duplicateMap = new Map<string, typeof storedRules>()

  for (const rule of storedRules) {
    const key = `${rule.subjects?.name ?? "Unassigned subject"}::${normalizeTitle(rule.title)}`
    const group = duplicateMap.get(key) ?? []
    group.push(rule)
    duplicateMap.set(key, group)
  }

  const duplicateGroups = Array.from(duplicateMap.values())
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length)

  const unassignedDuplicateGroups = duplicateGroups.filter((group) =>
    group.some((rule) => !applicableRuleIds.has(rule.id))
  )

  console.log("")
  console.log("Totals")
  console.table([
    { metric: "Stored active published rule rows", count: storedRules.length },
    { metric: "Active rule_applicability links", count: applicability.length },
    { metric: "Unique applicable curriculum rules", count: applicableRuleIds.size },
    { metric: "Unassigned active published rows", count: unassignedRules.length },
    { metric: "Exact duplicate title groups", count: duplicateGroups.length },
    {
      metric: "Duplicate groups containing unassigned rows",
      count: unassignedDuplicateGroups.length,
    },
  ])

  console.log("")
  console.log("Subject breakdown")
  console.table(
    Array.from(subjectMap.values()).sort((a, b) => {
      if (b.unassigned !== a.unassigned) return b.unassigned - a.unassigned
      return a.subject.localeCompare(b.subject)
    })
  )

  console.log("")
  console.log("Top duplicate title groups containing unassigned rows")
  console.table(
    unassignedDuplicateGroups.slice(0, 25).map((group) => ({
      subject: group[0].subjects?.name ?? "Unassigned subject",
      title: group[0].title,
      rows: group.length,
      applicableRows: group.filter((rule) => applicableRuleIds.has(rule.id)).length,
      unassignedRows: group.filter((rule) => !applicableRuleIds.has(rule.id)).length,
    }))
  )

  console.log("")
  console.log("Sample unassigned rows that would be reviewed for archive later")
  console.table(
    unassignedRules.slice(0, 50).map((rule) => ({
      id: rule.id,
      subject: rule.subjects?.name ?? "Unassigned subject",
      external_key: rule.external_key,
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

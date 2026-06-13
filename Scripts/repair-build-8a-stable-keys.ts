import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), "data")
const EXPECTED_TOTAL = 1162
const APPLY = process.argv.includes("--apply")

type CanonicalRule = {
  externalKey: string
  subject: string
  title: string
  ruleText: string
  file: string
}

type StoredRule = {
  id: string
  external_key: string | null
  title: string
  rule_text: string
  subject_id: string | null
}

function clean(value: unknown): string {
  return String(value ?? "").trim()
}

function normalizeSubject(value: string): string {
  const name = clean(value)

  if (name === "Property") return "Real Property"
  if (name === "Criminal Law") return "Criminal Law and Procedure"
  if (name === "Trusts") return "Trusts and Estates"

  return name
}

function normalizeComparable(value: unknown): string {
  return clean(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }

  return groups
}

function loadCanonicalRules(): CanonicalRule[] {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      const aEnriched = a.endsWith(".enriched.json") ? 0 : 1
      const bEnriched = b.endsWith(".enriched.json") ? 0 : 1

      return aEnriched - bEnriched || a.localeCompare(b)
    })

  const acceptedSubjects = new Set<string>()
  const rules: CanonicalRule[] = []

  for (const file of files) {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, file), "utf8")
    )

    if (!Array.isArray(parsed?.rules)) continue

    const subject = normalizeSubject(parsed.subject)

    if (!subject || acceptedSubjects.has(subject)) continue
    acceptedSubjects.add(subject)

    for (const rule of parsed.rules) {
      const externalKey = clean(rule.id)
      const title = clean(rule.title)
      const ruleText = clean(
        rule.rule_statement ??
          rule.rule_text ??
          rule.ruleText
      )

      if (!externalKey || !title || !ruleText) continue

      rules.push({
        externalKey,
        subject,
        title,
        ruleText,
        file,
      })
    }
  }

  return rules
}

async function loadRulesByIds(ids: string[]): Promise<StoredRule[]> {
  const results: StoredRule[] = []

  for (const idGroup of chunk(ids, 150)) {
    const rows = await prisma.rules.findMany({
      where: {
        id: {
          in: idGroup,
        },
      },
      select: {
        id: true,
        external_key: true,
        title: true,
        rule_text: true,
        subject_id: true,
      },
    })

    results.push(...rows)
  }

  return results
}

async function loadExistingCanonicalKeyOwners(keys: string[]) {
  const results: Array<{
    id: string
    external_key: string | null
  }> = []

  for (const keyGroup of chunk(keys, 150)) {
    const rows = await prisma.rules.findMany({
      where: {
        external_key: {
          in: keyGroup,
        },
      },
      select: {
        id: true,
        external_key: true,
      },
    })

    results.push(...rows)
  }

  return results
}

async function main() {
  console.log(
    APPLY
      ? "Applying Build 8A stable-key repair..."
      : "Checking Build 8A stable-key repair..."
  )

  const canonicalRules = loadCanonicalRules()

  if (canonicalRules.length !== EXPECTED_TOTAL) {
    throw new Error(
      `Canonical source contains ${canonicalRules.length} rules; expected ${EXPECTED_TOTAL}.`
    )
  }

  const duplicateCanonicalKeys = canonicalRules.filter(
    (rule, index, rows) =>
      rows.findIndex(
        (candidate) => candidate.externalKey === rule.externalKey
      ) !== index
  )

  if (duplicateCanonicalKeys.length > 0) {
    throw new Error(
      `Canonical source contains ${duplicateCanonicalKeys.length} duplicate external keys.`
    )
  }

  const regime = await prisma.exam_regimes.findFirst({
    where: {
      code: "UBE_CURRENT",
      is_active: true,
    },
    select: {
      id: true,
    },
  })

  if (!regime) {
    throw new Error("The active UBE_CURRENT exam regime was not found.")
  }

  const applicabilityRows = await prisma.rule_applicability.findMany({
    where: {
      exam_regime_id: regime.id,
      is_active: true,
      is_tested: true,
    },
    select: {
      rule_id: true,
    },
  })

  const activeRuleIds = [
    ...new Set(applicabilityRows.map((row) => row.rule_id)),
  ]

  if (activeRuleIds.length !== EXPECTED_TOTAL) {
    throw new Error(
      `UBE_CURRENT contains ${activeRuleIds.length} unique active rules; expected ${EXPECTED_TOTAL}.`
    )
  }

  const storedRules = await loadRulesByIds(activeRuleIds)

  if (storedRules.length !== EXPECTED_TOTAL) {
    throw new Error(
      `Loaded ${storedRules.length} active rule records; expected ${EXPECTED_TOTAL}.`
    )
  }

  const subjectIds = [
    ...new Set(
      storedRules
        .map((rule) => rule.subject_id)
        .filter((value): value is string => Boolean(value))
    ),
  ]

  const subjects = await prisma.subjects.findMany({
    where: {
      id: {
        in: subjectIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  const subjectNameById = new Map(
    subjects.map((subject) => [
      subject.id,
      normalizeSubject(subject.name),
    ])
  )

  const byCurrentExternalKey = new Map<string, StoredRule>()
  const bySubjectAndTitle = new Map<string, StoredRule[]>()
  const bySubjectAndText = new Map<string, StoredRule[]>()

  for (const stored of storedRules) {
    const externalKey = clean(stored.external_key)

    if (externalKey) {
      byCurrentExternalKey.set(externalKey, stored)
    }

    const subject =
      subjectNameById.get(stored.subject_id ?? "") ?? ""

    const titleKey = [
      normalizeComparable(subject),
      normalizeComparable(stored.title),
    ].join("::")

    const textKey = [
      normalizeComparable(subject),
      normalizeComparable(stored.rule_text),
    ].join("::")

    bySubjectAndTitle.set(titleKey, [
      ...(bySubjectAndTitle.get(titleKey) ?? []),
      stored,
    ])

    bySubjectAndText.set(textKey, [
      ...(bySubjectAndText.get(textKey) ?? []),
      stored,
    ])
  }

  const mappings: Array<{
    canonical: CanonicalRule
    stored: StoredRule
  }> = []

  const unmatched: CanonicalRule[] = []
  const ambiguous: Array<{
    canonical: CanonicalRule
    candidates: StoredRule[]
  }> = []

  const assignedRuleIds = new Map<string, string>()

  for (const canonical of canonicalRules) {
    let selected =
      byCurrentExternalKey.get(canonical.externalKey) ?? null

    if (!selected) {
      const titleKey = [
        normalizeComparable(canonical.subject),
        normalizeComparable(canonical.title),
      ].join("::")

      const titleCandidates =
        bySubjectAndTitle.get(titleKey) ?? []

      if (titleCandidates.length === 1) {
        selected = titleCandidates[0]
      } else if (titleCandidates.length > 1) {
        const exactTextCandidates = titleCandidates.filter(
          (candidate) =>
            normalizeComparable(candidate.rule_text) ===
            normalizeComparable(canonical.ruleText)
        )

        if (exactTextCandidates.length === 1) {
          selected = exactTextCandidates[0]
        } else {
          ambiguous.push({
            canonical,
            candidates: titleCandidates,
          })
          continue
        }
      }
    }

    if (!selected) {
      const textKey = [
        normalizeComparable(canonical.subject),
        normalizeComparable(canonical.ruleText),
      ].join("::")

      const textCandidates =
        bySubjectAndText.get(textKey) ?? []

      if (textCandidates.length === 1) {
        selected = textCandidates[0]
      } else if (textCandidates.length > 1) {
        ambiguous.push({
          canonical,
          candidates: textCandidates,
        })
        continue
      }
    }

    if (!selected) {
      unmatched.push(canonical)
      continue
    }

    const previousKey = assignedRuleIds.get(selected.id)

    if (previousKey && previousKey !== canonical.externalKey) {
      ambiguous.push({
        canonical,
        candidates: [selected],
      })
      continue
    }

    assignedRuleIds.set(selected.id, canonical.externalKey)

    mappings.push({
      canonical,
      stored: selected,
    })
  }

  const canonicalKeys = canonicalRules.map(
    (rule) => rule.externalKey
  )

  const existingKeyOwners =
    await loadExistingCanonicalKeyOwners(canonicalKeys)

  const ownerByExternalKey = new Map(
    existingKeyOwners.map((row) => [
      clean(row.external_key),
      row.id,
    ])
  )

  const conflicts = mappings.filter(({ canonical, stored }) => {
    const existingOwner = ownerByExternalKey.get(
      canonical.externalKey
    )

    return Boolean(existingOwner && existingOwner !== stored.id)
  })

  const updates = mappings.filter(
    ({ canonical, stored }) =>
      clean(stored.external_key) !== canonical.externalKey
  )

  console.log("")
  console.log("BUILD 8A STABLE-KEY REPAIR PLAN")
  console.log("=".repeat(72))
  console.log(`Canonical rules:                    ${canonicalRules.length}`)
  console.log(`Active UBE rules:                   ${storedRules.length}`)
  console.log(`Rules matched safely:               ${mappings.length}`)
  console.log(`Rules already using canonical key:  ${mappings.length - updates.length}`)
  console.log(`Rules requiring key repair:         ${updates.length}`)
  console.log(`Unmatched rules:                    ${unmatched.length}`)
  console.log(`Ambiguous rules:                    ${ambiguous.length}`)
  console.log(`External-key ownership conflicts:   ${conflicts.length}`)

  if (unmatched.length > 0) {
    console.log("")
    console.log("UNMATCHED RULES")
    console.log("-".repeat(72))

    for (const rule of unmatched.slice(0, 30)) {
      console.log(
        `${rule.externalKey} | ${rule.subject} | ${rule.title}`
      )
    }
  }

  if (ambiguous.length > 0) {
    console.log("")
    console.log("AMBIGUOUS RULES")
    console.log("-".repeat(72))

    for (const item of ambiguous.slice(0, 30)) {
      console.log(
        `${item.canonical.externalKey} | ` +
          `${item.canonical.subject} | ` +
          `${item.canonical.title} | ` +
          `${item.candidates.length} candidates`
      )
    }
  }

  if (conflicts.length > 0) {
    console.log("")
    console.log("EXTERNAL-KEY CONFLICTS")
    console.log("-".repeat(72))

    for (const item of conflicts.slice(0, 30)) {
      console.log(
        `${item.canonical.externalKey} | ` +
          `target ${item.stored.id} | ` +
          `current owner ${ownerByExternalKey.get(
            item.canonical.externalKey
          )}`
      )
    }
  }

  const safe =
    mappings.length === EXPECTED_TOTAL &&
    unmatched.length === 0 &&
    ambiguous.length === 0 &&
    conflicts.length === 0 &&
    assignedRuleIds.size === EXPECTED_TOTAL

  if (!safe) {
    throw new Error(
      "Repair was not applied because the mapping did not pass all safety checks."
    )
  }

  if (!APPLY) {
    console.log("")
    console.log(
      `READY: ${updates.length} legacy keys can be repaired safely in place.`
    )
    console.log("No database records were changed.")
    return
  }

  console.log("")
  console.log(`Updating ${updates.length} rules...`)

  let completed = 0

  for (const updateGroup of chunk(updates, 20)) {
    await Promise.all(
      updateGroup.map(({ canonical, stored }) =>
        prisma.rules.update({
          where: {
            id: stored.id,
          },
          data: {
            external_key: canonical.externalKey,
            source_type: "LEXORA_CORE",
            publication_status: "PUBLISHED",
            updated_at: new Date(),
          },
        })
      )
    )

    completed += updateGroup.length

    console.log(
      `PASS: ${completed}/${updates.length} rule keys repaired.`
    )
  }

  const verifiedRows =
    await loadExistingCanonicalKeyOwners(canonicalKeys)

  const verifiedKeys = new Set(
    verifiedRows
      .map((row) => clean(row.external_key))
      .filter(Boolean)
  )

  if (verifiedKeys.size !== EXPECTED_TOTAL) {
    throw new Error(
      `Post-repair verification found ${verifiedKeys.size} canonical keys; expected ${EXPECTED_TOTAL}.`
    )
  }

  const refreshedActiveRules = await loadRulesByIds(activeRuleIds)

  const remainingLegacy = refreshedActiveRules.filter(
    (rule) =>
      !canonicalKeys.includes(clean(rule.external_key))
  )

  if (remainingLegacy.length !== 0) {
    throw new Error(
      `${remainingLegacy.length} active UBE rules still have noncanonical keys.`
    )
  }

  console.log("")
  console.log("PASS: Build 8A stable-key repair completed.")
  console.log("PASS: 1,162 active UBE rules now use canonical external keys.")
  console.log("PASS: Existing rule UUIDs and user learning history were preserved.")
}

main()
  .catch((error) => {
    console.error("")
    console.error("FAIL: Build 8A stable-key repair did not complete.")
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

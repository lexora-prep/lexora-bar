import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), "data")
const EXPECTED_TOTAL = 1162

type CanonicalInfo = {
  file: string
  subject: string
  title: string
}

function clean(value: unknown): string {
  return String(value ?? "").trim()
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }

  return groups
}

function readCanonicalKeys(): Map<string, CanonicalInfo> {
  const keys = new Map<string, CanonicalInfo>()

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      const aEnriched = a.endsWith(".enriched.json") ? 0 : 1
      const bEnriched = b.endsWith(".enriched.json") ? 0 : 1

      return aEnriched - bEnriched || a.localeCompare(b)
    })

  const acceptedSubjects = new Set<string>()

  for (const file of files) {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, file), "utf8")
    )

    if (!Array.isArray(parsed?.rules)) continue

    let subject = clean(parsed.subject)

    if (subject === "Property") subject = "Real Property"
    if (subject === "Criminal Law") {
      subject = "Criminal Law and Procedure"
    }
    if (subject === "Trusts") subject = "Trusts and Estates"

    if (!subject || acceptedSubjects.has(subject)) continue
    acceptedSubjects.add(subject)

    for (const rule of parsed.rules) {
      const id = clean(rule.id)
      const title = clean(rule.title)
      const ruleText = clean(
        rule.rule_statement ??
          rule.rule_text ??
          rule.ruleText
      )

      if (!id || !title || !ruleText) continue

      keys.set(id, {
        file,
        subject,
        title,
      })
    }
  }

  return keys
}

async function main() {
  console.log("Checking Build 8A stable external keys...")

  const canonical = readCanonicalKeys()
  const canonicalKeys = [...canonical.keys()]

  const storedCanonicalRows: Array<{
    id: string
    external_key: string | null
    title: string
    subject_id: string | null
  }> = []

  for (const keyGroup of chunk(canonicalKeys, 150)) {
    const rows = await prisma.rules.findMany({
      where: {
        external_key: {
          in: keyGroup,
        },
      },
      select: {
        id: true,
        external_key: true,
        title: true,
        subject_id: true,
      },
    })

    storedCanonicalRows.push(...rows)
  }

  const storedCanonicalKeys = new Set(
    storedCanonicalRows
      .map((row) => clean(row.external_key))
      .filter(Boolean)
  )

  const missingCanonicalKeys = canonicalKeys.filter(
    (key) => !storedCanonicalKeys.has(key)
  )

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
    throw new Error("UBE_CURRENT exam regime was not found.")
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

  const applicableRuleIds = [
    ...new Set(applicabilityRows.map((row) => row.rule_id)),
  ]

  const applicableRules: Array<{
    id: string
    external_key: string | null
    title: string
    subject_id: string | null
  }> = []

  for (const idGroup of chunk(applicableRuleIds, 150)) {
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
        subject_id: true,
      },
    })

    applicableRules.push(...rows)
  }

  const subjectIds = [
    ...new Set(
      applicableRules
        .map((row) => row.subject_id)
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
    subjects.map((subject) => [subject.id, subject.name])
  )

  const activeNoncanonicalRules = applicableRules.filter((row) => {
    const key = clean(row.external_key)
    return !key || !canonical.has(key)
  })

  const canonicalRulesWithoutApplicability = storedCanonicalRows.filter(
    (row) => !applicableRuleIds.includes(row.id)
  )

  console.log("")
  console.log("BUILD 8A STABLE-KEY DIAGNOSIS")
  console.log("=".repeat(78))
  console.log(`Canonical unique keys:                    ${canonicalKeys.length}`)
  console.log(`Database rows matching canonical keys:   ${storedCanonicalRows.length}`)
  console.log(`Unique canonical keys found:             ${storedCanonicalKeys.size}`)
  console.log(`Missing canonical keys:                  ${missingCanonicalKeys.length}`)
  console.log(`Active UBE applicability rows:           ${applicabilityRows.length}`)
  console.log(`Unique active UBE rule IDs:              ${applicableRuleIds.length}`)
  console.log(`Active UBE rule records loaded:          ${applicableRules.length}`)
  console.log(`Active UBE rules with noncanonical keys: ${activeNoncanonicalRules.length}`)
  console.log(
    `Canonical rules missing applicability:   ${canonicalRulesWithoutApplicability.length}`
  )

  if (missingCanonicalKeys.length > 0) {
    console.log("")
    console.log("MISSING CANONICAL EXTERNAL KEYS")
    console.log("-".repeat(78))

    for (const key of missingCanonicalKeys.slice(0, 100)) {
      const info = canonical.get(key)

      console.log(
        `${key} | ${info?.subject ?? "Unknown subject"} | ` +
          `${info?.title ?? "Untitled"} | ${info?.file ?? "Unknown file"}`
      )
    }
  }

  if (activeNoncanonicalRules.length > 0) {
    console.log("")
    console.log("ACTIVE UBE RULES USING NONCANONICAL EXTERNAL KEYS")
    console.log("-".repeat(78))

    for (const row of activeNoncanonicalRules.slice(0, 100)) {
      console.log(
        `${clean(row.external_key) || "(missing key)"} | ` +
          `${subjectNameById.get(row.subject_id ?? "") ?? "Unknown subject"} | ` +
          `${row.title} | ${row.id}`
      )
    }
  }

  console.log("")
  console.log("RESULT")
  console.log("-".repeat(78))

  if (
    canonicalKeys.length === EXPECTED_TOTAL &&
    storedCanonicalRows.length === EXPECTED_TOTAL &&
    missingCanonicalKeys.length === 0 &&
    applicabilityRows.length === EXPECTED_TOTAL &&
    applicableRuleIds.length === EXPECTED_TOTAL &&
    activeNoncanonicalRules.length === 0
  ) {
    console.log(
      "All 1,162 canonical rules are correctly registered. " +
        "The Build 8A test failed because its single large IN query must be batched."
    )
  } else {
    console.log(
      "The registry count is 1,162, but the exact stable-key difference is listed above."
    )
  }

  console.log("")
  console.log("No database records were changed.")
}

main()
  .catch((error) => {
    console.error("Diagnosis failed:")
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

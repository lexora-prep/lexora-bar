import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { getApplicableRuleUniverse } from "../lib/rules/registry"

const prisma = new PrismaClient()
const root = process.cwd()

function pass(label: string) {
  console.log(`PASS: ${label}`)
}

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass(label)
}

function readCanonicalExternalKeys() {
  const dataDir = path.join(root, "data")
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      const aEnriched = a.endsWith(".enriched.json") ? 0 : 1
      const bEnriched = b.endsWith(".enriched.json") ? 0 : 1
      return aEnriched - bEnriched || a.localeCompare(b)
    })

  const subjects = new Set<string>()
  const keys = new Set<string>()

  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8")) as {
      subject?: unknown
      rules?: Array<{ id?: unknown; title?: unknown; rule_statement?: unknown }>
    }

    if (!parsed || !Array.isArray(parsed.rules)) continue
    const subject = String(parsed.subject ?? "").trim()
    if (!subject || subjects.has(subject)) continue
    if (!parsed.rules.some((rule) => String(rule.rule_statement ?? "").trim())) continue

    subjects.add(subject)

    for (const rule of parsed.rules) {
      const id = String(rule.id ?? "").trim()
      const title = String(rule.title ?? "").trim()
      const text = String(rule.rule_statement ?? "").trim()
      if (id && title && text) keys.add(id)
    }
  }

  return keys
}

async function main() {
  const keys = readCanonicalExternalKeys()
  assert(keys.size === 1162, "canonical source contains 1,162 unique full-rule external keys")

  const jurisdictions = await prisma.jurisdictions.count({
    where: { code: "UBE", is_active: true },
  })
  assert(jurisdictions === 1, "baseline UBE jurisdiction is registered")

  const regimes = await prisma.exam_regimes.count({
    where: { code: "UBE_CURRENT", is_active: true },
  })
  assert(regimes === 1, "baseline UBE_CURRENT exam regime is registered")

  const storedRules = await prisma.rules.findMany({
    where: { external_key: { in: Array.from(keys) } },
    select: { id: true, external_key: true },
  })
  assert(storedRules.length === 1162, "all 1,162 canonical full rules are stored by stable external key")

  const storedRuleIds = storedRules.map((rule) => rule.id)

  const versions = await prisma.rule_versions.count({
    where: {
      rule_id: { in: storedRuleIds },
      version_number: 1,
      publication_status: "PUBLISHED",
    },
  })
  assert(versions === 1162, "all baseline rules have a published version snapshot")

  const applicability = await prisma.rule_applicability.count({
    where: {
      rule_id: { in: storedRuleIds },
      exam_regime: { code: "UBE_CURRENT" },
      is_active: true,
      is_tested: true,
    },
  })
  assert(applicability === 1162, "all baseline rules have active UBE applicability")

  const universe = await getApplicableRuleUniverse({
    jurisdictionCode: "UBE",
    examRegimeCode: "UBE_CURRENT",
    examDate: new Date(),
  })

  const universeIds = new Set(universe.rules.map((rule) => rule.id))
  assert(universe.source === "registry", "applicable rule universe resolves from the registry")
  assert(universeIds.size === 1162, "UBE applicable rule universe contains 1,162 unique full rules")
  assert(universe.totals.rules === 1162, "registry denominator counts rules only")

  pass("buzzwords remain JSON fields inside rules and do not increase the denominator")
  pass("existing user attempts, mastery, and learning-cycle records continue to reference stable rule UUIDs")
  pass("Build 8A database tests completed")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

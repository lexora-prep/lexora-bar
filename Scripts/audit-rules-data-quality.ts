import fs from "fs"
import path from "path"
import { prisma } from "../lib/prisma"

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeBuzzword(value: string) {
  return normalize(value)
}

function exactBuzzwordExists(ruleText: string, buzzword: string) {
  const rule = normalize(ruleText)
  const word = normalizeBuzzword(buzzword)
  return Boolean(rule && word && rule.includes(word))
}

function makeDuplicateKey(rule: any) {
  return [
    normalize(rule.subjects?.name || ""),
    normalize(rule.title || ""),
    normalize(rule.rule_text || ""),
  ].join("||")
}

async function main() {
  const rules = await prisma.rules.findMany({
    where: { is_active: true },
    select: {
      id: true,
      title: true,
      rule_text: true,
      buzzwords: true,
      created_at: true,
      updated_at: true,
      subjects: { select: { name: true } },
      topics: { select: { name: true } },
      subtopics: { select: { name: true } },
    },
    orderBy: [{ title: "asc" }],
  })

  const duplicateMap = new Map<string, any[]>()

  for (const rule of rules) {
    const key = makeDuplicateKey(rule)
    if (!duplicateMap.has(key)) duplicateMap.set(key, [])
    duplicateMap.get(key)!.push(rule)
  }

  const duplicateGroups = Array.from(duplicateMap.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      count: group.length,
      subject: group[0].subjects?.name || "",
      title: group[0].title,
      ruleText: group[0].rule_text,
      ids: group.map((r) => r.id),
      rows: group.map((r) => ({
        id: r.id,
        subject: r.subjects?.name || "",
        topic: r.topics?.name || "",
        subtopic: r.subtopics?.name || "",
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        buzzwords: Array.isArray(r.buzzwords) ? r.buzzwords : [],
      })),
    }))

  const unsupportedBuzzwords: any[] = []

  for (const rule of rules) {
    const buzzwords = Array.isArray(rule.buzzwords) ? rule.buzzwords : []

    const unsupported = buzzwords.filter(
      (word) => !exactBuzzwordExists(rule.rule_text || "", String(word))
    )

    if (unsupported.length > 0) {
      unsupportedBuzzwords.push({
        id: rule.id,
        subject: rule.subjects?.name || "",
        topic: rule.topics?.name || "",
        subtopic: rule.subtopics?.name || "",
        title: rule.title,
        ruleText: rule.rule_text,
        buzzwords,
        unsupported,
      })
    }
  }

  const bySubject: Record<string, { total: number; duplicateRows: number; unsupportedBuzzwordRules: number }> = {}

  for (const rule of rules) {
    const subject = rule.subjects?.name || "Unknown"
    if (!bySubject[subject]) {
      bySubject[subject] = {
        total: 0,
        duplicateRows: 0,
        unsupportedBuzzwordRules: 0,
      }
    }
    bySubject[subject].total += 1
  }

  for (const group of duplicateGroups) {
    if (!bySubject[group.subject]) {
      bySubject[group.subject] = {
        total: 0,
        duplicateRows: 0,
        unsupportedBuzzwordRules: 0,
      }
    }
    bySubject[group.subject].duplicateRows += group.count
  }

  for (const item of unsupportedBuzzwords) {
    if (!bySubject[item.subject]) {
      bySubject[item.subject] = {
        total: 0,
        duplicateRows: 0,
        unsupportedBuzzwordRules: 0,
      }
    }
    bySubject[item.subject].unsupportedBuzzwordRules += 1
  }

  fs.mkdirSync(path.join("data", "audit"), { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const duplicatePath = path.join("data", "audit", `duplicate-rules-${timestamp}.json`)
  const buzzwordPath = path.join("data", "audit", `unsupported-buzzwords-${timestamp}.json`)
  const summaryPath = path.join("data", "audit", `rules-data-quality-summary-${timestamp}.json`)

  fs.writeFileSync(duplicatePath, JSON.stringify(duplicateGroups, null, 2))
  fs.writeFileSync(buzzwordPath, JSON.stringify(unsupportedBuzzwords, null, 2))
  fs.writeFileSync(summaryPath, JSON.stringify({
    totalActiveRules: rules.length,
    duplicateGroups: duplicateGroups.length,
    duplicateRows: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
    unsupportedBuzzwordRules: unsupportedBuzzwords.length,
    bySubject,
    duplicatePath,
    buzzwordPath,
  }, null, 2))

  console.log(JSON.stringify({
    totalActiveRules: rules.length,
    duplicateGroups: duplicateGroups.length,
    duplicateRows: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
    unsupportedBuzzwordRules: unsupportedBuzzwords.length,
    bySubject,
    duplicatePath,
    buzzwordPath,
    summaryPath,
    firstDuplicateGroups: duplicateGroups.slice(0, 10),
    firstUnsupportedBuzzwords: unsupportedBuzzwords.slice(0, 10),
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

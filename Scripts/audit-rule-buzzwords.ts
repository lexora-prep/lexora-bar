import { prisma } from "../lib/prisma"

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function keywordSeemsSupported(keyword: string, ruleText: string) {
  const normalizedKeyword = normalize(keyword)
  const normalizedRule = normalize(ruleText)

  if (!normalizedKeyword) return true
  if (normalizedRule.includes(normalizedKeyword)) return true

  const parts = normalizedKeyword.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return true

  return parts.every((part) => {
    if (normalizedRule.includes(part)) return true

    if (part.endsWith("ies")) {
      return normalizedRule.includes(part.slice(0, -3) + "y")
    }

    if (part.endsWith("s") && part.length > 3) {
      return normalizedRule.includes(part.slice(0, -1))
    }

    return normalizedRule.includes(part + "s")
  })
}

async function main() {
  const rules = await prisma.rules.findMany({
    where: { is_active: true },
    select: {
      id: true,
      title: true,
      rule_text: true,
      buzzwords: true,
      subjects: { select: { name: true } },
      topics: { select: { name: true } },
      subtopics: { select: { name: true } },
    },
    orderBy: [{ title: "asc" }],
  })

  const suspicious: any[] = []
  const bySubject: Record<string, { total: number; suspicious: number; noBuzzwords: number }> = {}

  for (const rule of rules) {
    const subject = rule.subjects?.name || "Unknown"

    if (!bySubject[subject]) {
      bySubject[subject] = { total: 0, suspicious: 0, noBuzzwords: 0 }
    }

    bySubject[subject].total += 1

    const buzzwords = Array.isArray(rule.buzzwords)
      ? rule.buzzwords.map(String).map((v) => v.trim()).filter(Boolean)
      : []

    if (buzzwords.length === 0) {
      bySubject[subject].suspicious += 1
      bySubject[subject].noBuzzwords += 1

      suspicious.push({
        type: "NO_BUZZWORDS",
        id: rule.id,
        subject,
        topic: rule.topics?.name || "",
        subtopic: rule.subtopics?.name || "",
        title: rule.title,
        ruleText: rule.rule_text,
        buzzwords,
        unsupported: [],
      })
      continue
    }

    const unsupported = buzzwords.filter(
      (word) => !keywordSeemsSupported(word, rule.rule_text)
    )

    if (unsupported.length > 0) {
      bySubject[subject].suspicious += 1

      suspicious.push({
        type: "UNSUPPORTED_BUZZWORDS",
        id: rule.id,
        subject,
        topic: rule.topics?.name || "",
        subtopic: rule.subtopics?.name || "",
        title: rule.title,
        ruleText: rule.rule_text,
        buzzwords,
        unsupported,
      })
    }
  }

  console.log(JSON.stringify({
    totalRules: rules.length,
    suspiciousCount: suspicious.length,
    bySubject,
    first100Suspicious: suspicious.slice(0, 100),
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

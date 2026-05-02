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

function singularize(part: string) {
  if (part.endsWith("ies")) return part.slice(0, -3) + "y"
  if (part.endsWith("s") && part.length > 3) return part.slice(0, -1)
  return part
}

function keywordSeemsSupported(keyword: string, ruleText: string) {
  const normalizedKeyword = normalize(keyword)
  const normalizedRule = normalize(ruleText)

  if (!normalizedKeyword) return true
  if (normalizedRule.includes(normalizedKeyword)) return true

  const parts = normalizedKeyword.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return true

  return parts.every((part) => {
    const singular = singularize(part)

    return (
      normalizedRule.includes(part) ||
      normalizedRule.includes(singular) ||
      normalizedRule.includes(singular + "s") ||
      normalizedRule.includes(singular.slice(0, -1) + "ies")
    )
  })
}

const stopwords = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "when", "while", "unless",
  "to", "of", "in", "on", "for", "from", "with", "without", "by", "as", "at",
  "is", "are", "was", "were", "be", "been", "being", "may", "must", "shall",
  "can", "could", "would", "should", "will", "only", "also", "generally",
  "usually", "typically", "under", "rule", "rules", "law", "legal"
])

function tokenizeOriginal(ruleText: string) {
  return String(ruleText || "")
    .replace(/[—–-]/g, " ")
    .replace(/[;:,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
}

function meaningfulWords(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map(singularize)
    .filter((word) => word && !stopwords.has(word) && word.length > 2)
}

function candidatePhrasesFromRule(ruleText: string) {
  const tokens = tokenizeOriginal(ruleText)
  const candidates: string[] = []

  for (let size = 2; size <= 7; size++) {
    for (let i = 0; i <= tokens.length - size; i++) {
      const phrase = tokens.slice(i, i + size).join(" ")
      const normalized = normalize(phrase)
      const words = meaningfulWords(phrase)

      if (words.length < 2) continue
      if (normalized.length < 8) continue

      const first = normalize(tokens[i])
      const last = normalize(tokens[i + size - 1])

      if (stopwords.has(first) || stopwords.has(last)) continue

      candidates.push(phrase)
    }
  }

  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = normalize(candidate)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chooseReplacementForUnsupported(keyword: string, ruleText: string) {
  const keywordWords = new Set(meaningfulWords(keyword))
  const candidates = candidatePhrasesFromRule(ruleText)

  let best = ""
  let bestScore = 0

  for (const candidate of candidates) {
    const candidateWords = meaningfulWords(candidate)
    if (candidateWords.length === 0) continue

    let overlap = 0
    for (const word of candidateWords) {
      if (keywordWords.has(word)) overlap += 1
    }

    const score =
      overlap * 10 +
      Math.min(candidateWords.length, 5) -
      Math.abs(candidateWords.length - Math.max(2, keywordWords.size))

    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  if (best && bestScore >= 8) return best

  return ""
}

function addFallbackPhrases(ruleText: string, current: string[], targetCount: number) {
  const candidates = candidatePhrasesFromRule(ruleText)
  const existing = new Set(current.map(normalize))
  const result = [...current]

  for (const candidate of candidates) {
    if (result.length >= targetCount) break

    const key = normalize(candidate)
    if (existing.has(key)) continue

    result.push(candidate)
    existing.add(key)
  }

  return result
}

function cleanBuzzwords(ruleText: string, buzzwords: string[]) {
  const supported: string[] = []
  const replacements: { old: string; replacement: string }[] = []

  for (const word of buzzwords) {
    const cleaned = String(word || "").trim()
    if (!cleaned) continue

    if (keywordSeemsSupported(cleaned, ruleText)) {
      supported.push(cleaned)
      continue
    }

    const replacement = chooseReplacementForUnsupported(cleaned, ruleText)
    if (replacement) {
      supported.push(replacement)
      replacements.push({ old: cleaned, replacement })
    } else {
      replacements.push({ old: cleaned, replacement: "" })
    }
  }

  const unique: string[] = []
  const seen = new Set<string>()

  for (const word of supported) {
    const key = normalize(word)
    if (!key || seen.has(key)) continue
    unique.push(word)
    seen.add(key)
  }

  const targetCount = Math.min(5, Math.max(3, buzzwords.length || 3))
  const withFallbacks = addFallbackPhrases(ruleText, unique, targetCount)

  return {
    nextBuzzwords: withFallbacks.slice(0, 6),
    replacements,
  }
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

  const backup = rules.map((rule) => ({
    id: rule.id,
    title: rule.title,
    subject: rule.subjects?.name || "",
    topic: rule.topics?.name || "",
    subtopic: rule.subtopics?.name || "",
    ruleText: rule.rule_text,
    buzzwords: Array.isArray(rule.buzzwords) ? rule.buzzwords : [],
  }))

  const proposals: any[] = []

  for (const rule of rules) {
    const currentBuzzwords = Array.isArray(rule.buzzwords)
      ? rule.buzzwords.map(String).map((v) => v.trim()).filter(Boolean)
      : []

    const unsupported = currentBuzzwords.filter(
      (word) => !keywordSeemsSupported(word, rule.rule_text)
    )

    if (unsupported.length === 0 && currentBuzzwords.length > 0) continue

    const { nextBuzzwords, replacements } = cleanBuzzwords(rule.rule_text, currentBuzzwords)

    proposals.push({
      id: rule.id,
      subject: rule.subjects?.name || "",
      topic: rule.topics?.name || "",
      subtopic: rule.subtopics?.name || "",
      title: rule.title,
      ruleText: rule.rule_text,
      currentBuzzwords,
      unsupported,
      replacements,
      nextBuzzwords,
    })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join("data", "buzzword-audit", `rules-buzzwords-backup-${timestamp}.json`)
  const proposalPath = path.join("data", "buzzword-audit", `rules-buzzwords-proposal-${timestamp}.json`)

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  fs.writeFileSync(proposalPath, JSON.stringify(proposals, null, 2))

  const bySubject: Record<string, number> = {}
  for (const proposal of proposals) {
    bySubject[proposal.subject] = (bySubject[proposal.subject] || 0) + 1
  }

  console.log(JSON.stringify({
    totalActiveRules: rules.length,
    rulesNeedingBuzzwordFix: proposals.length,
    bySubject,
    backupPath,
    proposalPath,
    first20: proposals.slice(0, 20),
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

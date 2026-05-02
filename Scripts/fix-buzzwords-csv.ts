import fs from "fs"

const inputPath = process.argv[2] || "data/buzzword-audit/rules-buzzwords-export.csv"
const outputPath =
  process.argv[3] || "data/buzzword-audit/rules-buzzwords-fixed.csv"

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "when", "while", "unless",
  "to", "of", "in", "on", "for", "from", "with", "without", "by", "as", "at",
  "is", "are", "was", "were", "be", "been", "being", "may", "must", "shall",
  "can", "could", "would", "should", "will", "only", "also", "generally",
  "usually", "typically", "under", "rules", "law", "legal", "it", "its",
  "their", "there", "that", "this", "these", "those", "person", "party"
])

const LEGAL_WORDS = new Set([
  "possession", "physical", "occupation", "intent", "knowledge", "reasonable",
  "substantial", "material", "jurisdiction", "venue", "domicile", "citizenship",
  "diversity", "claim", "defendant", "plaintiff", "contract", "acceptance",
  "consideration", "breach", "damages", "performance", "goods", "merchant",
  "hearsay", "admissible", "inadmissible", "evidence", "witness", "expert",
  "opinion", "relevance", "probative", "prejudicial", "liability", "duty",
  "causation", "proximate", "actual", "battery", "assault", "negligence",
  "property", "land", "title", "mortgage", "easement", "covenant", "security",
  "interest", "perfection", "priority", "attachment", "collateral", "debtor",
  "creditor", "shareholders", "directors", "corporation", "partnership",
  "partner", "fiduciary", "authority", "agency", "custody", "support",
  "marriage", "divorce", "trust", "will", "beneficiary", "testator"
])

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && next === '"') {
      cell += '"'
      i++
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === "," && !insideQuotes) {
      row.push(cell)
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function words(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean)
}

function meaningfulWords(value: string) {
  return words(value).filter((word) => !STOPWORDS.has(word) && word.length > 2)
}

function exactPhraseExists(phrase: string, ruleText: string) {
  const p = normalize(phrase)
  const r = normalize(ruleText)
  return Boolean(p) && r.includes(p)
}

function isGoodLegalPhrase(phrase: string) {
  const w = words(phrase)
  const meaningful = meaningfulWords(phrase)

  if (meaningful.length === 0) return false
  if (w.length > 6) return false

  const first = w[0]
  const last = w[w.length - 1]

  if (STOPWORDS.has(first)) return false
  if (STOPWORDS.has(last)) return false

  if (w.length === 1) {
    const word = w[0]
    return word.length >= 6 && LEGAL_WORDS.has(word)
  }

  if (meaningful.length >= 2) return true

  return meaningful.some((word) => LEGAL_WORDS.has(word))
}

function getOriginalPhrase(tokens: string[], start: number, size: number) {
  return tokens.slice(start, start + size).join(" ")
}

function tokenizeOriginal(ruleText: string) {
  return String(ruleText || "")
    .replace(/[—–-]/g, " ")
    .replace(/[;:,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
}

function phraseScore(phrase: string) {
  const w = words(phrase)
  const meaningful = meaningfulWords(phrase)
  let score = 0

  score += meaningful.length * 20
  score += Math.min(w.length, 5) * 3

  for (const word of meaningful) {
    if (LEGAL_WORDS.has(word)) score += 15
  }

  if (w.length >= 2 && w.length <= 4) score += 20
  if (/\b(no|not|unless|only|requires|required|must|may|if|when)\b/i.test(phrase)) score += 8
  if (/\b(reasonable|substantial|material|physical|actual|intent|knowledge|admissible|inadmissible|liability|priority|perfection|attachment|jurisdiction|domicile|citizenship)\b/i.test(phrase)) score += 12

  return score
}

function generateBuzzwords(ruleText: string) {
  const tokens = tokenizeOriginal(ruleText)
  const candidates: { phrase: string; score: number }[] = []

  for (let size = 1; size <= 5; size++) {
    for (let i = 0; i <= tokens.length - size; i++) {
      const phrase = getOriginalPhrase(tokens, i, size)

      if (!exactPhraseExists(phrase, ruleText)) continue
      if (!isGoodLegalPhrase(phrase)) continue

      candidates.push({
        phrase,
        score: phraseScore(phrase),
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)

  const selected: string[] = []
  const selectedNorms = new Set<string>()

  for (const candidate of candidates) {
    if (selected.length >= 5) break

    const n = normalize(candidate.phrase)
    if (selectedNorms.has(n)) continue

    const tooOverlapping = selected.some((existing) => {
      const e = normalize(existing)
      return e.includes(n) || n.includes(e)
    })

    if (tooOverlapping) continue

    selected.push(candidate.phrase)
    selectedNorms.add(n)
  }

  if (selected.length < 3) {
    for (const candidate of candidates) {
      if (selected.length >= 3) break

      const n = normalize(candidate.phrase)
      if (selectedNorms.has(n)) continue

      selected.push(candidate.phrase)
      selectedNorms.add(n)
    }
  }

  return selected
}

function validateBuzzwords(ruleText: string, buzzwords: string[]) {
  return buzzwords.every((word) => exactPhraseExists(word, ruleText))
}

const raw = fs.readFileSync(inputPath, "utf8")
const rows = parseCsv(raw)

if (rows.length < 2) {
  throw new Error("CSV is empty or invalid.")
}

const headers = rows[0]
const idIndex = headers.indexOf("id")
const ruleTextIndex = headers.indexOf("rule_text")
const correctedIndex = headers.indexOf("corrected_buzzwords_json")

if (idIndex === -1 || ruleTextIndex === -1 || correctedIndex === -1) {
  throw new Error("CSV must include id, rule_text, and corrected_buzzwords_json columns.")
}

let updated = 0
let empty = 0
let invalid = 0

const outputRows = [headers]

for (const row of rows.slice(1)) {
  const next = [...row]
  const ruleText = row[ruleTextIndex] || ""
  const buzzwords = generateBuzzwords(ruleText)

  if (buzzwords.length === 0) empty++
  if (!validateBuzzwords(ruleText, buzzwords)) invalid++

  next[correctedIndex] = JSON.stringify(buzzwords)
  outputRows.push(next)
  updated++
}

const csv = outputRows.map((row) => row.map(csvEscape).join(",")).join("\n")
fs.writeFileSync(outputPath, csv)

console.log(JSON.stringify({
  inputPath,
  outputPath,
  rowsProcessed: updated,
  emptyBuzzwordRows: empty,
  invalidNonExactRows: invalid,
}, null, 2))

import fs from "fs"
import { prisma } from "../lib/prisma"

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
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
    orderBy: [
      { subjects: { name: "asc" } as any },
      { title: "asc" },
    ],
  })

  const rows = [
    [
      "id",
      "subject",
      "topic",
      "subtopic",
      "title",
      "rule_text",
      "current_buzzwords_json",
      "corrected_buzzwords_json"
    ].map(csvEscape).join(",")
  ]

  for (const rule of rules) {
    const currentBuzzwords = Array.isArray(rule.buzzwords) ? rule.buzzwords : []

    rows.push([
      rule.id,
      rule.subjects?.name || "",
      rule.topics?.name || "",
      rule.subtopics?.name || "",
      rule.title,
      rule.rule_text,
      JSON.stringify(currentBuzzwords),
      JSON.stringify(currentBuzzwords)
    ].map(csvEscape).join(","))
  }

  const file = "data/buzzword-audit/rules-buzzwords-export.csv"
  fs.writeFileSync(file, rows.join("\n"))

  console.log(`Exported ${rules.length} rules to ${file}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

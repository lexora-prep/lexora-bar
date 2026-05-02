import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { normalizeSubjectFile } from "@/lib/rules/normalize-subject-file"
import { mapCanonicalRuleToDb } from "@/lib/rules/map-canonical-rule-to-db"

function resolveInputPath() {
  const argPath = process.argv[2]

  if (argPath) {
    return path.resolve(process.cwd(), argPath)
  }

  return path.resolve(process.cwd(), "data", "Business Associations.enriched.json")
}

async function findOrCreateSubject(name: string) {
  const existing = await prisma.subjects.findFirst({
    where: {
      name,
    },
  })

  if (existing) return existing

  return prisma.subjects.create({
    data: {
      name,
    },
  })
}

async function findOrCreateTopic(subjectId: string, name: string) {
  const existing = await prisma.topics.findFirst({
    where: {
      subject_id: subjectId,
      name,
    },
  })

  if (existing) return existing

  return prisma.topics.create({
    data: {
      subject_id: subjectId,
      name,
    },
  })
}

async function findOrCreateSubtopic(topicId: string, name: string) {
  const existing = await prisma.subtopics.findFirst({
    where: {
      topic_id: topicId,
      name,
    },
  })

  if (existing) return existing

  return prisma.subtopics.create({
    data: {
      topic_id: topicId,
      name,
    },
  })
}

async function main() {
  const inputPath = resolveInputPath()

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"))
  const subjectFile = normalizeSubjectFile(raw)

  if (!subjectFile.subject) {
    throw new Error("Subject name is missing from JSON file.")
  }

  console.log(`Importing subject: ${subjectFile.subject}`)
  console.log(`Rules found: ${subjectFile.rules.length}`)
  console.log(`Source file: ${inputPath}`)

  const subject = await findOrCreateSubject(subjectFile.subject)

  let createdCount = 0
  let updatedCount = 0

  for (const rule of subjectFile.rules) {
    const topic = await findOrCreateTopic(subject.id, rule.topic)
    const subtopic = await findOrCreateSubtopic(topic.id, rule.subtopic)

    const mappedRule = mapCanonicalRuleToDb(rule)

    const existingRule = await prisma.rules.findFirst({
      where: {
        title: rule.title,
        topic_id: topic.id,
        subtopic_id: subtopic.id,
      },
      select: {
        id: true,
      },
    })

    if (existingRule) {
      await prisma.rules.update({
        where: {
          id: existingRule.id,
        },
        data: {
          title: mappedRule.title,
          prompt_question: mappedRule.prompt_question,
          rule_text: mappedRule.rule_text,
          buzzwords: mappedRule.buzzwords,
          application_example: mappedRule.application_example,
          how_to_apply: mappedRule.how_to_apply,
          common_traps: mappedRule.common_traps,
          exam_tip: mappedRule.exam_tip,
          common_trap: mappedRule.common_trap,
          priority: mappedRule.priority,
          is_active: mappedRule.is_active,
          topic_id: topic.id,
          subtopic_id: subtopic.id,
          subject_id: subject.id,
          subject_uuid: subject.id,
          updated_at: new Date(),
        },
      })

      updatedCount += 1
    } else {
      await prisma.rules.create({
        data: {
          title: mappedRule.title,
          prompt_question: mappedRule.prompt_question,
          rule_text: mappedRule.rule_text,
          buzzwords: mappedRule.buzzwords,
          application_example: mappedRule.application_example,
          how_to_apply: mappedRule.how_to_apply,
          common_traps: mappedRule.common_traps,
          exam_tip: mappedRule.exam_tip,
          common_trap: mappedRule.common_trap,
          priority: mappedRule.priority,
          is_active: mappedRule.is_active,
          topic_id: topic.id,
          subtopic_id: subtopic.id,
          subject_id: subject.id,
          subject_uuid: subject.id,
        },
      })

      createdCount += 1
    }
  }

  console.log(`Done.`)
  console.log(`Created rules: ${createdCount}`)
  console.log(`Updated rules: ${updatedCount}`)
  console.log(`Imported total: ${subjectFile.rules.length}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
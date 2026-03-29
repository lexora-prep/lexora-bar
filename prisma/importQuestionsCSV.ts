import fs from "fs"
import csv from "csv-parser"
import { prisma } from "../lib/prisma"

async function getTopic(subjectName: string, topicName: string) {

  const subject = await prisma.subject.findUnique({
    where: { name: subjectName }
  })

  if (!subject) {
    console.error(`Subject not found: ${subjectName}`)
    return null
  }

  const topic = await prisma.topic.findFirst({
    where: {
      name: topicName,
      subjectId: subject.id
    }
  })

  if (!topic) {
    console.error(`Topic not found: ${topicName}`)
    return null
  }

  return topic
}

async function questionExists(questionText: string) {

  const existing = await prisma.mBEQuestion.findFirst({
    where: { questionText }
  })

  return !!existing
}

async function main() {

  let created = 0
  let skipped = 0

  const stream = fs
    .createReadStream("questions.csv")
    .pipe(csv())

  for await (const row of stream) {

    try {

      const topic = await getTopic(row.subject, row.topic)

      if (!topic) {
        skipped++
        continue
      }

      const exists = await questionExists(row.question)

      if (exists) {
        console.log(`Duplicate skipped: ${row.question.slice(0,60)}...`)
        skipped++
        continue
      }

      await prisma.mBEQuestion.create({
        data: {
          subjectId: topic.subjectId,
          topicId: topic.id,

          questionText: row.question,

          answerA: row.A,
          answerB: row.B,
          answerC: row.C,
          answerD: row.D,

          correctAnswer: row.correct,
          explanation: row.explanation
        }
      })

      created++

    } catch (err) {

      console.error("Error importing row:", row.question)

      skipped++

    }

  }

  console.log("")
  console.log("Import finished")
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)

  await prisma.$disconnect()

}

main()
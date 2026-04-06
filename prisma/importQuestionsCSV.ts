import fs from "fs"
import csv from "csv-parser"
import { prisma } from "../lib/prisma"

async function getTopic(subjectName: string, topicName: string) {
  const subject = await prisma.subjects.findFirst({
    where: { name: subjectName }
  })

  if (!subject) throw new Error(`Subject not found: ${subjectName}`)

  const topic = await prisma.topics.findFirst({
    where: {
      name: topicName,
      subject_id: subject.id
    }
  })

  if (!topic) throw new Error(`Topic not found: ${topicName}`)

  return topic
}

async function main() {
  const rows: any[] = []

  fs.createReadStream("questions.csv")
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      try {
        for (const row of rows) {
          const topic = await getTopic(row.subject, row.topic)

          await prisma.mBEQuestion.create({
            data: {
              subject_id: topic.subject_id,
              topic_id: topic.id,
              question_text: row.question,
              answer_a: row.A,
              answer_b: row.B,
              answer_c: row.C,
              answer_d: row.D,
              correct_answer: row.correct,
              explanation: row.explanation
            }
          })
        }

        console.log("Questions imported successfully")
      } catch (error) {
        console.error("Import failed:", error)
      } finally {
        await prisma.$disconnect()
      }
    })
}

main()
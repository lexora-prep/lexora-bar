import fs from "fs"
import csv from "csv-parser"
import { prisma } from "../lib/prisma"

async function getTopic(subjectName: string, topicName: string) {

  const subject = await prisma.subject.findUnique({
    where: { name: subjectName }
  })

  if (!subject) throw new Error(`Subject not found: ${subjectName}`)

  const topic = await prisma.topic.findFirst({
    where: {
      name: topicName,
      subjectId: subject.id
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

      for (const row of rows) {

        const topic = await getTopic(row.subject, row.topic)

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

      }

      console.log("Questions imported successfully")

      await prisma.$disconnect()

    })

}

main()
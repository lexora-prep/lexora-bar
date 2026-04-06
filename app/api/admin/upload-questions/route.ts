import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type CsvRow = {
  subject?: string
  topic?: string
  questionText?: string
  answerA?: string
  answerB?: string
  answerC?: string
  answerD?: string
  correctAnswer?: string
  explanation?: string
  title?: string
  ruleText?: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] ?? ""
    })

    return row as CsvRow
  })
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV file is required",
        },
        { status: 400 }
      )
    }

    const text = await file.text()
    const records: CsvRow[] = parseCsv(text)

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV file is empty or invalid",
        },
        { status: 400 }
      )
    }

    const createdQuestions = []

    for (const row of records) {
      const subjectName = row.subject?.trim()
      const topicName = row.topic?.trim()

      if (!subjectName || !topicName) {
        continue
      }

      const subject = await prisma.subjects.findFirst({
        where: { name: subjectName },
      })

      if (!subject) {
        continue
      }

      const topic = await prisma.topics.findFirst({
        where: {
          name: topicName,
          subject_id: subject.id,
        },
      })

      if (!topic) {
        continue
      }

      const newQuestion = await prisma.mBEQuestion.create({
        data: {
          title: row.title?.trim() || null,
          rule_text: row.ruleText?.trim() || null,
          subject_id: subject.id,
          topic_id: topic.id,
          question_text: row.questionText?.trim() ?? "",
          answer_a: row.answerA?.trim() ?? "",
          answer_b: row.answerB?.trim() ?? "",
          answer_c: row.answerC?.trim() ?? "",
          answer_d: row.answerD?.trim() ?? "",
          correct_answer: row.correctAnswer?.trim() ?? "",
          explanation: row.explanation?.trim() || null,
        },
      })

      createdQuestions.push(newQuestion)
    }

    return NextResponse.json({
      success: true,
      count: createdQuestions.length,
      questions: createdQuestions,
    })
  } catch (err) {
    console.error("upload-questions error:", err)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload questions",
      },
      { status: 500 }
    )
  }
}
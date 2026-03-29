import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const body = await req.json()

  const {
    subject,
    topic,
    questionText,
    answerA,
    answerB,
    answerC,
    answerD,
    correctAnswer,
    explanation,
  } = body

  try {
    const subjectRow = await prisma.subjects.findFirst({
      where: { name: subject },
    })

    if (!subjectRow) {
      return NextResponse.json({
        success: false,
        error: "Subject not found",
      })
    }

    const topicRow = await prisma.topics.findFirst({
      where: {
        name: topic,
        subject_id: subjectRow.id,
      },
    })

    if (!topicRow) {
      return NextResponse.json({
        success: false,
        error: "Topic not found",
      })
    }

    const newQuestion = await prisma.mBEQuestion.create({
      data: {
        subjectId: subjectRow.id,
        topicId: topicRow.id,
        questionText,
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
        explanation,
      },
    })

    return NextResponse.json({
      success: true,
      question: newQuestion,
    })
  } catch (err) {
    console.error("add-question error:", err)

    return NextResponse.json({
      success: false,
      error: "Database error",
    })
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
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

    if (
      !subject ||
      !topic ||
      !questionText ||
      !answerA ||
      !answerB ||
      !answerC ||
      !answerD ||
      !correctAnswer ||
      !explanation
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      )
    }

    const subjectRow = await prisma.subjects.findFirst({
      where: { name: subject },
    })

    if (!subjectRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Subject not found",
        },
        { status: 404 }
      )
    }

    const topicRow = await prisma.topics.findFirst({
      where: {
        name: topic,
        subject_id: subjectRow.id,
      },
    })

    if (!topicRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Topic not found",
        },
        { status: 404 }
      )
    }

    const normalizedCorrectAnswer = String(correctAnswer).trim().toUpperCase()

    if (!["A", "B", "C", "D"].includes(normalizedCorrectAnswer)) {
      return NextResponse.json(
        {
          success: false,
          error: "Correct answer must be A, B, C, or D",
        },
        { status: 400 }
      )
    }

    const lastQuestion = await prisma.mBEQuestion.findFirst({
      where: {
        question_number: {
          not: null,
        },
      },
      orderBy: {
        question_number: "desc",
      },
      select: {
        question_number: true,
      },
    })

    const nextQuestionNumber = (lastQuestion?.question_number ?? 999) + 1

    const newQuestion = await prisma.mBEQuestion.create({
      data: {
        question_number: nextQuestionNumber,
        title: null,
        question_text: questionText,
        answer_a: answerA,
        answer_b: answerB,
        answer_c: answerC,
        answer_d: answerD,
        correct_answer: normalizedCorrectAnswer,
        explanation,
        rule_text: null,
        subject_id: subjectRow.id,
        topic_id: topicRow.id,
        subtopic_id: null,
        track: "CLASSIC",
        difficulty: 1,
        source: "admin_manual",
        source_reference: null,
        question_status: "ACTIVE",
        is_active: true,
        version: 1,
        flagged_count: 0,
      },
    })

    return NextResponse.json({
      success: true,
      question: newQuestion,
    })
  } catch (err) {
    console.error("add-question error:", err)

    return NextResponse.json(
      {
        success: false,
        error: "Database error",
      },
      { status: 500 }
    )
  }
}
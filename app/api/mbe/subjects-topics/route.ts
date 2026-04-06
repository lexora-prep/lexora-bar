import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const subjects = await prisma.subjects.findMany({
      include: {
        topics: true
      },
      orderBy: {
        name: "asc"
      }
    })

    const result = []

    for (const subject of subjects) {
      let subjectQuestionCount = 0

      try {
        subjectQuestionCount = await prisma.mBEQuestion.count({
          where: { subject_id: subject.id }
        })
      } catch {
        subjectQuestionCount = 0
      }

      const topics = []

      for (const topic of subject.topics) {
        let total = 0

        try {
          total = await prisma.mBEQuestion.count({
            where: { topic_id: topic.id }
          })
        } catch {
          total = 0
        }

        topics.push({
          id: topic.id,
          name: topic.name,
          questionCount: total,
          solvedCount: 0,
          correctCount: 0,
          remainingQuestions: total,
          accuracy: 0
        })
      }

      result.push({
        id: subject.id,
        name: subject.name,
        questionCount: subjectQuestionCount,
        topics
      })
    }

    return NextResponse.json({
      success: true,
      subjects: result
    })
  } catch (error) {
    console.error("SUBJECT TOPIC API ERROR:", error)

    return NextResponse.json({
      success: false,
      error: "Server error"
    })
  }
}
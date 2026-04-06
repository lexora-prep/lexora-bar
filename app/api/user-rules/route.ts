import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      userId,
      title,
      ruleText,
      applicationExample,
      keywords,

      // required by current Prisma schema
      originalRuleId,
      topicId,
      subtopicId,
      subjectId
    } = body

    if (!userId || !title || !ruleText || !originalRuleId || !topicId || !subtopicId) {
      return NextResponse.json(
        {
          error: "Missing required data",
          required: [
            "userId",
            "title",
            "ruleText",
            "originalRuleId",
            "topicId",
            "subtopicId"
          ]
        },
        { status: 400 }
      )
    }

    const rule = await prisma.user_rules.create({
      data: {
        user_id: userId,
        original_rule_id: originalRuleId,
        topic_id: topicId,
        subtopic_id: subtopicId,
        subject_id: subjectId ?? null,
        title,
        rule_text: ruleText,
        explanation: applicationExample ?? null,
        buzzwords: Array.isArray(keywords) ? keywords : undefined
      }
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    )
  }
}
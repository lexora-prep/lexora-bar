import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const {
    userId,
    title,
    ruleText,
    topicId,
    subtopicId,
    originalRuleId,
    explanation,
    buzzwords,
    clozeTemplate,
    subjectId
  } = body

  if (!userId || !title || !ruleText || !topicId || !subtopicId || !originalRuleId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
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
      explanation: explanation ?? null,
      buzzwords: buzzwords ?? null,
      cloze_template: clozeTemplate ?? null
    }
  })

  return NextResponse.json({
    success: true,
    rule
  })
}
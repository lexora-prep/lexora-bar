import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { userId, subjectId, topicId, limit } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      )
    }

    const take =
      typeof limit === "number" && limit > 0
        ? Math.min(limit, 100)
        : 20

    const rules = await prisma.rules.findMany({
      where: {
        subject_id: subjectId ?? undefined,
        topic_id: topicId ?? undefined,
        is_active: true
      },
      orderBy: {
        created_at: "asc"
      },
      take
    })

    if (!rules.length) {
      return NextResponse.json({
        success: false,
        error: "No rules found"
      })
    }

    const session = await prisma.flashcard_sessions.create({
      data: {
        user_id: userId,
        mode: "study",
        timed: false,
        time_per_card: null,
        card_count: rules.length
      }
    })

    await prisma.flashcard_session_cards.createMany({
      data: rules.map((rule, index) => ({
        session_id: session.id,
        rule_id: rule.id,
        position: index + 1
      }))
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      rules: rules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        ruleText: rule.rule_text,
        explanation: rule.explanation,
        buzzwords: rule.buzzwords,
        clozeTemplate: rule.cloze_template,
        subjectId: rule.subject_id,
        topicId: rule.topic_id,
        subtopicId: rule.subtopic_id
      }))
    })
  } catch (error) {
    console.error("FLASHCARDS START SESSION ERROR:", error)

    return NextResponse.json(
      { success: false, error: "Failed to start flashcard session" },
      { status: 500 }
    )
  }
}
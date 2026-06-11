"use server"

import { NextResponse } from "next/server"
import { requireBLL } from "@/lib/access"
import { prisma } from "@/lib/prisma"

function extractBuzzwords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => {
        if (Array.isArray(item)) {
          return item.map((entry) => String(entry).trim()).filter(Boolean)
        }
        return typeof item === "string" ? [item.trim()] : []
      })
      .filter(Boolean)
  }

  return typeof value === "string" && value.trim() ? [value.trim()] : []
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const access = await requireBLL("Flashcards")
    if (!access.ok) return access.response

    const { sessionId } = await params

    const session = await prisma.flashcard_sessions.findFirst({
      where: {
        id: sessionId,
        user_id: access.userId,
      },
      select: {
        id: true,
        mode: true,
        timed: true,
        time_per_card: true,
        card_count: true,
        started_at: true,
        completed_at: true,
        cards: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            result: true,
            time_spent: true,
            rule_id: true,
            custom_rule_id: true,
            rules: {
              select: {
                id: true,
                title: true,
                prompt_question: true,
                rule_text: true,
                explanation: true,
                buzzwords: true,
                cloze_template: true,
                rule_type: true,
                subjects: { select: { name: true } },
                topics: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Flashcard session not found" },
        { status: 404 }
      )
    }

    const cards = session.cards
      .filter((card) => card.rules)
      .map((card) => {
        const rule = card.rules!
        return {
          sessionCardId: card.id,
          position: card.position,
          id: rule.id,
          ruleId: rule.id,
          customRuleId: card.custom_rule_id,
          title: rule.title,
          promptQuestion: rule.prompt_question,
          ruleText: rule.rule_text,
          explanation: rule.explanation,
          clozeTemplate: rule.cloze_template,
          rule_type: rule.rule_type ?? "definition",
          subject: rule.subjects?.name ?? "",
          topic: rule.topics?.name ?? "",
          keywords: extractBuzzwords(rule.buzzwords),
          result: card.result,
          timeSpent: card.time_spent,
        }
      })

    const answersByCardId = Object.fromEntries(
      cards
        .filter((card) => card.result === "knew" || card.result === "missed")
        .map((card) => [card.id, card.result])
    )

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      mode: session.mode,
      timed: session.timed,
      timePerCard: session.time_per_card,
      cardCount: session.card_count,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      cards,
      rules: cards,
      answersByCardId,
    })
  } catch (error) {
    console.error("FLASHCARD SESSION LOAD ERROR:", error)

    return NextResponse.json(
      { success: false, error: "Failed to load flashcard session" },
      { status: 500 }
    )
  }
}

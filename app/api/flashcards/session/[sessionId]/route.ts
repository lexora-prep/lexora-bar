import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  const sessionCards = await prisma.flashcard_session_cards.findMany({
    where: {
      session_id: sessionId,
      rules: {
        is_active: true,
        rule_type: null,
      },
    },
    orderBy: {
      position: "asc",
    },
    take: 20,
    select: {
      position: true,
      rules: {
        select: {
          id: true,
          title: true,
          rule_text: true,
          explanation: true,
          buzzwords: true,
          cloze_template: true,
          created_at: true,
        },
      },
    },
  })

  const rules = sessionCards
    .map((card) => card.rules)
    .filter((rule) => !!rule)

  return NextResponse.json({
    success: true,
    sessionId,
    rules,
  })
}
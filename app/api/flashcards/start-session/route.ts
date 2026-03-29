import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function extractBuzzwords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => {
        if (Array.isArray(item)) {
          return item.map((v) => String(v).trim()).filter(Boolean)
        }
        if (typeof item === "string") {
          return [item.trim()]
        }
        return []
      })
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return [value.trim()].filter(Boolean)
  }

  return []
}

export async function POST(req: Request) {
  try {
    let body: any = null

    try {
      body = await req.json()
    } catch (err) {
      console.error("Invalid JSON body", err)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 }
      )
    }

    const {
      userId,
      subjects = [],
      topics = [],
      mode = "mixed",
      limit = 30,
      cardCount,
      timePerCard,
      random = true,
      timed = false,
    } = body

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userId",
        },
        { status: 400 }
      )
    }

    let subjectNames: string[] = []
    let topicNames: string[] = []

    if (Array.isArray(subjects) && subjects.length > 0) {
      if (typeof subjects[0] === "string") {
        subjectNames = subjects
      } else {
        const subjectIds = subjects
          .map((s: any) => s.subjectId)
          .filter(Boolean)

        const topicIds = subjects
          .flatMap((s: any) => (Array.isArray(s.topicIds) ? s.topicIds : []))
          .filter(Boolean)

        if (subjectIds.length > 0) {
          const subjectRows = await prisma.subjects.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, name: true },
          })

          subjectNames = subjectRows.map((s) => s.name)
        }

        if (topicIds.length > 0) {
          const topicRows = await prisma.topics.findMany({
            where: { id: { in: topicIds } },
            select: { id: true, name: true },
          })

          topicNames.push(...topicRows.map((t) => t.name))
        }
      }
    }

    if (Array.isArray(topics) && topics.length > 0) {
      topicNames = [...topicNames, ...topics]
    }

    let rules = await prisma.rules.findMany({
      where: {
        ...(subjectNames.length > 0
          ? {
              subjects: {
                name: { in: subjectNames },
              },
            }
          : {}),
        ...(topicNames.length > 0
          ? {
              topics: {
                name: { in: topicNames },
              },
            }
          : {}),
        is_active: true,
      },
      include: {
        subjects: true,
        topics: true,
      },
    })

    if (rules.length === 0) {
      rules = await prisma.rules.findMany({
        where: {
          is_active: true,
        },
        include: {
          subjects: true,
          topics: true,
        },
      })
    }

    let deck = rules.map((r) => ({
      type: "core",
      id: r.id,
      title: r.title,
      ruleText: r.rule_text,
      explanation: r.explanation,
      clozeTemplate: r.cloze_template,
      subject: r.subjects?.name ?? "",
      topic: r.topics?.name ?? "",
      keywords: extractBuzzwords(r.buzzwords),
      due: true,
      difficulty: 0,
      success: 0,
      fail: 0,
    }))

    if (mode === "missed") {
      deck = []
    }

    if (mode === "hard") {
      deck = deck.slice(0, Math.min(deck.length, 50))
    }

    if (mode === "easy") {
      deck = deck.slice(0, Math.min(deck.length, 50))
    }

    if (mode === "mixed") {
      deck = [...deck]
    }

    if (deck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No flashcards available for this selection",
        },
        { status: 404 }
      )
    }

    if (random !== false) {
      deck = [...deck].sort(() => Math.random() - 0.5)
    }

    const finalLimit =
      typeof cardCount === "number" && cardCount > 0
        ? cardCount
        : limit

    deck = deck.slice(0, finalLimit)

    const session = await prisma.flashcard_sessions.create({
      data: {
        user_id: userId,
        mode,
        timed: !!timed,
        time_per_card: typeof timePerCard === "number" ? timePerCard : 20,
        card_count: deck.length,
      },
    })

    await prisma.flashcard_session_cards.createMany({
      data: deck.map((card, index) => ({
        session_id: session.id,
        rule_id: card.id,
        custom_rule_id: null,
        position: index + 1,
      })),
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      timed: !!timed,
      timePerCard: typeof timePerCard === "number" ? timePerCard : 20,
      cards: deck,
      session: {
        id: session.id,
        userId,
        mode,
        timed: !!timed,
        timePerCard: typeof timePerCard === "number" ? timePerCard : 20,
        cardCount: deck.length,
        cards: deck,
      },
    })
  } catch (error) {
    console.error("FLASHCARD START SESSION ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Session start failed",
      },
      { status: 500 }
    )
  }
}
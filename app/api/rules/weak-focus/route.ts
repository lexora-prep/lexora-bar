import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get("userId")
    const limit = Number(searchParams.get("limit") || 20)

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId", rules: [] },
        { status: 400 }
      )
    }

    const now = new Date()

    const progress = await prisma.user_rule_progress.findMany({
      where: {
        user_id: userId,
        OR: [
          {
            mastery_level: {
              lt: 60,
            },
          },
          {
            next_review_at: {
              lte: now,
            },
          },
        ],
      },
      include: {
        rules: true,
      },
      orderBy: [
        {
          mastery_level: "asc",
        },
        {
          next_review_at: "asc",
        },
      ],
      take: limit,
    })

    const rules = progress.map((p) => ({
      ruleId: p.rule_id,
      title: p.rules?.title || "Rule",
      ruleText: p.rules?.rule_text || "",
      mastery: p.mastery_level ?? 0,
      nextReview: p.next_review_at,
    }))

    return NextResponse.json({
      rules,
    })
  } catch (err) {
    console.error("WEAK FOCUS ERROR:", err)

    return NextResponse.json(
      {
        rules: [],
      },
      { status: 500 }
    )
  }
}
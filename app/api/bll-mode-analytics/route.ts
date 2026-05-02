import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type ModeAccuracy = {
  correct: number
  total: number
}

function toPercent(correct: number, total: number) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      )
    }

    const attempts = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
      },
      select: {
        score: true,
        training_mode: true,
      },
    })

    const buckets: Record<string, ModeAccuracy> = {
      typing: { correct: 0, total: 0 },
      fillBlank: { correct: 0, total: 0 },
      buzzwords: { correct: 0, total: 0 },
      ordering: { correct: 0, total: 0 },
      flashcard: { correct: 0, total: 0 },
    }

    for (const attempt of attempts) {
      const rawMode = String(attempt.training_mode ?? "").toLowerCase().trim()
      const score = Number(attempt.score ?? 0)

      let modeKey: keyof typeof buckets | null = null

      if (
        rawMode === "typing" ||
        rawMode === "type" ||
        rawMode === "study" ||
        rawMode === "quiz" ||
        rawMode === "timed" ||
        rawMode === "weak_focus"
      ) {
        modeKey = "typing"
      } else if (
        rawMode === "fillblank" ||
        rawMode === "fill_blank" ||
        rawMode === "fill-blank"
      ) {
        modeKey = "fillBlank"
      } else if (
        rawMode === "buzzwords" ||
        rawMode === "buzzword"
      ) {
        modeKey = "buzzwords"
      } else if (
        rawMode === "ordering" ||
        rawMode === "order"
      ) {
        modeKey = "ordering"
      } else if (
        rawMode === "flashcard" ||
        rawMode === "flashcards"
      ) {
        modeKey = "flashcard"
      }

      if (!modeKey) continue

      buckets[modeKey].total += 1

      if (score >= 70) {
        buckets[modeKey].correct += 1
      }
    }

    return NextResponse.json({
      typing: toPercent(buckets.typing.correct, buckets.typing.total),
      fillBlank: toPercent(buckets.fillBlank.correct, buckets.fillBlank.total),
      buzzwords: toPercent(buckets.buzzwords.correct, buckets.buzzwords.total),
      ordering: toPercent(buckets.ordering.correct, buckets.ordering.total),
      flashcard: toPercent(buckets.flashcard.correct, buckets.flashcard.total),
    })
  } catch (error) {
    console.error("BLL MODE ANALYTICS ERROR:", error)

    return NextResponse.json(
      {
        typing: 0,
        fillBlank: 0,
        buzzwords: 0,
        ordering: 0,
        flashcard: 0,
      },
      { status: 500 }
    )
  }
}
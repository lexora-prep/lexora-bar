import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)

  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" })
  }

  const stats = await prisma.userRuleStat.findMany({
    where: { userId },
    select: {
      typingAccuracy: true,
      fillBlankAccuracy: true,
      orderingAccuracy: true,
      buzzwordAccuracy: true,
      flashcardAccuracy: true
    }
  })

  function average(values: number[]) {
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  const typing = average(stats.map(s => s.typingAccuracy))
  const fillBlank = average(stats.map(s => s.fillBlankAccuracy))
  const ordering = average(stats.map(s => s.orderingAccuracy))
  const buzzwords = average(stats.map(s => s.buzzwordAccuracy))
  const flashcard = average(stats.map(s => s.flashcardAccuracy))

  return NextResponse.json({
    typing,
    fillBlank,
    ordering,
    buzzwords,
    flashcard
  })
}
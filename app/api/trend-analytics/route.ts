import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const searchParams = url.searchParams

    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "missing userId" })
    }

    const range = searchParams.get("range") ?? "30d"

    const now = new Date()
    let startDate = new Date()

    if (range === "today") {
      startDate.setHours(0, 0, 0, 0)
    } else if (range === "7d") {
      startDate.setDate(now.getDate() - 7)
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 30)
    } else if (range === "90d") {
      startDate.setDate(now.getDate() - 90)
    } else {
      startDate = new Date(0)
    }

    const mbeAttempts = await prisma.user_mbe_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate
        }
      },
      select: {
        created_at: true,
        is_correct: true
      }
    })

    const ruleAttempts = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate
        }
      },
      select: {
        created_at: true,
        score: true
      }
    })

    const days: Record<string, { mbe: number[]; bll: number[] }> = {}

    for (const a of mbeAttempts) {
      if (!a.created_at) continue

      const d = a.created_at.toISOString().slice(0, 10)

      if (!days[d]) days[d] = { mbe: [], bll: [] }

      days[d].mbe.push(a.is_correct ? 1 : 0)
    }

    for (const a of ruleAttempts) {
      if (!a.created_at) continue

      const d = a.created_at.toISOString().slice(0, 10)

      if (!days[d]) days[d] = { mbe: [], bll: [] }

      days[d].bll.push(a.score)
    }

    const trend = Object.entries(days).map(([date, data]) => {
      const mbe =
        data.mbe.length === 0
          ? 0
          : Math.round(
              (data.mbe.reduce((a, b) => a + b, 0) / data.mbe.length) * 100
            )

      const bll =
        data.bll.length === 0
          ? 0
          : Math.round(
              data.bll.reduce((a, b) => a + b, 0) / data.bll.length
            )

      return { date, mbe, bll }
    })

    trend.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ trend })
  } catch (error) {
    console.error("Trend analytics error:", error)

    return NextResponse.json({ trend: [] })
  }
}
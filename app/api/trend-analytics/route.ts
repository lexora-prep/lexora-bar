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
    }

    else if (range === "7d") {
      startDate.setDate(now.getDate() - 7)
    }

    else if (range === "30d") {
      startDate.setDate(now.getDate() - 30)
    }

    else if (range === "90d") {
      startDate.setDate(now.getDate() - 90)
    }

    else {
      startDate = new Date(0)
    }

    const mbeAttempts = await prisma.userMBEAttempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        isCorrect: true
      }
    })

    const ruleAttempts = await prisma.ruleAttempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        scorePercent: true
      }
    })

    const days: Record<string, { mbe: number[]; bll: number[] }> = {}

    for (const a of mbeAttempts) {

      const d = a.createdAt.toISOString().slice(0, 10)

      if (!days[d]) days[d] = { mbe: [], bll: [] }

      days[d].mbe.push(a.isCorrect ? 1 : 0)

    }

    for (const a of ruleAttempts) {

      const d = a.createdAt.toISOString().slice(0, 10)

      if (!days[d]) days[d] = { mbe: [], bll: [] }

      days[d].bll.push(a.scorePercent)

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
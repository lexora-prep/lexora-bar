import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get("mode") || "random"
  const userId = searchParams.get("userId")

  let rule = null

  if (mode === "weak" && userId) {
    const weakProgress = await prisma.user_rule_progress.findFirst({
      where: {
        user_id: userId,
        attempts: { gt: 3 },
        correct_count: { lt: 2 }
      },
      include: {
        rules: {
          include: {
            topics: true,
            subjects: true
          }
        }
      }
    })

    rule = weakProgress?.rules ?? null
  } else if (mode === "review" && userId) {
    const reviewProgress = await prisma.user_rule_progress.findFirst({
      where: {
        user_id: userId,
        next_review_at: {
          lte: new Date()
        }
      },
      include: {
        rules: {
          include: {
            topics: true,
            subjects: true
          }
        }
      }
    })

    rule = reviewProgress?.rules ?? null
  } else {
    const count = await prisma.rules.count()

    if (count > 0) {
      const skip = Math.floor(Math.random() * count)

      rule = await prisma.rules.findFirst({
        skip,
        include: {
          topics: true,
          subjects: true
        }
      })
    }
  }

  return NextResponse.json(rule)
}
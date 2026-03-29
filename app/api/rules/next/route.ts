import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)

  const mode = searchParams.get("mode") || "random"
  const userId = searchParams.get("userId")

  let rule

  if (mode === "weak" && userId) {

    rule = await prisma.rule.findFirst({
      where: {
        userStats: {
          some: {
            userId,
            attemptsTotal: { gt: 3 },
            attemptsCorrect: { lt: 2 }
          }
        }
      },
      include: {
        keywords: true,
        topic: true,
        subject: true
      }
    })

  }

  else if (mode === "review" && userId) {

    rule = await prisma.rule.findFirst({
      where: {
        userStats: {
          some: {
            userId,
            nextReviewAt: {
              lte: new Date()
            }
          }
        }
      },
      include: {
        keywords: true,
        topic: true,
        subject: true
      }
    })

  }

  else {

    const count = await prisma.rule.count()

    const skip = Math.floor(Math.random() * count)

    rule = await prisma.rule.findFirst({
      skip,
      include: {
        keywords: true,
        topic: true,
        subject: true
      }
    })

  }

  return NextResponse.json(rule)

}
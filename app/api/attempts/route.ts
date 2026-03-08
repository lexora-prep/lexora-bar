import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const body = await req.json()

  const {
    userId,
    ruleId,
    mode,
    correct,
    scorePercent,
    timeSpentSec
  } = body

  // 1️⃣ save attempt
  await prisma.ruleAttempt.create({
    data: {
      userId,
      ruleId,
      mode,
      scorePercent,
      timeSpentSec
    }
  })

  // 2️⃣ get existing stats
  const stat = await prisma.userRuleStat.findFirst({
    where: {
      userId,
      ruleId
    }
  })

  // 3️⃣ update or create stats
  if (stat) {

    const attemptsTotal = stat.attemptsTotal + 1
    const attemptsCorrect = stat.attemptsCorrect + (correct ? 1 : 0)

    await prisma.userRuleStat.update({
      where: { id: stat.id },
      data: {
        attemptsTotal,
        attemptsCorrect,
        lastSeenAt: new Date()
      }
    })

  } else {

    await prisma.userRuleStat.create({
      data: {
        userId,
        ruleId,
        attemptsTotal: 1,
        attemptsCorrect: correct ? 1 : 0,
        lastSeenAt: new Date()
      }
    })

  }

  return NextResponse.json({ success: true })

}
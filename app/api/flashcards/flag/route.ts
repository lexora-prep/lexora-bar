import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const body = await req.json()

  const { userId, ruleId } = body

  if (!userId || !ruleId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  const existing = await prisma.weakArea.findFirst({
    where: {
      userId,
      ruleId
    }
  })

  if (existing) {
    return NextResponse.json({
      success: true,
      message: "Already flagged"
    })
  }

  const flagged = await prisma.weakArea.create({
    data: {
      userId,
      ruleId,
      accuracy: 0,
      attempts: 0
    }
  })

  return NextResponse.json({
    success: true,
    flagged
  })

}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const { userId, ruleId } = body

  await prisma.weakArea.create({
    data: {
      userId,
      ruleId,
      accuracy: 0,
      attempts: 1
    }
  })

  return NextResponse.json({
    success: true
  })
}
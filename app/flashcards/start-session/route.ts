import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const { userId, subjectId, topicId, limit } = body

  const rules = await prisma.rule.findMany({
    where: {
      subjectId: subjectId ?? undefined,
      topicId: topicId ?? undefined
    },
    take: limit ?? 20,
    include: {
      keywords: true
    }
  })

  return NextResponse.json({
    success: true,
    rules
  })
}
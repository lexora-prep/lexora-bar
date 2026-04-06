import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  const rules = await prisma.rules.findMany({
    take: 20,
    select: {
      id: true,
      title: true,
      rule_text: true,
      explanation: true,
      buzzwords: true,
      cloze_template: true,
      created_at: true,
    },
  })

  return NextResponse.json({
    success: true,
    sessionId,
    rules,
  })
}
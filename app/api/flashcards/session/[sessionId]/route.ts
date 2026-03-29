import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {

  const { sessionId } = await params

  const rules = await prisma.rule.findMany({
    take: 20,
    select: {
      id: true,
      title: true,
      ruleText: true
    }
  })

  return NextResponse.json({
    sessionId,
    rules
  })
}
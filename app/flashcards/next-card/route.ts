import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()
  const { userId } = body

  const rule = await prisma.rule.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    include: {
      keywords: true
    }
  })

  if (!rule) {
    return NextResponse.json({
      success: false
    })
  }

  return NextResponse.json({
    success: true,
    rule
  })
}
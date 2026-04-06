import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()
  const { userId } = body

  const rule = await prisma.rules.findFirst({
    orderBy: {
      created_at: "asc"
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
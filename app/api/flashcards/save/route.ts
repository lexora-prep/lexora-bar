import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const body = await req.json()

  const {
    userId,
    title,
    ruleText,
    subject,
    topic,
    applicationExample,
    keywords = []
  } = body

  if (!userId || !title || !ruleText) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  const rule = await prisma.userCustomRule.create({
    data: {
      userId,
      title,
      ruleText,
      subject,
      topic,
      applicationExample,
      keywords: {
        create: keywords.map((k: string, i: number) => ({
          keyword: k,
          position: i
        }))
      }
    },
    include: {
      keywords: true
    }
  })

  return NextResponse.json({
    success: true,
    rule
  })

}
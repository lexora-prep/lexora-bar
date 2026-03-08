import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)

  const currentRuleId = Number(searchParams.get("currentRuleId") || 0)

  const rule = await prisma.rule.findFirst({
    where: {
      id: {
        gt: currentRuleId
      }
    },
    orderBy: {
      id: "asc"
    },
    include: {
      keywords: true,
      topic: true,
      subject: true
    }
  })

  if (!rule) {

    const firstRule = await prisma.rule.findFirst({
      orderBy: {
        id: "asc"
      },
      include: {
        keywords: true,
        topic: true,
        subject: true
      }
    })

    return NextResponse.json(firstRule)
  }

  return NextResponse.json(rule)

}
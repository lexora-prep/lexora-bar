import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {

  const body = await req.json()

  const { userId, ruleId } = body

  await prisma.userRuleProgress.upsert({

    where: {
      userId_ruleId: {
        userId,
        ruleId
      }
    },

    update: {},

    create: {
      userId,
      ruleId
    }

  })

  return NextResponse.json({
    success: true
  })
}
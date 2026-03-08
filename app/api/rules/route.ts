import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {

  const rules = await prisma.rule.findMany({
    include: {
      keywords: true,
      topic: true,
      subject: true
    }
  })

  return NextResponse.json(rules)

}
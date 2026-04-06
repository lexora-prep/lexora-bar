import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const rules = await prisma.rules.findMany({
      select: {
        id: true,
        title: true,
        rule_text: true,
        subjects: {
          select: {
            name: true
          }
        }
      },
      take: 120
    })

    return NextResponse.json(rules)
  } catch (err) {
    console.error("Most tested rules error:", err)

    return NextResponse.json([])
  }
}
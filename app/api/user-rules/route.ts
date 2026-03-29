import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const body = await req.json()

    const {
      userId,
      title,
      ruleText,
      applicationExample,
      subject,
      topic,
      keywords
    } = body

    const rule = await prisma.userCustomRule.create({

      data: {

        title,
        ruleText,
        applicationExample,
        subject,
        topic,

        userId,

        keywords: {
          create: keywords.map((k: string, i: number) => ({
            keyword: k,
            position: i
          }))
        }

      }

    })

    return NextResponse.json(rule)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    )

  }

}
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const id = body.id
    const email = body.email
    const fullName = body.fullName ?? null
    const lawSchool = body.lawSchool ?? null
    const jurisdiction = body.jurisdiction ?? null
    const examMonth = body.examMonth ?? null
    const examYear = body.examYear ?? null

    if (!id || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "Invalid user id format" },
        { status: 400 }
      )
    }

    const existingById = await prisma.profiles.findUnique({
      where: { id },
    })

    if (existingById) {
      const updated = await prisma.profiles.update({
        where: { id },
        data: {
          email,
          full_name: fullName,
          law_school: lawSchool,
          jurisdiction,
          exam_month: examMonth,
          exam_year: examYear,
        },
      })

      return NextResponse.json(updated)
    }

    const existingByEmail = await prisma.profiles.findUnique({
      where: { email },
    })

    if (existingByEmail) {
      const updated = await prisma.profiles.update({
        where: { email },
        data: {
          id,
          full_name: fullName,
          law_school: lawSchool,
          jurisdiction,
          exam_month: examMonth,
          exam_year: examYear,
        },
      })

      return NextResponse.json(updated)
    }

    const created = await prisma.profiles.create({
      data: {
        id,
        email,
        full_name: fullName,
        law_school: lawSchool,
        jurisdiction,
        exam_month: examMonth,
        exam_year: examYear,
        mbe_access: false,
        subscription_tier: "free",
      },
    })

    return NextResponse.json(created)
  } catch (err: any) {
    console.error("CREATE PROFILE ERROR:", err)

    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const id = typeof body.id === "string" ? body.id.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : null
    const lawSchool =
      typeof body.lawSchool === "string" ? body.lawSchool.trim() : null
    const jurisdiction =
      typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : null
    const examMonth =
      body.examMonth === null || body.examMonth === undefined
        ? null
        : Number(body.examMonth)
    const examYear =
      body.examYear === null || body.examYear === undefined
        ? null
        : Number(body.examYear)

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      )
    }

    if (!jurisdiction) {
      return NextResponse.json(
        { error: "Jurisdiction is required." },
        { status: 400 }
      )
    }

    if (
      examMonth !== null &&
      (Number.isNaN(examMonth) || examMonth < 1 || examMonth > 12)
    ) {
      return NextResponse.json(
        { error: "Exam month must be between 1 and 12." },
        { status: 400 }
      )
    }

    if (
      examYear !== null &&
      (Number.isNaN(examYear) || examYear < 2024 || examYear > 2100)
    ) {
      return NextResponse.json(
        { error: "Exam year is not valid." },
        { status: 400 }
      )
    }

    const profile = await prisma.profiles.upsert({
      where: { id },
      update: {
        email,
        full_name: fullName,
        law_school: lawSchool || null,
        jurisdiction,
        exam_month: examMonth,
        exam_year: examYear,
        updated_at: new Date(),
      },
      create: {
        id,
        email,
        full_name: fullName,
        law_school: lawSchool || null,
        jurisdiction,
        exam_month: examMonth,
        exam_year: examYear,
        mbe_access: false,
        subscription_tier: "free",
        role: "user",
        is_admin: false,
        is_blocked: false,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      profile,
    })
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
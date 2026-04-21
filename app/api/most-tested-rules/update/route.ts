import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const fullName = body.fullName ?? null
    const lawSchool = body.lawSchool ?? null
    const jurisdiction = body.jurisdiction ?? null
    const examMonth = body.examMonth ?? null
    const examYear = body.examYear ?? null

    const existing = await prisma.profiles.findUnique({
      where: { id: user.id },
    })

    if (!existing) {
      if (!user.email) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }

      const created = await prisma.profiles.create({
        data: {
          id: user.id,
          email: user.email,
          full_name: fullName,
          law_school: lawSchool,
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

      return NextResponse.json(created)
    }

    const updated = await prisma.profiles.update({
      where: { id: user.id },
      data: {
        full_name: fullName,
        law_school: lawSchool,
        jurisdiction,
        exam_month: examMonth,
        exam_year: examYear,
        updated_at: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error("PROFILE UPDATE ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
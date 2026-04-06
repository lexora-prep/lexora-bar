import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const requestedUserId = searchParams.get("userId")

    const targetUserId = requestedUserId || user.id

    if (!isUuid(targetUserId)) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 })
    }

    if (targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let profile = await prisma.profiles.findUnique({
      where: { id: targetUserId },
    })

    if (!profile) {
      profile = await prisma.profiles.findUnique({
        where: { email: user.email || "" },
      })

      if (profile && profile.id !== user.id) {
        profile = await prisma.profiles.update({
          where: { email: user.email || "" },
          data: {
            id: user.id,
            updated_at: new Date(),
          },
        })
      }
    }

    if (!profile) {
      if (!user.email) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }

      profile = await prisma.profiles.create({
        data: {
          id: user.id,
          email: user.email,
          full_name: null,
          law_school: null,
          jurisdiction: null,
          exam_month: null,
          exam_year: null,
          mbe_access: false,
          subscription_tier: "free",
          role: "user",
          is_admin: false,
          is_blocked: false,
          updated_at: new Date(),
        },
      })
    }

    return NextResponse.json(profile)
  } catch (err: any) {
    console.error("PROFILE GET ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
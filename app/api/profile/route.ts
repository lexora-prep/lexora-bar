import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < min || num > max) return null
  return Math.round(num)
}

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, error: null }
}

async function getOrCreateProfile(user: { id: string; email?: string | null }) {
  let profile = await prisma.profiles.findUnique({
    where: { id: user.id },
  })

  if (profile) return profile

  profile = await prisma.profiles.create({
    data: {
      id: user.id,
      email: user.email ?? "",
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

  return profile
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const requestedUserId = searchParams.get("userId")

    if (requestedUserId) {
      if (!isUuid(requestedUserId)) {
        return NextResponse.json(
          { error: "Invalid userId format" },
          { status: 400 }
        )
      }

      if (requestedUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const profile = await getOrCreateProfile(user)
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

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const body = (await req.json()) as Record<string, unknown>

    const targetUserId =
      typeof body.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : user.id

    if (!isUuid(targetUserId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      )
    }

    if (targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await getOrCreateProfile(user)

    const updateData: {
      updated_at: Date
      full_name?: string | null
      law_school?: string | null
      jurisdiction?: string | null
      exam_month?: number | null
      exam_year?: number | null
    } = {
      updated_at: new Date(),
    }

    if ("fullName" in body) {
      updateData.full_name = normalizeNullableString(body.fullName)
    }

    if ("lawSchool" in body) {
      updateData.law_school = normalizeNullableString(body.lawSchool)
    }

    if ("jurisdiction" in body) {
      updateData.jurisdiction = normalizeNullableString(body.jurisdiction)
    }

    if ("examMonth" in body) {
      updateData.exam_month = normalizeNullableNumber(body.examMonth, 1, 12)
    }

    if ("examYear" in body) {
      updateData.exam_year = normalizeNullableNumber(body.examYear, 2024, 2100)
    }

    const updated = await prisma.profiles.update({
      where: { id: user.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error("PROFILE PATCH ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
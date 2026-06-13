import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  if (Number.isFinite(num) === false) return null
  if (num < min || num > max) return null
  return Math.round(num)
}

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || user === null) {
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
      billing_status: "free",
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
    if (auth.error || auth.user === null) return auth.error

    const { user } = auth
    const profile = await getOrCreateProfile(user)

    const studyPlan = await prisma.studyPlan.findFirst({
      where: { userId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: {
        jurisdictionName: true,
        jurisdictionCode: true,
        examRegime: true,
      },
    })

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      law_school: profile.law_school,
      jurisdiction: studyPlan?.jurisdictionName || profile.jurisdiction,
      jurisdiction_code: studyPlan?.jurisdictionCode || null,
      exam_regime: studyPlan?.examRegime || null,
      exam_month: profile.exam_month,
      exam_year: profile.exam_year,

      subscription_tier: profile.subscription_tier || "free",

      paddle_customer_id: profile.paddle_customer_id,
      paddle_subscription_id: profile.paddle_subscription_id,
      paddle_transaction_id: profile.paddle_transaction_id,
      paddle_price_id: profile.paddle_price_id,

      billing_status: profile.billing_status || "free",
      billing_currency: profile.billing_currency,
      billing_amount_cents: profile.billing_amount_cents,
      billing_tax_cents: profile.billing_tax_cents,
      billing_total_cents: profile.billing_total_cents,
      billing_interval: profile.billing_interval,
      billing_started_at: profile.billing_started_at,
      billing_period_starts_at: profile.billing_period_starts_at,
      billing_period_ends_at: profile.billing_period_ends_at,
      billing_cancelled_at: profile.billing_cancelled_at,
      billing_last_paid_at: profile.billing_last_paid_at,
      billing_discount_id: profile.billing_discount_id,
      billing_discount_code: profile.billing_discount_code,
      billing_discount_amount: profile.billing_discount_amount,
      billing_invoice_url: profile.billing_invoice_url,

      created_at: profile.created_at,
      updated_at: profile.updated_at,
    })
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
    if (auth.error || auth.user === null) return auth.error

    const { user } = auth
    const body = (await req.json()) as Record<string, unknown>

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

    // Jurisdiction is controlled by the Study Plan / Study Calendar only.
    // Do not update it from Profile, because changing it here would desync the study schedule.

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

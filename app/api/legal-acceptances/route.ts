import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TERMS_VERSION = "2026-05-04"
const PRIVACY_VERSION = "2026-05-04"
const REFUND_VERSION = "2026-05-04"

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role environment variables are missing.")
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    const userId = String(body?.userId || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const selectedPlan = String(body?.selectedPlan || "free").trim()
    const registrationMode = String(body?.registrationMode || "").trim()

    const termsAccepted = Boolean(body?.termsAccepted)
    const privacyAccepted = Boolean(body?.privacyAccepted)
    const refundAccepted = Boolean(body?.refundAccepted)
    const platformRulesAccepted = Boolean(body?.platformRulesAccepted)

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required." },
        { status: 400 }
      )
    }

    if (
      !termsAccepted ||
      !privacyAccepted ||
      !refundAccepted ||
      !platformRulesAccepted
    ) {
      return NextResponse.json(
        { error: "All legal acknowledgments must be accepted." },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    const { error } = await supabase.from("user_legal_acceptances").insert({
      user_id: userId,
      email,
      terms_accepted: true,
      privacy_accepted: true,
      refund_accepted: true,
      platform_rules_accepted: true,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      refund_version: REFUND_VERSION,
      selected_plan: selectedPlan,
      registration_mode: registrationMode || null,
      user_agent: req.headers.get("user-agent"),
      ip_address: getClientIp(req),
      accepted_at: new Date().toISOString(),
    })

    if (error) {
      console.error("LEGAL ACCEPTANCE INSERT ERROR:", error)

      return NextResponse.json(
        { error: "Failed to record legal acceptance." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("LEGAL ACCEPTANCE API ERROR:", error)

    return NextResponse.json(
      { error: "Something went wrong while recording legal acceptance." },
      { status: 500 }
    )
  }
}

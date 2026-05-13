import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TERMS_VERSION = "2026-05-04"
const PRIVACY_VERSION = "2026-05-04"
const REFUND_VERSION = "2026-05-04"

type IpLocation = {
  ip_country: string | null
  ip_region: string | null
  ip_city: string | null
  ip_timezone: string | null
  ip_latitude: number | null
  ip_longitude: number | null
  ip_lookup_provider: string | null
  ip_lookup_at: string | null
}

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

function cleanHeaderValue(value: string | null) {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

function parseCoordinate(value: string | null) {
  if (!value) return null

  const parsed = Number(value)

  if (Number.isNaN(parsed)) {
    return null
  }

  return parsed
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    null
  )
}

function getIpLocationFromHeaders(req: Request): IpLocation {
  const country = cleanHeaderValue(req.headers.get("x-vercel-ip-country"))
  const region = cleanHeaderValue(req.headers.get("x-vercel-ip-country-region"))
  const city = cleanHeaderValue(req.headers.get("x-vercel-ip-city"))
  const latitude = parseCoordinate(req.headers.get("x-vercel-ip-latitude"))
  const longitude = parseCoordinate(req.headers.get("x-vercel-ip-longitude"))

  const hasLocation =
    Boolean(country) ||
    Boolean(region) ||
    Boolean(city) ||
    latitude !== null ||
    longitude !== null

  return {
    ip_country: country,
    ip_region: region,
    ip_city: city,
    ip_timezone: null,
    ip_latitude: latitude,
    ip_longitude: longitude,
    ip_lookup_provider: hasLocation ? "vercel_headers" : null,
    ip_lookup_at: hasLocation ? new Date().toISOString() : null,
  }
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
    const ipLocation = getIpLocationFromHeaders(req)

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
      ip_country: ipLocation.ip_country,
      ip_region: ipLocation.ip_region,
      ip_city: ipLocation.ip_city,
      ip_timezone: ipLocation.ip_timezone,
      ip_latitude: ipLocation.ip_latitude,
      ip_longitude: ipLocation.ip_longitude,
      ip_lookup_provider: ipLocation.ip_lookup_provider,
      ip_lookup_at: ipLocation.ip_lookup_at,
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
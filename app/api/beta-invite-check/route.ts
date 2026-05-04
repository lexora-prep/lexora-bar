import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type RegistrationMode = "private_beta" | "public" | "closed"

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

function normalizeRegistrationMode(value: unknown): RegistrationMode {
  if (value === "public") return "public"
  if (value === "closed") return "closed"
  if (value === "private_beta") return "private_beta"

  if (typeof value === "string") {
    const cleaned = value.replace(/^"+|"+$/g, "")

    if (cleaned === "public") return "public"
    if (cleaned === "closed") return "closed"
    if (cleaned === "private_beta") return "private_beta"

    try {
      const parsed = JSON.parse(value)
      return normalizeRegistrationMode(parsed)
    } catch {
      return "private_beta"
    }
  }

  return "private_beta"
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email || "").trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        {
          allowed: false,
          mode: "private_beta",
          reason: "Email is required.",
        },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    const { data: modeFlag, error: modeError } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", "registration_mode")
      .maybeSingle()

    if (modeError) {
      console.error("REGISTRATION MODE ERROR:", modeError)
      return NextResponse.json(
        {
          allowed: false,
          mode: "private_beta",
          reason: "Could not check registration mode.",
        },
        { status: 500 }
      )
    }

    const mode = normalizeRegistrationMode(modeFlag?.value)

    if (mode === "public") {
      return NextResponse.json({
        allowed: true,
        mode,
        reason: "Public registration is open.",
      })
    }

    if (mode === "closed") {
      return NextResponse.json({
        allowed: false,
        mode,
        reason: "Registration is currently closed.",
      })
    }

    const { data: invite, error: inviteError } = await supabase
      .from("beta_invites")
      .select("id, email, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle()

    if (inviteError) {
      console.error("BETA INVITE CHECK ERROR:", inviteError)
      return NextResponse.json(
        {
          allowed: false,
          mode,
          reason: "Could not check invite approval.",
        },
        { status: 500 }
      )
    }

    if (!invite) {
      return NextResponse.json({
        allowed: false,
        mode,
        reason:
          "Lexora Prep is currently in private beta. Your email is not approved yet.",
      })
    }

    return NextResponse.json({
      allowed: true,
      mode,
      reason: "Email is approved for private beta registration.",
    })
  } catch (error) {
    console.error("REGISTRATION ACCESS CHECK ERROR:", error)

    return NextResponse.json(
      {
        allowed: false,
        mode: "private_beta",
        reason: "Something went wrong while checking registration access.",
      },
      { status: 500 }
    )
  }
}

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
  return "private_beta"
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", "registration_mode")
      .maybeSingle()

    if (error) {
      console.error("GET REGISTRATION MODE ERROR:", error)
      return NextResponse.json(
        { error: "Failed to load registration mode." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      mode: normalizeRegistrationMode(data?.value),
    })
  } catch (error) {
    console.error("GET REGISTRATION MODE API ERROR:", error)
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const mode = normalizeRegistrationMode(body?.mode)

    const supabase = getAdminClient()

    const { error } = await supabase.from("feature_flags").upsert(
      {
        key: "registration_mode",
        value: mode,
        description:
          "Controls account registration. Allowed values: private_beta, public, closed.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

    if (error) {
      console.error("UPDATE REGISTRATION MODE ERROR:", error)
      return NextResponse.json(
        { error: "Failed to update registration mode." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, mode })
  } catch (error) {
    console.error("UPDATE REGISTRATION MODE API ERROR:", error)
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}

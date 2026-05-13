import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export async function GET() {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("user_legal_acceptances")
      .select(
        [
          "id",
          "user_id",
          "email",
          "selected_plan",
          "registration_mode",
          "terms_version",
          "privacy_version",
          "refund_version",
          "terms_accepted",
          "privacy_accepted",
          "refund_accepted",
          "platform_rules_accepted",
          "user_agent",
          "ip_address",
          "ip_country",
          "ip_region",
          "ip_city",
          "ip_timezone",
          "ip_latitude",
          "ip_longitude",
          "ip_lookup_provider",
          "ip_lookup_at",
          "accepted_at",
        ].join(", ")
      )
      .order("accepted_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("LEGAL ACCEPTANCES LIST ERROR:", error)

      return NextResponse.json(
        { error: "Failed to load legal acceptance records." },
        { status: 500 }
      )
    }

    return NextResponse.json({ records: data || [] })
  } catch (error) {
    console.error("LEGAL ACCEPTANCES API ERROR:", error)

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/reset-password"

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/forgot-password?error=missing_token`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired_or_invalid`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function requireAuthenticatedUser(request?: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 }
      ),
    }
  }

  if (request) {
    const requestedUserId = new URL(request.url).searchParams.get("userId")

    if (requestedUserId && requestedUserId !== user.id) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "You cannot request analytics for another user." },
          { status: 403 }
        ),
      }
    }
  }

  return {
    ok: true as const,
    user,
    userId: user.id,
  }
}

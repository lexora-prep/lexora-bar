import { NextResponse } from "next/server"
import Ably from "ably"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

async function getCurrentAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      admin: null,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      email: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin" && profile.role !== "super_admin")
  ) {
    return {
      admin: null,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      ),
    }
  }

  return {
    admin: profile,
    response: null,
  }
}

export async function GET() {
  try {
    const auth = await getCurrentAdmin()
    if (auth.response || !auth.admin) return auth.response

    const apiKey = process.env.ABLY_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "ABLY_API_KEY is not configured." },
        { status: 500 },
      )
    }

    const client = new Ably.Rest(apiKey)

    const tokenRequest = await client.auth.createTokenRequest({
      clientId: auth.admin.id,
      capability: {
        [`admin:user:${auth.admin.id}`]: ["subscribe"],
        "admin:workspace:typing": ["publish", "subscribe"],
      },
      ttl: 1000 * 60 * 60,
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error("ADMIN ABLY TOKEN ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Failed to create Ably token." },
      { status: 500 },
    )
  }
}

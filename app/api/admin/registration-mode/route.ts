import { prisma } from "@/lib/prisma"
import { logUserActivity } from "@/lib/user-activity"
import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/utils/supabase/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type RegistrationMode = "private_beta" | "public" | "closed"

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role environment variables are missing.")
  }

  return createSupabaseAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function requireSettingsAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_settings: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  if (!profile.can_manage_settings && profile.admin_role !== "super_admin") {
    return {
      error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    adminRole: profile.admin_role,
  }
}

function getRequestIp(req: Request) {
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

function getUserAgent(req: Request) {
  return req.headers.get("user-agent") || null
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

function modeLabel(mode: RegistrationMode) {
  if (mode === "private_beta") return "Private beta"
  if (mode === "public") return "Public"
  if (mode === "closed") return "Closed"
  return mode
}

async function readCurrentRegistrationMode() {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "registration_mode")
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    mode: normalizeRegistrationMode(data?.value),
    rawValue: data?.value ?? null,
  }
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
        {
          error: "Failed to load registration mode.",
          detail: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      mode: normalizeRegistrationMode(data?.value),
      rawValue: data?.value ?? null,
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
    const admin = await requireSettingsAdmin()
    if ("error" in admin) return admin.error

    const body = await req.json().catch(() => null)
    const mode = normalizeRegistrationMode(body?.mode)
    const before = await readCurrentRegistrationMode()

    const supabase = getAdminClient()
    const now = new Date().toISOString()

    const { error } = await supabase.from("feature_flags").upsert(
      {
        key: "registration_mode",
        value: mode,
        description:
          "Controls account registration. Allowed values: private_beta, public, closed.",
        created_at: now,
        updated_at: now,
      },
      { onConflict: "key" }
    )

    if (error) {
      console.error("UPDATE REGISTRATION MODE ERROR:", error)
      return NextResponse.json(
        {
          error: "Failed to update registration mode.",
          detail: error.message,
        },
        { status: 500 }
      )
    }

    await logUserActivity({
      userId: admin.userId,
      actorUserId: admin.userId,
      action: "admin.registration_mode_updated",
      entityType: "feature_flag",
      entityId: "registration_mode",
      title: "Updated registration mode",
      body: `Registration mode changed from ${modeLabel(before.mode)} to ${modeLabel(mode)}.`,
      metadata: {
        actor: {
          id: admin.userId,
          email: admin.email,
          full_name: admin.fullName,
          admin_role: admin.adminRole,
        },
        feature_flag: {
          key: "registration_mode",
          before: before.mode,
          after: mode,
          raw_before: before.rawValue,
        },
      },
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({ ok: true, mode })
  } catch (error) {
    console.error("UPDATE REGISTRATION MODE API ERROR:", error)
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}
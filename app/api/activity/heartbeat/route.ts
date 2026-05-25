import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type IpLocation = {
  last_country: string | null
  last_region: string | null
  last_city: string | null
  last_timezone: string | null
  last_latitude: number | null
  last_longitude: number | null
}

type ExistingProfileActivity = {
  last_active_at: string | null
}

type SessionDurationUpdateResult = {
  updated: boolean
  addedSeconds: number
  reason: "no_active_delta" | "no_recent_session" | "updated"
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
  return {
    last_country: cleanHeaderValue(req.headers.get("x-vercel-ip-country")),
    last_region: cleanHeaderValue(
      req.headers.get("x-vercel-ip-country-region")
    ),
    last_city: cleanHeaderValue(req.headers.get("x-vercel-ip-city")),
    last_timezone: null,
    last_latitude: parseCoordinate(req.headers.get("x-vercel-ip-latitude")),
    last_longitude: parseCoordinate(req.headers.get("x-vercel-ip-longitude")),
  }
}

function getAuthClient(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment variables are missing.")
  }

  const authHeader = req.headers.get("authorization") || ""

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
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

function getHeartbeatSeconds(previousLastActiveAt: string | null, now: Date) {
  if (!previousLastActiveAt) return 0

  const previous = new Date(previousLastActiveAt)

  if (Number.isNaN(previous.getTime())) return 0

  const diffSeconds = Math.floor((now.getTime() - previous.getTime()) / 1000)

  if (diffSeconds < 10) return 0

  if (diffSeconds > 180) return 0

  return diffSeconds
}

async function getExistingProfileActivity(
  adminClient: any,
  userId: string
): Promise<ExistingProfileActivity> {
  const { data, error } = await adminClient
    .from("profiles")
    .select("last_active_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("HEARTBEAT PROFILE READ ERROR:", error)

    return {
      last_active_at: null,
    }
  }

  const profileActivity = data as ExistingProfileActivity | null

  return {
    last_active_at:
      typeof profileActivity?.last_active_at === "string"
        ? profileActivity.last_active_at
        : null,
  }
}

async function updateLatestStudySessionDuration({
  userId,
  heartbeatSeconds,
  now,
}: {
  userId: string
  heartbeatSeconds: number
  now: Date
}): Promise<SessionDurationUpdateResult> {
  if (heartbeatSeconds <= 0) {
    return {
      updated: false,
      addedSeconds: 0,
      reason: "no_active_delta",
    }
  }

  const sessionWindowStart = new Date(now)
  sessionWindowStart.setHours(sessionWindowStart.getHours() - 12)

  const latestSession = await prisma.studySession.findFirst({
    where: {
      userId,
      startedAt: {
        gte: sessionWindowStart,
      },
    },
    select: {
      id: true,
      durationSeconds: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  })

  if (!latestSession) {
    return {
      updated: false,
      addedSeconds: 0,
      reason: "no_recent_session",
    }
  }

  await prisma.studySession.update({
    where: {
      id: latestSession.id,
    },
    data: {
      durationSeconds:
        Number(latestSession.durationSeconds ?? 0) + heartbeatSeconds,
    },
  })

  return {
    updated: true,
    addedSeconds: heartbeatSeconds,
    reason: "updated",
  }
}

export async function POST(req: Request) {
  try {
    const authClient = getAuthClient(req)

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const activitySource = String(body?.source || "app").trim() || "app"

    const nowDate = new Date()
    const now = nowDate.toISOString()
    const location = getIpLocationFromHeaders(req)
    const adminClient = getAdminClient()

    const existingProfileActivity = await getExistingProfileActivity(
      adminClient,
      user.id
    )

    const heartbeatSeconds = getHeartbeatSeconds(
      existingProfileActivity.last_active_at,
      nowDate
    )

    const sessionDurationResult = await updateLatestStudySessionDuration({
      userId: user.id,
      heartbeatSeconds,
      now: nowDate,
    })

    const updatePayload: Record<string, string | number | null> = {
      last_active_at: now,
      last_ip_address: getClientIp(req),
      last_country: location.last_country,
      last_region: location.last_region,
      last_city: location.last_city,
      last_timezone: location.last_timezone,
      last_latitude: location.last_latitude,
      last_longitude: location.last_longitude,
      last_user_agent: req.headers.get("user-agent"),
      last_activity_source: activitySource,
      updated_at: now,
    }

    if (activitySource === "login") {
      updatePayload.last_login_at = now
    }

    const { error } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)

    if (error) {
      console.error("HEARTBEAT UPDATE ERROR:", error)

      return NextResponse.json(
        { error: "Failed to update activity status." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      source: activitySource,
      studySession: sessionDurationResult,
    })
  } catch (error) {
    console.error("HEARTBEAT API ERROR:", error)

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    )
  }
}
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type FeatureFlagRow = {
  key: string
  value: unknown
}

type FlagMap = Record<string, boolean>

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes"
    )
  }

  if (typeof value === "number") {
    return value === 1
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "enabled" in value
  ) {
    const enabled = (value as { enabled?: unknown }).enabled
    return toBoolean(enabled)
  }

  return false
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
      select "key", "value"
      from public.feature_flags
    `

    const flags: FlagMap = {}

    for (const row of rows) {
      flags[row.key] = toBoolean(row.value)
    }

    return NextResponse.json(
      {
        mbe_premium_enabled: flags.mbe_premium_enabled ?? false,
        mbe_public_visible: flags.mbe_public_visible ?? false,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("FEATURE FLAGS PUBLIC ERROR:", error)

    return NextResponse.json(
      {
        mbe_premium_enabled: false,
        mbe_public_visible: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  }
}
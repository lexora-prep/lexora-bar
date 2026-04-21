import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type FeatureFlagRow = {
  key: string
  value: unknown
}

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "enabled" in value
  ) {
    const enabled = (value as { enabled?: unknown }).enabled

    if (typeof enabled === "boolean") return enabled

    if (typeof enabled === "string") {
      const normalized = enabled.trim().toLowerCase()
      if (normalized === "true") return true
      if (normalized === "false") return false
    }
  }

  return fallback
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
      select "key", "value"
      from public.feature_flags
      where "key" in ('mbe_premium_enabled', 'mbe_public_visible')
    `

    const byKey = new Map(rows.map((row) => [row.key, row.value]))

    const mbePremiumEnabled = readBoolean(
      byKey.get("mbe_premium_enabled"),
      false
    )

    const mbePublicVisible = readBoolean(
      byKey.get("mbe_public_visible"),
      false
    )

    return NextResponse.json({
      mbePremiumEnabled,
      mbePublicVisible,
    })
  } catch (error) {
    console.error("PUBLIC FEATURE FLAGS ERROR:", error)

    return NextResponse.json(
      {
        mbePremiumEnabled: false,
        mbePublicVisible: false,
      },
      { status: 200 }
    )
  }
}
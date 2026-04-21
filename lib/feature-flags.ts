import { prisma } from "@/lib/prisma"

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

export async function getPublicFeatureFlags() {
  const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
    select "key", "value"
    from public.feature_flags
    where "key" in ('mbe_premium_enabled', 'mbe_public_visible')
  `

  const byKey = new Map(rows.map((row) => [row.key, row.value]))

  return {
    mbePremiumEnabled: readBoolean(byKey.get("mbe_premium_enabled"), false),
    mbePublicVisible: readBoolean(byKey.get("mbe_public_visible"), false),
  }
}
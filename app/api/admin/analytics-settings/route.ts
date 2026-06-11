import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import {
  ANALYTICS_SETTING_PRESETS,
  getAnalyticsPreset,
  getStrengthsWeaknessesAnalyticsSettingsRecord,
  normalizeStrengthsWeaknessesAnalyticsSettings,
  saveStrengthsWeaknessesAnalyticsSettings,
  STRENGTHS_WEAKNESSES_SETTINGS_KEY,
  validateStrengthsWeaknessesAnalyticsSettings,
} from "@/lib/analytics-settings"

async function requireSettingsManager() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      ),
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

  const canManage =
    profile?.admin_role === "super_admin" ||
    Boolean(profile?.can_manage_settings)

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canManage
  ) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      ),
    }
  }

  return {
    user,
    profile,
    isSuperAdmin: profile.admin_role === "super_admin",
  }
}

async function responsePayload() {
  const record = await getStrengthsWeaknessesAnalyticsSettingsRecord()

  const updater = record.updatedBy
    ? await prisma.profiles.findUnique({
        where: { id: record.updatedBy },
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      })
    : null

  return {
    ok: true,
    settings: record.settings,
    presets: ANALYTICS_SETTING_PRESETS,
    activePreset: record.presetName,
    isDefault: record.isDefault,
    updatedAt: record.updatedAt?.toISOString() ?? null,
    updatedBy: updater
      ? {
          id: updater.id,
          email: updater.email,
          name: updater.full_name,
        }
      : null,
  }
}

export async function GET() {
  try {
    const auth = await requireSettingsManager()
    if ("error" in auth) return auth.error

    return NextResponse.json(await responsePayload())
  } catch (error) {
    console.error("ADMIN ANALYTICS SETTINGS GET ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Analytics settings could not be loaded." },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSettingsManager()
    if ("error" in auth) return auth.error

    const body = await request.json().catch(() => null)
    const mode = body?.mode

    let settings
    let presetName: "conservative" | "balanced" | "early_intervention" | "custom"
    let reason = ""

    if (mode === "preset") {
      const preset = getAnalyticsPreset(body?.presetName)

      if (!preset) {
        return NextResponse.json(
          { ok: false, error: "Invalid analytics preset." },
          { status: 400 }
        )
      }

      settings = preset.settings
      presetName = preset.name
      reason = `Applied approved preset: ${preset.title}`
    } else if (mode === "advanced") {
      if (!auth.isSuperAdmin) {
        return NextResponse.json(
          { ok: false, error: "Advanced configuration requires Super Admin access." },
          { status: 403 }
        )
      }

      reason = typeof body?.reason === "string" ? body.reason.trim() : ""

      if (reason.length < 10) {
        return NextResponse.json(
          { ok: false, error: "A clear reason of at least 10 characters is required." },
          { status: 400 }
        )
      }

      settings = normalizeStrengthsWeaknessesAnalyticsSettings(body?.settings)
      presetName = "custom"
    } else {
      return NextResponse.json(
        { ok: false, error: "Choose an approved preset or Advanced Configuration." },
        { status: 400 }
      )
    }

    const errors = validateStrengthsWeaknessesAnalyticsSettings(settings)

    if (errors.length > 0) {
      return NextResponse.json(
        { ok: false, error: errors.join(" "), errors },
        { status: 400 }
      )
    }

    const previous = await getStrengthsWeaknessesAnalyticsSettingsRecord()

    await saveStrengthsWeaknessesAnalyticsSettings({
      settings,
      updatedBy: auth.user.id,
      presetName,
      reason,
    })

    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null

    await prisma.user_activity_logs.create({
      data: {
        user_id: auth.user.id,
        actor_user_id: auth.user.id,
        action:
          mode === "preset"
            ? "admin.analytics_settings.preset_applied"
            : "admin.analytics_settings.advanced_updated",
        entity_type: "analytics_settings",
        entity_id: STRENGTHS_WEAKNESSES_SETTINGS_KEY,
        title: "Strengths & Weaknesses analytics settings updated",
        body:
          mode === "preset"
            ? `An administrator applied the ${presetName} analytics preset.`
            : "A Super Admin saved a custom analytics configuration.",
        metadata: {
          mode,
          presetName,
          reason,
          previousPreset: previous.presetName,
          previous: previous.settings,
          next: settings,
          adminEmail: auth.profile.email,
          adminName: auth.profile.full_name,
        },
        ip_address: ipAddress,
        user_agent: request.headers.get("user-agent"),
      },
    })

    return NextResponse.json(await responsePayload())
  } catch (error) {
    console.error("ADMIN ANALYTICS SETTINGS PUT ERROR:", error)

    return NextResponse.json(
      { ok: false, error: "Analytics settings could not be saved." },
      { status: 500 }
    )
  }
}

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        email_announcements: true,
        study_reminders: true,
        sound_effects: true,
        compact_mode: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        {
          email_announcements: true,
          study_reminders: true,
          sound_effects: false,
          compact_mode: false,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(profile)
  } catch (err: any) {
    console.error("SETTINGS PREFERENCES GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load preferences" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const emailAnnouncements = !!body.emailAnnouncements
    const studyReminders = !!body.studyReminders
    const soundEffects = !!body.soundEffects
    const compactMode = !!body.compactMode

    const existing = await prisma.profiles.findUnique({
      where: { id: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const updated = await prisma.profiles.update({
      where: { id: user.id },
      data: {
        email_announcements: emailAnnouncements,
        study_reminders: studyReminders,
        sound_effects: soundEffects,
        compact_mode: compactMode,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      preferences: {
        email_announcements: updated.email_announcements,
        study_reminders: updated.study_reminders,
        sound_effects: updated.sound_effects,
        compact_mode: updated.compact_mode,
      },
    })
  } catch (err: any) {
    console.error("SETTINGS PREFERENCES POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to save preferences" },
      { status: 500 }
    )
  }
}
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      is_blocked: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId: user.id }
}

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const announcements = await prisma.announcements.findMany({
      orderBy: [{ created_at: "desc" }],
    })

    return NextResponse.json({ announcements })
  } catch (err: any) {
    console.error("ADMIN ANNOUNCEMENTS GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load admin announcements" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const body = await req.json()

    const title = String(body?.title || "").trim()
    const bodyText = String(body?.body || "").trim()
    const isActive = body?.is_active !== false
    const startsAt = body?.starts_at ? new Date(body.starts_at) : null
    const endsAt = body?.ends_at ? new Date(body.ends_at) : null

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!bodyText) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 })
    }

    const created = await prisma.announcements.create({
      data: {
        title,
        body: bodyText,
        is_active: isActive,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: admin.userId,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true, announcement: created })
  } catch (err: any) {
    console.error("ADMIN ANNOUNCEMENTS POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to create announcement" },
      { status: 500 }
    )
  }
}
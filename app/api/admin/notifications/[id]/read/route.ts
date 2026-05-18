import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

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
      is_admin: true,
      role: true,
      is_blocked: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
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

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getCurrentAdmin()
    if (auth.response || !auth.admin) return auth.response

    const params = await context.params
    const notificationId = String(params.id || "").trim()

    if (!notificationId) {
      return NextResponse.json(
        { ok: false, error: "Notification ID is required." },
        { status: 400 },
      )
    }

    await prisma.$executeRaw`
      update public.admin_notifications
      set read_at = coalesce(read_at, now())
      where id = ${notificationId}::uuid
        and admin_id = ${auth.admin.id}::uuid
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN NOTIFICATION READ ERROR:", err)

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to mark notification as read.",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return POST(req, context)
}
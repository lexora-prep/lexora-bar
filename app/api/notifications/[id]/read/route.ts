import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return {
    user,
    error: null,
  }
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { id } = await context.params
    const cleanId = String(id ?? "").trim()

    if (!cleanId) {
      return NextResponse.json(
        {
          error: "Missing notification id",
        },
        { status: 400 }
      )
    }

    const updated = await prisma.user_notifications.updateMany({
      where: {
        id: cleanId,
        user_id: auth.user.id,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      updated: updated.count,
    })
  } catch (error) {
    console.error("POST /api/notifications/[id]/read failed:", error)

    return NextResponse.json(
      {
        error: "Failed to mark notification as read",
      },
      { status: 500 }
    )
  }
}
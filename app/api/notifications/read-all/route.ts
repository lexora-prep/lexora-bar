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

export async function POST() {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    await prisma.user_notifications.updateMany({
      where: {
        user_id: auth.user.id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error("POST /api/notifications/read-all failed:", error)

    return NextResponse.json(
      {
        error: "Failed to mark notifications as read",
      },
      { status: 500 }
    )
  }
}
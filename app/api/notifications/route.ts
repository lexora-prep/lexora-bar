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

export async function GET() {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const userId = auth.user.id

    const [notifications, unreadCount] = await Promise.all([
      prisma.user_notifications.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 30,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          severity: true,
          metadata: true,
          is_read: true,
          read_at: true,
          created_at: true,
        },
      }),

      prisma.user_notifications.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("GET /api/notifications failed:", error)

    return NextResponse.json(
      {
        error: "Failed to load notifications",
      },
      { status: 500 }
    )
  }
}
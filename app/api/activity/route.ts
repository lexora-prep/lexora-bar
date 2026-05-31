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

    const activity = await prisma.user_activity_logs.findMany({
      where: {
        user_id: auth.user.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 50,
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        title: true,
        body: true,
        metadata: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      activity,
    })
  } catch (error) {
    console.error("GET /api/activity failed:", error)

    return NextResponse.json(
      {
        error: "Failed to load activity",
      },
      { status: 500 }
    )
  }
}
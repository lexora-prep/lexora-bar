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
    select: { is_admin: true, role: true, is_blocked: true },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params

    const note = await prisma.admin_notes.findUnique({
      where: { id },
      select: { checked_by: true },
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 })
    }

    const userIds = Array.isArray(note.checked_by) ? note.checked_by : []

    const users =
      userIds.length > 0
        ? await prisma.profiles.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              full_name: true,
              email: true,
              admin_role: true,
            },
          })
        : []

    const usersMap = new Map(
      users.map((u) => [
        u.id,
        {
          user_id: u.id,
          author_name: u.full_name || u.email || "Admin",
          author_role: u.admin_role || "admin",
        },
      ])
    )

    return NextResponse.json({
      ok: true,
      users: userIds.map((id) => usersMap.get(id)).filter(Boolean),
    })
  } catch (err: any) {
    console.error("ADMIN NOTE CHECKED USERS ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load checked users." },
      { status: 500 }
    )
  }
}
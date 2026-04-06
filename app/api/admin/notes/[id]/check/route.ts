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
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
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
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { userId: user.id }
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params

    const note = await prisma.admin_notes.findUnique({
      where: { id },
      select: {
        id: true,
        checked_by: true,
      },
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 })
    }

    const checkedBy = Array.isArray(note.checked_by) ? [...note.checked_by] : []
    const alreadyChecked = checkedBy.includes(auth.userId)

    const nextCheckedBy = alreadyChecked
      ? checkedBy.filter((userId) => userId !== auth.userId)
      : [...checkedBy, auth.userId]

    await prisma.admin_notes.update({
      where: { id },
      data: {
        checked_by: nextCheckedBy,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      checked: !alreadyChecked,
      checked_count: nextCheckedBy.length,
    })
  } catch (err: any) {
    console.error("ADMIN NOTE CHECK ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to update checked state." },
      { status: 500 }
    )
  }
}
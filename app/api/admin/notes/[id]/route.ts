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
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const emoji = String(body?.emoji || "👍").trim()

    const note = await prisma.admin_notes.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 })
    }

    const existing = await prisma.admin_note_reactions.findFirst({
      where: {
        note_id: id,
        user_id: auth.userId,
        emoji,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.admin_note_reactions.delete({
        where: { id: existing.id },
      })

      return NextResponse.json({
        ok: true,
        action: "removed",
      })
    }

    await prisma.admin_note_reactions.create({
      data: {
        note_id: id,
        user_id: auth.userId,
        emoji,
      },
    })

    return NextResponse.json({
      ok: true,
      action: "added",
    })
  } catch (err: any) {
    console.error("ADMIN NOTE REACT ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to react to note." },
      { status: 500 }
    )
  }
}
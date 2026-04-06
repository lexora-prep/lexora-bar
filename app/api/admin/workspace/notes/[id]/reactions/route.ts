import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { findAccessibleNoteById, getWorkspaceActor } from "../../../_lib"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const note = await findAccessibleNoteById(id, auth.actor.id, auth.actor.isSuperAdmin)

    if (!note) {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

    if (!emoji) {
      return NextResponse.json({ ok: false, error: "Emoji is required." }, { status: 400 })
    }

    const existing = await prisma.workspace_note_reactions.findUnique({
      where: {
        note_id_user_id_emoji: {
          note_id: id,
          user_id: auth.actor.id,
          emoji,
        },
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.workspace_note_reactions.delete({
        where: {
          note_id_user_id_emoji: {
            note_id: id,
            user_id: auth.actor.id,
            emoji,
          },
        },
      })
    } else {
      await prisma.workspace_note_reactions.create({
        data: {
          note_id: id,
          user_id: auth.actor.id,
          emoji,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST NOTE REACTION ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to update note reaction." }, { status: 500 })
  }
}
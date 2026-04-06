import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceActor } from "../../../workspace/_lib"

async function getAccessibleNote(noteId: string, actorId: string, isSuperAdmin: boolean) {
  const note = await prisma.workspace_notes.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      owner_id: true,
      visibility: true,
      recipient_ids: true,
      status: true,
    },
  })

  if (!note) return null
  if (note.status !== "active" && !isSuperAdmin) return null

  const canAccess =
    isSuperAdmin ||
    note.owner_id === actorId ||
    note.visibility === "shared" ||
    note.recipient_ids.includes(actorId)

  if (!canAccess) return null
  return note
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const note = await getAccessibleNote(id, auth.actor.id, auth.actor.isSuperAdmin)
    if (!note) {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const rows = await prisma.workspace_note_reactions.findMany({
      where: { note_id: id },
      orderBy: { created_at: "asc" },
    })

    const userIds = Array.from(new Set(rows.map((row) => row.user_id)))
    const users = userIds.length
      ? await prisma.profiles.findMany({
          where: {
            id: { in: userIds },
          },
          select: {
            id: true,
            full_name: true,
            email: true,
            admin_role: true,
            role: true,
          },
        })
      : []

    const userMap = new Map(
      users.map((user) => [
        user.id,
        {
          name: user.full_name?.trim() || user.email.split("@")[0],
          role: user.admin_role || user.role || "admin",
        },
      ])
    )

    const grouped = new Map<
      string,
      {
        emoji: string
        count: number
        users: { user_id: string; author_name: string; author_role: string }[]
      }
    >()

    for (const reaction of rows) {
      const profile = userMap.get(reaction.user_id)
      const entry = grouped.get(reaction.emoji) || {
        emoji: reaction.emoji,
        count: 0,
        users: [],
      }

      entry.count += 1
      entry.users.push({
        user_id: reaction.user_id,
        author_name: profile?.name || "Unknown",
        author_role: profile?.role || "admin",
      })

      grouped.set(reaction.emoji, entry)
    }

    return NextResponse.json({
      ok: true,
      reactions: Array.from(grouped.values()),
      my_emojis: rows.filter((row) => row.user_id === auth.actor.id).map((row) => row.emoji),
    })
  } catch (error) {
    console.error("GET NOTE REACTIONS ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to load note reactions." },
      { status: 500 }
    )
  }
}

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
    const note = await getAccessibleNote(id, auth.actor.id, auth.actor.isSuperAdmin)
    if (!note) {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

    if (!emoji) {
      return NextResponse.json({ ok: false, error: "Emoji is required." }, { status: 400 })
    }

    const existing = await prisma.workspace_note_reactions.findFirst({
      where: {
        note_id: id,
        user_id: auth.actor.id,
        emoji,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.workspace_note_reactions.delete({
        where: { id: existing.id },
      })

      return NextResponse.json({ ok: true, active: false })
    }

    await prisma.workspace_note_reactions.create({
      data: {
        note_id: id,
        user_id: auth.actor.id,
        emoji,
      },
    })

    return NextResponse.json({ ok: true, active: true })
  } catch (error) {
    console.error("POST NOTE REACTION ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to update note reaction." },
      { status: 500 }
    )
  }
}
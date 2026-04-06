import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceActor } from "../../../_lib"

async function getAccessibleNote(noteId: string, actorId: string, isSuperAdmin: boolean) {
  const note = await prisma.workspace_notes.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      owner_id: true,
      visibility: true,
      recipient_ids: true,
      team_id: true,
      status: true,
      title: true,
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

    const rows = await prisma.workspace_note_comments.findMany({
      where: {
        note_id: id,
      },
      orderBy: {
        created_at: "asc",
      },
    })

    const authorIds = Array.from(new Set(rows.map((row) => row.author_id)))
    const authors = authorIds.length
      ? await prisma.profiles.findMany({
          where: {
            id: { in: authorIds },
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

    const authorMap = new Map(
      authors.map((author) => [
        author.id,
        {
          name: author.full_name?.trim() || author.email.split("@")[0],
          role: author.admin_role || author.role || "admin",
        },
      ])
    )

    const comments = rows.map((row) => {
      const author = authorMap.get(row.author_id)

      return {
        id: row.id,
        note_id: row.note_id,
        author_id: row.author_id,
        author_name: author?.name || "Unknown",
        author_role: author?.role || "admin",
        body: row.is_deleted ? "This comment was deleted." : row.body,
        is_deleted: row.is_deleted,
        created_at: row.created_at,
        updated_at: row.updated_at,
        edited_at: row.edited_at,
      }
    })

    return NextResponse.json({ ok: true, comments })
  } catch (error) {
    console.error("GET NOTE COMMENTS ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to load note comments." },
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
    const content = typeof body?.body === "string" ? body.body.trim() : ""

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Comment body is required." },
        { status: 400 }
      )
    }

    const comment = await prisma.workspace_note_comments.create({
      data: {
        note_id: id,
        author_id: auth.actor.id,
        body: content,
      },
      select: {
        id: true,
        note_id: true,
        author_id: true,
        body: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        edited_at: true,
      },
    })

    const authorName =
      auth.actor.full_name?.trim() || auth.actor.email.split("@")[0]

    return NextResponse.json({
      ok: true,
      comment: {
        ...comment,
        author_name: authorName,
        author_role: auth.actor.admin_role || auth.actor.role || "admin",
      },
    })
  } catch (error) {
    console.error("POST NOTE COMMENT ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to create note comment." },
      { status: 500 }
    )
  }
}
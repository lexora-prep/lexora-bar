import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditWithin, findAccessibleNoteById, getWorkspaceActor, getWorkspaceSettings } from "../../_lib"

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
    const note = await findAccessibleNoteById(id, auth.actor.id, auth.actor.isSuperAdmin)

    if (!note) {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const reactions = await prisma.workspace_note_reactions.findMany({
      where: {
        note_id: id,
      },
      select: {
        emoji: true,
        user_id: true,
      },
    })

    const grouped = new Map<string, { emoji: string; count: number; user_ids: string[] }>()

    for (const reaction of reactions) {
      const entry = grouped.get(reaction.emoji) || {
        emoji: reaction.emoji,
        count: 0,
        user_ids: [],
      }
      entry.count += 1
      entry.user_ids.push(reaction.user_id)
      grouped.set(reaction.emoji, entry)
    }

    return NextResponse.json({
      ok: true,
      note: {
        ...note,
        description: note.body.slice(0, 80),
        reactions: Array.from(grouped.values()),
        my_emojis: reactions
          .filter((reaction) => reaction.user_id === auth.actor.id)
          .map((reaction) => reaction.emoji),
      },
    })
  } catch (error) {
    console.error("GET WORKSPACE NOTE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to load note." }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const note = await prisma.workspace_notes.findUnique({
      where: { id },
      select: {
        id: true,
        owner_id: true,
        created_at: true,
        status: true,
        note_type: true,
      },
    })

    if (!note || note.status !== "active") {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const canEdit = auth.actor.isSuperAdmin || note.owner_id === auth.actor.id
    if (!canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const settings = await getWorkspaceSettings()
    const body = await req.json().catch(() => null)

    const title = typeof body?.title === "string" ? body.title.trim() : undefined
    const noteBody = typeof body?.body === "string" ? body.body.trim() : undefined
    const visibility =
      body?.visibility === "shared" || body?.visibility === "private"
        ? body.visibility
        : undefined
    const sharedScope =
      body?.sharedScope === "workspace" || body?.sharedScope === "specific_users"
        ? body.sharedScope
        : undefined

    const recipientIds: string[] | undefined = Array.isArray(body?.recipientIds)
      ? Array.from(
          new Set(
            body.recipientIds.filter(
              (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
            )
          )
        )
      : undefined

    const nextVisibility = visibility ?? undefined
    const nextSharedScope = sharedScope ?? undefined

    if (title !== undefined && !title) {
      return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 })
    }

    if (noteBody !== undefined && !noteBody) {
      return NextResponse.json({ ok: false, error: "Body is required." }, { status: 400 })
    }

    if (
      note.note_type === "shared" &&
      !auth.actor.isSuperAdmin &&
      !auth.actor.can_create_shared_notes &&
      !auth.actor.can_manage_workspace_notes
    ) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to update shared notes." },
        { status: 403 }
      )
    }

    if (
      note.note_type === "shared" &&
      !settings.allow_shared_note_creation &&
      !auth.actor.isSuperAdmin
    ) {
      return NextResponse.json(
        { ok: false, error: "Shared note creation is disabled in workspace settings." },
        { status: 403 }
      )
    }

    if (note.note_type === "personal" && recipientIds && recipientIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Personal notes cannot have recipients." },
        { status: 400 }
      )
    }

    if (
      note.note_type === "shared" &&
      nextSharedScope === "specific_users" &&
      recipientIds !== undefined &&
      recipientIds.length === 0
    ) {
      return NextResponse.json(
        { ok: false, error: "Pick at least one user for a user-specific shared note." },
        { status: 400 }
      )
    }

    const updateData: {
      title?: string
      body?: string
      visibility?: string
      shared_scope?: string
      recipient_ids?: string[]
      updated_at: Date
    } = {
      updated_at: new Date(),
    }

    if (title !== undefined) {
      updateData.title = title
    }

    if (noteBody !== undefined) {
      updateData.body = noteBody
    }

    if (nextVisibility !== undefined) {
      updateData.visibility = nextVisibility
    }

    if (nextSharedScope !== undefined) {
      updateData.shared_scope = nextSharedScope
    }

    if (recipientIds !== undefined) {
      updateData.recipient_ids =
        note.note_type === "shared" && (nextSharedScope ?? "workspace") === "specific_users"
          ? recipientIds
          : []
    }

    await prisma.workspace_notes.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PATCH WORKSPACE NOTE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to update note." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const note = await prisma.workspace_notes.findUnique({
      where: { id },
      select: {
        id: true,
        owner_id: true,
        created_at: true,
        status: true,
      },
    })

    if (!note || note.status !== "active") {
      return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404 })
    }

    const canWithdraw =
      auth.actor.isSuperAdmin ||
      (note.owner_id === auth.actor.id && canEditWithin(note.created_at, 60))

    if (!canWithdraw) {
      return NextResponse.json(
        { ok: false, error: "You can withdraw your note only within 1 hour." },
        { status: 403 }
      )
    }

    await prisma.workspace_notes.update({
      where: { id },
      data: {
        status: "archived",
        withdrawn_at: new Date(),
        archived_at: new Date(),
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE WORKSPACE NOTE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to withdraw note." }, { status: 500 })
  }
}
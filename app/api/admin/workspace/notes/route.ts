import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureWorkspaceSeedData, getWorkspaceActor, getWorkspaceSettings } from "../_lib"

export async function POST(req: Request) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const actor = auth.actor

  try {
    const { team } = await ensureWorkspaceSeedData()
    const settings = await getWorkspaceSettings()
    const body = await req.json().catch(() => null)

    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const noteBody = typeof body?.body === "string" ? body.body.trim() : ""
    const noteType = body?.noteType === "shared" ? "shared" : "personal"

    const visibility =
      body?.visibility === "shared" || body?.visibility === "private"
        ? body.visibility
        : noteType === "shared"
          ? "shared"
          : "private"

    const sharedScope =
      body?.sharedScope === "workspace" || body?.sharedScope === "specific_users"
        ? body.sharedScope
        : visibility === "shared"
          ? "workspace"
          : "private"

    const recipientIds: string[] = Array.isArray(body?.recipientIds)
      ? Array.from(
          new Set(
            body.recipientIds.filter(
              (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
            )
          )
        )
      : []

    const forwardedFromNoteId =
      typeof body?.forwardedFromNoteId === "string" ? body.forwardedFromNoteId : null
    const forwardedOriginalAuthorName =
      typeof body?.forwardedOriginalAuthorName === "string"
        ? body.forwardedOriginalAuthorName.trim()
        : null

    if (!title || !noteBody) {
      return NextResponse.json({ ok: false, error: "Title and body are required." }, { status: 400 })
    }

    if (!settings.allow_note_creation && !actor.isSuperAdmin) {
      return NextResponse.json(
        { ok: false, error: "Note creation is disabled in workspace settings." },
        { status: 403 }
      )
    }

    if (noteType === "shared" && !settings.allow_shared_note_creation && !actor.isSuperAdmin) {
      return NextResponse.json(
        { ok: false, error: "Shared note creation is disabled in workspace settings." },
        { status: 403 }
      )
    }

    if (
      noteType === "shared" &&
      !actor.isSuperAdmin &&
      !actor.can_create_shared_notes &&
      !actor.can_manage_workspace_notes
    ) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to create shared notes." },
        { status: 403 }
      )
    }

    if (noteType === "personal" && recipientIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Personal notes cannot have recipients." },
        { status: 400 }
      )
    }

    if (noteType === "shared" && sharedScope === "specific_users" && recipientIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Pick at least one user for a user-specific shared note." },
        { status: 400 }
      )
    }

    const note = await prisma.workspace_notes.create({
      data: {
        owner_id: actor.id,
        team_id: noteType === "shared" ? team.id : null,
        title,
        body: noteBody,
        note_type: noteType,
        visibility,
        shared_scope: sharedScope,
        recipient_ids: noteType === "shared" && sharedScope === "specific_users" ? recipientIds : [],
        status: "active",
        forwarded_from_note_id: forwardedFromNoteId,
        forwarded_original_author_name: forwardedOriginalAuthorName,
      },
      select: {
        id: true,
        owner_id: true,
        team_id: true,
        title: true,
        body: true,
        note_type: true,
        visibility: true,
        shared_scope: true,
        recipient_ids: true,
        status: true,
        forwarded_from_note_id: true,
        forwarded_original_author_name: true,
        created_at: true,
        updated_at: true,
      },
    })

    return NextResponse.json({
      ok: true,
      note: {
        ...note,
        description: note.body.slice(0, 80),
        comment_count: 0,
        my_emojis: [],
      },
    })
  } catch (error) {
    console.error("CREATE WORKSPACE NOTE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to create note." }, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditWithin, getWorkspaceActor } from "../../../../_lib"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { commentId } = await params

  try {
    const body = await req.json().catch(() => null)
    const content = typeof body?.body === "string" ? body.body.trim() : ""

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Comment body is required." },
        { status: 400 }
      )
    }

    const comment = await prisma.workspace_note_comments.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        author_id: true,
        body: true,
        is_deleted: true,
        created_at: true,
      },
    })

    if (!comment) {
      return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 })
    }

    if (comment.is_deleted) {
      return NextResponse.json(
        { ok: false, error: "Deleted comments cannot be edited." },
        { status: 400 }
      )
    }

    const canEdit =
      auth.actor.isSuperAdmin ||
      (comment.author_id === auth.actor.id && canEditWithin(comment.created_at, 60))

    if (!canEdit) {
      return NextResponse.json(
        { ok: false, error: "You can edit only your own comment within 60 minutes." },
        { status: 403 }
      )
    }

    await prisma.workspace_note_comments.update({
      where: { id: commentId },
      data: {
        body: content,
        edited_at: new Date(),
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PATCH NOTE COMMENT ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to update note comment." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { commentId } = await params

  try {
    const comment = await prisma.workspace_note_comments.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        author_id: true,
        is_deleted: true,
      },
    })

    if (!comment) {
      return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 })
    }

    if (comment.is_deleted) {
      return NextResponse.json({ ok: true })
    }

    const canDelete = auth.actor.isSuperAdmin || comment.author_id === auth.actor.id

    if (!canDelete) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to delete this comment." },
        { status: 403 }
      )
    }

    await prisma.workspace_note_comments.update({
      where: { id: commentId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: auth.actor.id,
        body: "",
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE NOTE COMMENT ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to delete note comment." },
      { status: 500 }
    )
  }
}
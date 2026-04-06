import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditWithin, getWorkspaceActor } from "../../_lib"

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
    const body = await req.json().catch(() => null)
    const content = typeof body?.content === "string" ? body.content.trim() : ""

    if (!content) {
      return NextResponse.json({ ok: false, error: "Content is required." }, { status: 400 })
    }

    const message = await prisma.workspace_messages.findUnique({
      where: { id },
      select: {
        id: true,
        author_id: true,
        created_at: true,
        is_deleted: true,
      },
    })

    if (!message) {
      return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
    }

    if (message.is_deleted) {
      return NextResponse.json(
        { ok: false, error: "Deleted messages cannot be edited." },
        { status: 400 }
      )
    }

    const canEdit =
      auth.actor.isSuperAdmin ||
      (message.author_id === auth.actor.id && canEditWithin(message.created_at, 10))

    if (!canEdit) {
      return NextResponse.json(
        { ok: false, error: "You can edit only your own message within 10 minutes." },
        { status: 403 }
      )
    }

    await prisma.workspace_messages.update({
      where: { id },
      data: {
        content,
        edited_at: new Date(),
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PATCH WORKSPACE MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to update message." }, { status: 500 })
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
    const message = await prisma.workspace_messages.findUnique({
      where: { id },
      select: {
        id: true,
        author_id: true,
        is_deleted: true,
      },
    })

    if (!message) {
      return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
    }

    if (message.is_deleted) {
      return NextResponse.json({ ok: true })
    }

    const canDelete = auth.actor.isSuperAdmin || message.author_id === auth.actor.id

    if (!canDelete) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to delete this message." },
        { status: 403 }
      )
    }

    await prisma.workspace_messages.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: auth.actor.id,
        content: "",
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE WORKSPACE MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to delete message." }, { status: 500 })
  }
}
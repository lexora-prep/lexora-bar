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
    const action = typeof body?.action === "string" ? body.action : "edit"
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    const pinned =
      typeof body?.pinned === "boolean"
        ? body.pinned
        : typeof body?.isPinned === "boolean"
          ? body.isPinned
          : undefined

    const message = await prisma.workspace_messages.findUnique({
      where: { id },
      select: {
        id: true,
        channel_id: true,
        author_id: true,
        created_at: true,
        is_deleted: true,
        is_pinned: true,
        message_type: true,
      },
    })

    if (!message) {
      return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
    }

    if (message.is_deleted) {
      return NextResponse.json(
        { ok: false, error: "Deleted messages cannot be updated." },
        { status: 400 }
      )
    }

    if (action === "toggle_pin" || action === "set_pin") {
      const canManagePins =
        auth.actor.isSuperAdmin ||
        auth.actor.can_manage_workspace_channels ||
        auth.actor.can_manage_all_workspace ||
        message.author_id === auth.actor.id

      if (!canManagePins) {
        return NextResponse.json(
          { ok: false, error: "You do not have permission to pin this message." },
          { status: 403 }
        )
      }

      const nextPinned = action === "toggle_pin" ? !message.is_pinned : Boolean(pinned)

      if (nextPinned) {
        const pinnedCount = await prisma.workspace_messages.count({
          where: {
            channel_id: message.channel_id,
            is_deleted: false,
            is_pinned: true,
          },
        })

        if (!message.is_pinned && pinnedCount >= 10) {
          return NextResponse.json(
            { ok: false, error: "You can pin up to 10 messages per channel." },
            { status: 400 }
          )
        }
      }

      const updated = await prisma.workspace_messages.update({
        where: { id },
        data: {
          is_pinned: nextPinned,
          updated_at: new Date(),
        },
        select: {
          id: true,
          is_pinned: true,
          updated_at: true,
        },
      })

      return NextResponse.json({ ok: true, message: updated })
    }

    if (!content) {
      return NextResponse.json({ ok: false, error: "Content is required." }, { status: 400 })
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

    const updated = await prisma.workspace_messages.update({
      where: { id },
      data: {
        content,
        edited_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        content: true,
        edited_at: true,
        updated_at: true,
        is_pinned: true,
      },
    })

    return NextResponse.json({ ok: true, message: updated })
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
        content: "This message was deleted.",
        is_pinned: false,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE WORKSPACE MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to delete message." }, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditWithin, getWorkspaceActor } from "../../_lib"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { threadId } = await params

  try {
    const membership = await prisma.workspace_direct_thread_members.findFirst({
      where: {
        thread_id: threadId,
        user_id: auth.actor.id,
      },
      select: { id: true },
    })

    if (!membership && !auth.actor.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const rows = await prisma.workspace_direct_messages.findMany({
      where: { thread_id: threadId },
      orderBy: { created_at: "asc" },
    })

    const unreadForActor = rows.filter(
      (row) => !row.read_by.includes(auth.actor.id) && row.author_id !== auth.actor.id
    )

    for (const row of unreadForActor) {
      await prisma.workspace_direct_messages.update({
        where: { id: row.id },
        data: {
          read_by: [...row.read_by, auth.actor.id],
        },
      })
    }

    const userIds = Array.from(new Set(rows.map((r) => r.author_id)))
    const profiles = userIds.length
      ? await prisma.profiles.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            full_name: true,
            email: true,
            admin_role: true,
            role: true,
          },
        })
      : []

    const profileMap = new Map(
      profiles.map((p) => [
        p.id,
        {
          name: p.full_name?.trim() || p.email.split("@")[0],
          role: p.admin_role || p.role || "admin",
        },
      ])
    )

    const messages = rows.map((row) => {
      const profile = profileMap.get(row.author_id)
      return {
        id: row.id,
        author: profile?.name || "Unknown",
        role: profile?.role || "admin",
        content: row.is_deleted ? "This message was deleted." : row.content,
        created_at: row.created_at,
        edited_at: row.edited_at,
        read_by: row.read_by,
        is_deleted: row.is_deleted,
      }
    })

    return NextResponse.json({ ok: true, messages })
  } catch (error) {
    console.error("GET DM THREAD ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to load direct messages." }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { threadId } = await params

  try {
    const body = await req.json().catch(() => null)
    const action = typeof body?.action === "string" ? body.action : ""

    if (action === "edit_message") {
      const messageId = typeof body?.messageId === "string" ? body.messageId : ""
      const content = typeof body?.content === "string" ? body.content.trim() : ""

      const message = await prisma.workspace_direct_messages.findUnique({
        where: { id: messageId },
        select: {
          id: true,
          thread_id: true,
          author_id: true,
          created_at: true,
          is_deleted: true,
        },
      })

      if (!message || message.thread_id !== threadId) {
        return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
      }

      if (message.is_deleted) {
        return NextResponse.json({ ok: false, error: "Deleted message." }, { status: 400 })
      }

      const canEdit =
        auth.actor.isSuperAdmin ||
        (message.author_id === auth.actor.id && canEditWithin(message.created_at, 10))

      if (!canEdit) {
        return NextResponse.json(
          { ok: false, error: "You can edit only your own DM within 10 minutes." },
          { status: 403 }
        )
      }

      await prisma.workspace_direct_messages.update({
        where: { id: messageId },
        data: {
          content,
          edited_at: new Date(),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === "mark_read") {
      const ids = Array.isArray(body?.messageIds)
        ? body.messageIds.filter((v: unknown) => typeof v === "string")
        : []

      for (const id of ids) {
        const row = await prisma.workspace_direct_messages.findUnique({
          where: { id },
          select: { id: true, read_by: true, thread_id: true },
        })

        if (row && row.thread_id === threadId && !row.read_by.includes(auth.actor.id)) {
          await prisma.workspace_direct_messages.update({
            where: { id },
            data: {
              read_by: [...row.read_by, auth.actor.id],
            },
          })
        }
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 })
  } catch (error) {
    console.error("PATCH DM THREAD ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to update DM thread." }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { threadId } = await params

  try {
    const body = await req.json().catch(() => null)
    const messageId = typeof body?.messageId === "string" ? body.messageId : ""

    const message = await prisma.workspace_direct_messages.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        thread_id: true,
        author_id: true,
        is_deleted: true,
      },
    })

    if (!message || message.thread_id !== threadId) {
      return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 })
    }

    const canDelete = auth.actor.isSuperAdmin || message.author_id === auth.actor.id
    if (!canDelete) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    await prisma.workspace_direct_messages.update({
      where: { id: messageId },
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
    console.error("DELETE DM MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to delete DM." }, { status: 500 })
  }
}
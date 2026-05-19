import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { publishAdminRealtimeEvent } from "@/lib/ably-server"
import { createAdminNotification } from "@/lib/admin-notifications"
import { getWorkspaceActor } from "../_lib"

function displayName(user: { full_name: string | null; email: string }) {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  return user.email.split("@")[0] || "Admin"
}

function truncateMessage(value: string, limit = 90) {
  const text = value.trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

export async function POST(req: Request) {
  const auth = await getWorkspaceActor()

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => null)

    const recipientId = typeof body?.recipientId === "string" ? body.recipientId : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    const bootstrapOnly = body?.bootstrapOnly === true

    if (!recipientId) {
      return NextResponse.json(
        { ok: false, error: "Recipient is required." },
        { status: 400 },
      )
    }

    if (!bootstrapOnly && !message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 },
      )
    }

    if (recipientId === auth.actor.id) {
      return NextResponse.json(
        { ok: false, error: "You cannot create a direct message with yourself." },
        { status: 400 },
      )
    }

    const recipient = await prisma.profiles.findFirst({
      where: {
        id: recipientId,
        is_blocked: false,
        OR: [{ is_admin: true }, { role: "admin" }, { role: "super_admin" }],
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        admin_role: true,
      },
    })

    if (!recipient) {
      return NextResponse.json(
        { ok: false, error: "Recipient was not found." },
        { status: 404 },
      )
    }

    const existingMemberships = await prisma.workspace_direct_thread_members.findMany({
      where: {
        user_id: {
          in: [auth.actor.id, recipientId],
        },
      },
      select: {
        thread_id: true,
        user_id: true,
      },
    })

    let threadId: string | null = null
    const grouped = new Map<string, string[]>()

    for (const item of existingMemberships) {
      const users = grouped.get(item.thread_id) || []
      users.push(item.user_id)
      grouped.set(item.thread_id, users)
    }

    for (const [candidateThreadId, users] of grouped.entries()) {
      const unique = Array.from(new Set(users))

      if (
        unique.length === 2 &&
        unique.includes(auth.actor.id) &&
        unique.includes(recipientId)
      ) {
        threadId = candidateThreadId
        break
      }
    }

    if (!threadId) {
      const thread = await prisma.workspace_direct_threads.create({
        data: {
          created_by: auth.actor.id,
        },
        select: {
          id: true,
        },
      })

      threadId = thread.id

      await prisma.workspace_direct_thread_members.createMany({
        data: [
          { thread_id: threadId, user_id: auth.actor.id },
          { thread_id: threadId, user_id: recipientId },
        ],
        skipDuplicates: true,
      })
    }

    if (bootstrapOnly) {
      return NextResponse.json({
        ok: true,
        threadId,
        message: null,
      })
    }

    const savedMessage = await prisma.workspace_direct_messages.create({
      data: {
        thread_id: threadId,
        author_id: auth.actor.id,
        content: message,
        read_by: [auth.actor.id],
      },
      select: {
        id: true,
        thread_id: true,
        author_id: true,
        content: true,
        created_at: true,
        edited_at: true,
        read_by: true,
        is_deleted: true,
      },
    })

    await prisma.workspace_direct_threads.update({
      where: {
        id: threadId,
      },
      data: {
        updated_at: new Date(),
      },
    })

    const senderName = displayName({
      full_name: auth.actor.full_name,
      email: auth.actor.email,
    })

    const senderRole = auth.actor.admin_role || auth.actor.role || "admin"

    const notification = await createAdminNotification({
      adminId: recipient.id,
      actorAdminId: auth.actor.id,
      type: "workspace_dm",
      title: "New direct message",
      body: `${senderName}: ${truncateMessage(message)}`,
      href: `/admin/workspace?dm=${auth.actor.id}`,
      severity: "info",
      metadata: {
        module: "workspace",
        event: "dm_message",
        threadId,
        senderId: auth.actor.id,
        senderName,
        recipientId: recipient.id,
      },
    })

    if (notification.ok && !notification.skipped) {
      await publishAdminRealtimeEvent({
        type: "team_dm_message",
        recipientId: recipient.id,
        senderId: auth.actor.id,
        senderName,
        threadId,
        dmMessage: {
          id: savedMessage.id,
          threadId,
          authorId: auth.actor.id,
          author: senderName,
          role: senderRole,
          content: savedMessage.content,
          createdAt: savedMessage.created_at.toISOString(),
          editedAt: savedMessage.edited_at ? savedMessage.edited_at.toISOString() : null,
          readBy: savedMessage.read_by,
          isDeleted: savedMessage.is_deleted,
        },
        notification: {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          severity: notification.severity,
          createdAt: notification.createdAt,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      threadId,
      message: {
        id: savedMessage.id,
        author: senderName,
        author_id: auth.actor.id,
        role: senderRole,
        content: savedMessage.content,
        created_at: savedMessage.created_at.toISOString(),
        edited_at: savedMessage.edited_at ? savedMessage.edited_at.toISOString() : null,
        read_by: savedMessage.read_by,
        is_deleted: savedMessage.is_deleted,
      },
    })
  } catch (error) {
    console.error("POST DM ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to send DM." }, { status: 500 })
  }
}

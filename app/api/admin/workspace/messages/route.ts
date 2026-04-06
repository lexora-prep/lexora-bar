import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ensureWorkspaceSeedData,
  findAccessibleChannelBySlug,
  getWorkspaceActor,
} from "../_lib"

export async function GET(req: Request) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    await ensureWorkspaceSeedData()

    const { searchParams } = new URL(req.url)
    const channelSlug = searchParams.get("channel")?.trim()

    if (!channelSlug) {
      return NextResponse.json({ ok: false, error: "Channel is required." }, { status: 400 })
    }

    const channel = await findAccessibleChannelBySlug(
      channelSlug,
      auth.actor.id,
      auth.actor.isSuperAdmin
    )

    if (!channel) {
      return NextResponse.json({ ok: false, error: "Channel not found." }, { status: 404 })
    }

    const rows = await prisma.workspace_messages.findMany({
      where: {
        channel_id: channel.id,
      },
      orderBy: {
        created_at: "asc",
      },
      include: {
        reactions: true,
      },
    })

    const relatedMessageIds = rows
      .map((row) => row.reply_to_message_id)
      .filter((value): value is string => Boolean(value))

    const replyMessages = relatedMessageIds.length
      ? await prisma.workspace_messages.findMany({
          where: {
            id: { in: relatedMessageIds },
          },
          select: {
            id: true,
            content: true,
            author_id: true,
          },
        })
      : []

    const userIds = Array.from(
      new Set(
        [
          ...rows.map((m) => m.author_id),
          ...rows.flatMap((m) => m.reactions.map((r) => r.user_id)),
          ...replyMessages.map((m) => m.author_id),
        ].filter((value): value is string => Boolean(value))
      )
    )

    const profiles = userIds.length
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

    const profileMap = new Map(
      profiles.map((p) => [
        p.id,
        {
          name: p.full_name?.trim() || p.email.split("@")[0],
          role: p.admin_role || p.role || "admin",
        },
      ])
    )

    const replyMap = new Map(
      replyMessages.map((message) => [
        message.id,
        {
          id: message.id,
          content: message.content,
          author: profileMap.get(message.author_id)?.name || "Unknown",
          role: profileMap.get(message.author_id)?.role || "admin",
        },
      ])
    )

    const messages = rows.map((row) => {
      const grouped = new Map<
        string,
        {
          emoji: string
          count: number
          users: { user_id: string; author_name: string; author_role: string }[]
        }
      >()

      for (const reaction of row.reactions) {
        const profile = profileMap.get(reaction.user_id)
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

      const author = profileMap.get(row.author_id)

      return {
        id: row.id,
        author: author?.name || "Unknown",
        role: author?.role || "admin",
        content: row.is_deleted ? "This message was deleted." : row.content,
        message_type: row.message_type,
        is_pinned: row.is_pinned,
        is_urgent: row.is_urgent,
        wake_alert_sent_at: row.wake_alert_sent_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        edited_at: row.edited_at,
        my_emojis: row.reactions
          .filter((r) => r.user_id === auth.actor.id)
          .map((r) => r.emoji),
        reactions: Array.from(grouped.values()),
        attachment_name: row.attachment_name,
        attachment_size: row.attachment_size,
        attachment_type: row.attachment_type,
        is_deleted: row.is_deleted,
        reply_to_message_id: row.reply_to_message_id,
        reply_preview: row.reply_to_message_id ? replyMap.get(row.reply_to_message_id) || null : null,
        forwarded_from_message_id: row.forwarded_from_message_id,
        forwarded_from_note_id: row.forwarded_from_note_id,
        forwarded_original_author_name: row.forwarded_original_author_name,
      }
    })

    return NextResponse.json({ ok: true, messages })
  } catch (error) {
    console.error("GET WORKSPACE MESSAGES ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to load messages." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    await ensureWorkspaceSeedData()

    const body = await req.json().catch(() => null)
    const channelSlug = typeof body?.channel === "string" ? body.channel.trim() : ""
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    const messageType = body?.messageType === "note" ? "note" : "message"
    const replyToMessageId =
      typeof body?.replyToMessageId === "string" ? body.replyToMessageId : null
    const forwardedFromMessageId =
      typeof body?.forwardedFromMessageId === "string" ? body.forwardedFromMessageId : null
    const forwardedFromNoteId =
      typeof body?.forwardedFromNoteId === "string" ? body.forwardedFromNoteId : null
    const forwardedOriginalAuthorName =
      typeof body?.forwardedOriginalAuthorName === "string"
        ? body.forwardedOriginalAuthorName.trim()
        : null

    if (!channelSlug || !content) {
      return NextResponse.json(
        { ok: false, error: "Channel and content are required." },
        { status: 400 }
      )
    }

    const channel = await findAccessibleChannelBySlug(
      channelSlug,
      auth.actor.id,
      auth.actor.isSuperAdmin
    )

    if (!channel) {
      return NextResponse.json({ ok: false, error: "Channel not found." }, { status: 404 })
    }

    if (replyToMessageId) {
      const replyTarget = await prisma.workspace_messages.findUnique({
        where: { id: replyToMessageId },
        select: { id: true, channel_id: true },
      })

      if (!replyTarget || replyTarget.channel_id !== channel.id) {
        return NextResponse.json(
          { ok: false, error: "Reply target message not found in this channel." },
          { status: 400 }
        )
      }
    }

    await prisma.workspace_messages.create({
      data: {
        channel_id: channel.id,
        author_id: auth.actor.id,
        content,
        is_pinned: messageType === "note",
        message_type: messageType,
        reply_to_message_id: replyToMessageId,
        forwarded_from_message_id: forwardedFromMessageId,
        forwarded_from_note_id: forwardedFromNoteId,
        forwarded_original_author_name: forwardedOriginalAuthorName,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST WORKSPACE MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to send message." }, { status: 500 })
  }
}
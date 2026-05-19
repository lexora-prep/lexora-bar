import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAdminNotification } from "@/lib/admin-notifications"
import { publishAdminRealtimeEvent } from "@/lib/ably-server"
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

    const relatedMessageIds = Array.from(
      new Set(
        rows
          .map((row) => row.reply_to_message_id)
          .filter((value): value is string => Boolean(value))
      )
    )

    const replyMessages = relatedMessageIds.length
      ? await prisma.workspace_messages.findMany({
          where: {
            id: { in: relatedMessageIds },
          },
          select: {
            id: true,
            content: true,
            author_id: true,
            is_deleted: true,
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
          content: message.is_deleted ? "This message was deleted." : message.content,
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
        author_id: row.author_id,
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
        reply_preview: row.reply_to_message_id
          ? replyMap.get(row.reply_to_message_id) || null
          : null,
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


type MentionAdminProfile = {
  id: string
  email: string
  full_name: string | null
  role: string | null
  admin_role: string | null
}

type MentionChannel = {
  id: string
  slug: string
  name: string
  is_private: boolean
  is_hidden: boolean
}

function normalizeMentionValue(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^@+/, "")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ")
}

function messageContainsMention(content: string, value: string | null | undefined) {
  const normalizedValue = normalizeMentionValue(value)
  if (!normalizedValue) return false

  const normalizedContent = normalizeMentionValue(content)

  if (!normalizedContent) return false

  return (
    normalizedContent.includes(`@${normalizedValue}`) ||
    normalizedContent.includes(normalizedValue)
  )
}

function hasGroupMention(content: string) {
  return /(^|\s)@(all|admins|admin|team|everyone)(?=\s|$|[.,!?;:])/i.test(content)
}

function truncateMentionBody(value: string, limit = 120) {
  const text = value.replace(/\s+/g, " ").trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 3)}...`
}

function getMentionDisplayName(profile: Pick<MentionAdminProfile, "email" | "full_name">) {
  return profile.full_name?.trim() || profile.email.split("@")[0] || "Admin"
}

async function notifyChannelMentions(input: {
  content: string
  channel: MentionChannel
  senderId: string
  senderName: string
  messageId: string
}) {
  const content = input.content.trim()
  if (!content.includes("@")) return

  const admins = await prisma.profiles.findMany({
    where: {
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

  if (!admins.length) return

  let accessibleAdminIds = new Set(admins.map((admin) => admin.id))

  if (input.channel.is_private || input.channel.is_hidden) {
    const channelMembers = await prisma.workspace_channel_members.findMany({
      where: {
        channel_id: input.channel.id,
      },
      select: {
        user_id: true,
      },
    })

    accessibleAdminIds = new Set(channelMembers.map((member) => member.user_id))
  }

  const targetIds = new Set<string>()

  if (hasGroupMention(content)) {
    for (const admin of admins) {
      if (admin.id !== input.senderId && accessibleAdminIds.has(admin.id)) {
        targetIds.add(admin.id)
      }
    }
  }

  for (const admin of admins) {
    if (admin.id === input.senderId) continue
    if (!accessibleAdminIds.has(admin.id)) continue

    const fullName = admin.full_name?.trim() || ""
    const emailPrefix = admin.email.split("@")[0] || ""

    if (
      messageContainsMention(content, fullName) ||
      messageContainsMention(content, emailPrefix) ||
      messageContainsMention(content, admin.email)
    ) {
      targetIds.add(admin.id)
    }
  }

  if (!targetIds.size) return

  const href = `/admin/workspace?channel=${encodeURIComponent(input.channel.slug)}`
  const body = `${input.senderName}: ${truncateMentionBody(content)}`

  for (const adminId of targetIds) {
    const notification = await createAdminNotification({
      adminId,
      actorAdminId: input.senderId,
      type: "team_mention",
      title: `You were mentioned in #${input.channel.name || input.channel.slug}`,
      body,
      href,
      severity: "info",
      metadata: {
        module: "workspace",
        event: "channel_mention",
        channelId: input.channel.id,
        channelSlug: input.channel.slug,
        messageId: input.messageId,
        senderId: input.senderId,
      },
    })

    if (notification.ok && !notification.skipped) {
      await publishAdminRealtimeEvent({
        type: "admin_notification",
        recipientId: adminId,
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
        select: {
          id: true,
          channel_id: true,
          is_deleted: true,
        },
      })

      if (!replyTarget || replyTarget.channel_id !== channel.id || replyTarget.is_deleted) {
        return NextResponse.json(
          { ok: false, error: "Reply target message not found in this channel." },
          { status: 400 }
        )
      }
    }

    const shouldPin = messageType === "note"

    if (shouldPin) {
      const pinnedCount = await prisma.workspace_messages.count({
        where: {
          channel_id: channel.id,
          is_deleted: false,
          is_pinned: true,
        },
      })

      if (pinnedCount >= 10) {
        return NextResponse.json(
          { ok: false, error: "You can pin up to 10 messages per channel." },
          { status: 400 }
        )
      }
    }

    const created = await prisma.workspace_messages.create({
      data: {
        channel_id: channel.id,
        author_id: auth.actor.id,
        content,
        is_pinned: shouldPin,
        message_type: messageType,
        reply_to_message_id: replyToMessageId,
        forwarded_from_message_id: forwardedFromMessageId,
        forwarded_from_note_id: forwardedFromNoteId,
        forwarded_original_author_name: forwardedOriginalAuthorName,
      },
      select: {
        id: true,
        channel_id: true,
        author_id: true,
        content: true,
        message_type: true,
        is_pinned: true,
        is_urgent: true,
        wake_alert_sent_at: true,
        created_at: true,
        updated_at: true,
        edited_at: true,
        attachment_name: true,
        attachment_size: true,
        attachment_type: true,
        is_deleted: true,
        reply_to_message_id: true,
        forwarded_from_message_id: true,
        forwarded_from_note_id: true,
        forwarded_original_author_name: true,
      },
    })

    const author = await prisma.profiles.findUnique({
      where: { id: created.author_id },
      select: {
        full_name: true,
        email: true,
        admin_role: true,
        role: true,
      },
    })

    const senderName =
      author?.full_name?.trim() ||
      author?.email?.split("@")[0] ||
      "Unknown"

    await notifyChannelMentions({
      content: created.content,
      channel: {
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
        is_private: channel.is_private,
        is_hidden: channel.is_hidden,
      },
      senderId: created.author_id,
      senderName,
      messageId: created.id,
    })

    let replyPreview: {
      id: string
      content: string
      author: string
      role: string
    } | null = null

    if (created.reply_to_message_id) {
      const replyMessage = await prisma.workspace_messages.findUnique({
        where: { id: created.reply_to_message_id },
        select: {
          id: true,
          content: true,
          author_id: true,
          is_deleted: true,
        },
      })

      if (replyMessage) {
        const replyAuthor = await prisma.profiles.findUnique({
          where: { id: replyMessage.author_id },
          select: {
            full_name: true,
            email: true,
            admin_role: true,
            role: true,
          },
        })

        replyPreview = {
          id: replyMessage.id,
          content: replyMessage.is_deleted ? "This message was deleted." : replyMessage.content,
          author:
            replyAuthor?.full_name?.trim() ||
            replyAuthor?.email?.split("@")[0] ||
            "Unknown",
          role: replyAuthor?.admin_role || replyAuthor?.role || "admin",
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: created.id,
        author: senderName,
        author_id: created.author_id,
        role: author?.admin_role || author?.role || "admin",
        content: created.content,
        message_type: created.message_type,
        is_pinned: created.is_pinned,
        is_urgent: created.is_urgent,
        wake_alert_sent_at: created.wake_alert_sent_at,
        created_at: created.created_at,
        updated_at: created.updated_at,
        edited_at: created.edited_at,
        my_emojis: [],
        reactions: [],
        attachment_name: created.attachment_name,
        attachment_size: created.attachment_size,
        attachment_type: created.attachment_type,
        is_deleted: created.is_deleted,
        reply_to_message_id: created.reply_to_message_id,
        reply_preview: replyPreview,
        forwarded_from_message_id: created.forwarded_from_message_id,
        forwarded_from_note_id: created.forwarded_from_note_id,
        forwarded_original_author_name: created.forwarded_original_author_name,
      },
    })
  } catch (error) {
    console.error("POST WORKSPACE MESSAGE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to send message." }, { status: 500 })
  }
}
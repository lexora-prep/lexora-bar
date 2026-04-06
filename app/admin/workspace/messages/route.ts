import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      is_blocked: true,
      full_name: true,
      email: true,
      admin_role: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    userId: user.id,
    profile,
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const channelSlug = String(searchParams.get("channel") || "general").trim()

    const channel = await prisma.workspace_channels.findFirst({
      where: {
        slug: channelSlug,
        deleted_at: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        team_id: true,
        is_private: true,
        is_hidden: true,
        deleted_at: true,
      },
    })

    if (!channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    const messages = await prisma.workspace_messages.findMany({
      where: { channel_id: channel.id },
      orderBy: { created_at: "asc" },
      take: 100,
      select: {
        id: true,
        channel_id: true,
        author_id: true,
        content: true,
        is_pinned: true,
        created_at: true,
        updated_at: true,
      },
    })

    const authorIds = [...new Set(messages.map((m) => m.author_id))]
    const authors =
      authorIds.length > 0
        ? await prisma.profiles.findMany({
            where: { id: { in: authorIds } },
            select: {
              id: true,
              full_name: true,
              email: true,
              admin_role: true,
            },
          })
        : []

    const authorMap = new Map(
      authors.map((a) => [
        a.id,
        {
          name: a.full_name || a.email || "Admin",
          role: (a.admin_role || "admin").toUpperCase(),
        },
      ])
    )

    const messageIds = messages.map((m) => m.id)
    const reactions =
      messageIds.length > 0
        ? await prisma.workspace_message_reactions.findMany({
            where: { message_id: { in: messageIds } },
            select: {
              id: true,
              message_id: true,
              user_id: true,
              emoji: true,
            },
          })
        : []

    const reactionUserIds = [...new Set(reactions.map((r) => r.user_id))]
    const reactionUsers =
      reactionUserIds.length > 0
        ? await prisma.profiles.findMany({
            where: { id: { in: reactionUserIds } },
            select: {
              id: true,
              full_name: true,
              email: true,
              admin_role: true,
            },
          })
        : []

    const reactionUserMap = new Map(
      reactionUsers.map((u) => [
        u.id,
        {
          author_name: u.full_name || u.email || "Admin",
          author_role: (u.admin_role || "admin").toUpperCase(),
        },
      ])
    )

    const hydratedMessages = messages.map((message) => {
      const messageReactions = reactions.filter((r) => r.message_id === message.id)

      const grouped = new Map<
        string,
        {
          emoji: string
          count: number
          users: { user_id: string; author_name: string; author_role: string }[]
        }
      >()

      for (const reaction of messageReactions) {
        const existing = grouped.get(reaction.emoji)
        const userInfo = reactionUserMap.get(reaction.user_id) || {
          author_name: "Admin",
          author_role: "ADMIN",
        }

        if (existing) {
          existing.count += 1
          existing.users.push({
            user_id: reaction.user_id,
            author_name: userInfo.author_name,
            author_role: userInfo.author_role,
          })
        } else {
          grouped.set(reaction.emoji, {
            emoji: reaction.emoji,
            count: 1,
            users: [
              {
                user_id: reaction.user_id,
                author_name: userInfo.author_name,
                author_role: userInfo.author_role,
              },
            ],
          })
        }
      }

      return {
        id: message.id,
        author: authorMap.get(message.author_id)?.name || "Admin",
        role: authorMap.get(message.author_id)?.role || "ADMIN",
        content: message.content,
        is_pinned: message.is_pinned,
        created_at: message.created_at,
        updated_at: message.updated_at,
        my_emojis: messageReactions
          .filter((r) => r.user_id === auth.userId)
          .map((r) => r.emoji),
        reactions: Array.from(grouped.values()),
      }
    })

    return NextResponse.json({
      ok: true,
      channel,
      messages: hydratedMessages,
    })
  } catch (err: any) {
    console.error("WORKSPACE MESSAGES GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load workspace messages." },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const body = await req.json()
    const channelSlug = String(body?.channel || "general").trim()
    const content = String(body?.content || "").trim()
    const isPinned = !!body?.is_pinned

    if (!content) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 })
    }

    const channel = await prisma.workspace_channels.findFirst({
      where: {
        slug: channelSlug,
        deleted_at: null,
      },
      select: { id: true },
    })

    if (!channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    const message = await prisma.workspace_messages.create({
      data: {
        channel_id: channel.id,
        author_id: auth.userId,
        content,
        is_pinned: isPinned,
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({ ok: true, message })
  } catch (err: any) {
    console.error("WORKSPACE MESSAGES POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to create workspace message." },
      { status: 500 }
    )
  }
}
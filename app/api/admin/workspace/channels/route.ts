import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ensureWorkspaceSeedData,
  getWorkspaceActor,
  getWorkspaceSettings,
  normalizeChannelSymbol,
  normalizeColorHex,
  slugify,
} from "../_lib"

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

    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const description = typeof body?.description === "string" ? body.description.trim() : ""
    const iconSymbol = normalizeChannelSymbol(body?.iconSymbol)
    const colorHex = normalizeColorHex(body?.colorHex)
    const isPrivate = body?.isPrivate === true
    const isHidden = body?.isHidden === true
    const visibleUserIds = Array.isArray(body?.visibleUserIds)
      ? Array.from(
          new Set(
            body.visibleUserIds.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
          )
        )
      : []

    if (!name) {
      return NextResponse.json({ ok: false, error: "Channel name is required." }, { status: 400 })
    }

    if (!settings.allow_channel_creation && !actor.isSuperAdmin) {
      return NextResponse.json(
        { ok: false, error: "Channel creation is disabled in workspace settings." },
        { status: 403 }
      )
    }

    if (
      !actor.isSuperAdmin &&
      !actor.can_create_workspace_channels &&
      !actor.can_manage_workspace_channels
    ) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to create channels." },
        { status: 403 }
      )
    }

    if (isHidden) {
      if (!settings.allow_hidden_channel_creation && !actor.isSuperAdmin) {
        return NextResponse.json(
          { ok: false, error: "Hidden channels are disabled in workspace settings." },
          { status: 403 }
        )
      }

      if (!actor.isSuperAdmin && !actor.can_manage_hidden_channels) {
        return NextResponse.json(
          { ok: false, error: "You do not have permission to create hidden channels." },
          { status: 403 }
        )
      }
    }

    const slug = slugify(name)
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Channel name must contain letters or numbers." },
        { status: 400 }
      )
    }

    const existing = await prisma.workspace_channels.findFirst({
      where: {
        team_id: team.id,
        slug,
        deleted_at: null,
        is_archived: false,
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Another channel with this name already exists." },
        { status: 409 }
      )
    }

    const channel = await prisma.workspace_channels.create({
      data: {
        team_id: team.id,
        slug,
        name,
        description: description || null,
        icon_symbol: iconSymbol,
        color_hex: colorHex,
        is_default: false,
        is_private: isPrivate,
        is_hidden: isHidden,
        created_by: actor.id,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        team_id: true,
        is_private: true,
        is_default: true,
        is_hidden: true,
        icon_symbol: true,
        color_hex: true,
        created_by: true,
      },
    })

    if (isHidden || isPrivate) {
      const memberIds = Array.from(
        new Set(
          [actor.id, ...visibleUserIds].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        )
      )

      await prisma.workspace_channel_members.createMany({
        data: memberIds.map((userId) => ({
          channel_id: channel.id,
          user_id: userId,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ ok: true, channel })
  } catch (error) {
    console.error("CREATE WORKSPACE CHANNEL ERROR:", error)
    return NextResponse.json({ ok: false, error: "Failed to create channel." }, { status: 500 })
  }
}

export async function PATCH() {
  return NextResponse.json(
    { ok: false, error: "Use /api/admin/workspace/channels/[id] for channel updates." },
    { status: 400 }
  )
}
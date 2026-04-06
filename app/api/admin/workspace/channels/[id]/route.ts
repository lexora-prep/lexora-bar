import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getWorkspaceActor,
  getWorkspaceSettings,
  normalizeChannelSymbol,
  normalizeColorHex,
  slugify,
} from "../../_lib"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const actor = auth.actor
  const { id } = await params

  try {
    const body = await req.json().catch(() => null)
    const action = typeof body?.action === "string" ? body.action : ""

    const channel = await prisma.workspace_channels.findUnique({
      where: { id },
      select: {
        id: true,
        team_id: true,
        slug: true,
        name: true,
        is_default: true,
        is_hidden: true,
        is_private: true,
        created_by: true,
        deleted_at: true,
      },
    })

    if (!channel || channel.deleted_at) {
      return NextResponse.json({ ok: false, error: "Channel not found." }, { status: 404 })
    }

    const canManage =
      actor.isSuperAdmin ||
      actor.can_manage_workspace_channels ||
      channel.created_by === actor.id

    if (action === "rename") {
      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
      }

      const nextName = typeof body?.name === "string" ? body.name.trim() : ""
      const nextDescription =
        typeof body?.description === "string" ? body.description.trim() : undefined
      const nextIcon =
        body?.iconSymbol !== undefined ? normalizeChannelSymbol(body?.iconSymbol) : undefined
      const nextColor =
        body?.colorHex !== undefined ? normalizeColorHex(body?.colorHex) : undefined
      const nextIsPrivate =
        typeof body?.isPrivate === "boolean" ? body.isPrivate : undefined
      const nextIsHidden =
        typeof body?.isHidden === "boolean" ? body.isHidden : undefined
      const visibleUserIds = Array.isArray(body?.visibleUserIds)
        ? body.visibleUserIds.filter((v: unknown): v is string => typeof v === "string")
        : []

      if (!nextName) {
        return NextResponse.json({ ok: false, error: "Channel name is required." }, { status: 400 })
      }

      if (nextIsHidden === true && !actor.isSuperAdmin && !actor.can_manage_hidden_channels) {
        return NextResponse.json(
          { ok: false, error: "You do not have permission to make channels hidden." },
          { status: 403 }
        )
      }

      const settings = await getWorkspaceSettings()
      if (nextIsHidden === true && !settings.allow_hidden_channel_creation && !actor.isSuperAdmin) {
        return NextResponse.json(
          { ok: false, error: "Hidden channels are disabled in workspace settings." },
          { status: 403 }
        )
      }

      const nextSlug = slugify(nextName)
      if (!nextSlug) {
        return NextResponse.json(
          { ok: false, error: "Channel name must contain letters or numbers." },
          { status: 400 }
        )
      }

      const slugExists = await prisma.workspace_channels.findFirst({
        where: {
          team_id: channel.team_id,
          slug: nextSlug,
          deleted_at: null,
          NOT: { id: channel.id },
        },
        select: { id: true },
      })

      if (slugExists) {
        return NextResponse.json(
          { ok: false, error: "Another channel with this name already exists." },
          { status: 409 }
        )
      }

      const resolvedIsPrivate = nextIsPrivate ?? channel.is_private
      const resolvedIsHidden = nextIsHidden ?? channel.is_hidden

      await prisma.workspace_channels.update({
        where: { id },
        data: {
          name: nextName,
          slug: nextSlug,
          ...(nextDescription !== undefined ? { description: nextDescription || null } : {}),
          ...(nextIcon !== undefined ? { icon_symbol: nextIcon } : {}),
          ...(nextColor !== undefined ? { color_hex: nextColor } : {}),
          ...(nextIsPrivate !== undefined ? { is_private: nextIsPrivate } : {}),
          ...(nextIsHidden !== undefined ? { is_hidden: nextIsHidden } : {}),
          updated_at: new Date(),
        },
      })

      const desiredMemberIds: string[] = Array.from(
        new Set(
          [
            actor.id,
            channel.created_by || actor.id,
            ...(resolvedIsHidden || resolvedIsPrivate ? visibleUserIds : []),
          ].filter((userId): userId is string => typeof userId === "string" && userId.trim().length > 0)
        )
      )

      if (resolvedIsHidden || resolvedIsPrivate) {
        await prisma.workspace_channel_members.deleteMany({
          where: {
            channel_id: id,
            user_id: {
              notIn: desiredMemberIds,
            },
          },
        })

        await prisma.workspace_channel_members.createMany({
          data: desiredMemberIds.map((userId) => ({
            channel_id: id,
            user_id: userId,
          })),
          skipDuplicates: true,
        })
      }

      return NextResponse.json({ ok: true })
    }

    if (action === "archive") {
      if (!actor.isSuperAdmin && !actor.can_manage_workspace_channels) {
        return NextResponse.json(
          { ok: false, error: "Only workspace managers can archive channels." },
          { status: 403 }
        )
      }

      if (channel.is_default) {
        return NextResponse.json(
          { ok: false, error: "Default channel cannot be archived." },
          { status: 400 }
        )
      }

      await prisma.workspace_channels.update({
        where: { id },
        data: {
          is_archived: true,
          archived_at: new Date(),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === "request_delete") {
      if (channel.is_default) {
        return NextResponse.json(
          { ok: false, error: "Default channel cannot be deleted." },
          { status: 400 }
        )
      }

      const canRequest = actor.isSuperAdmin || channel.created_by === actor.id
      if (!canRequest) {
        return NextResponse.json(
          { ok: false, error: "Only creator or super admin can request deletion." },
          { status: 403 }
        )
      }

      await prisma.workspace_channels.update({
        where: { id },
        data: {
          delete_requested_by: actor.id,
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === "confirm_delete") {
      if (!actor.isSuperAdmin && !actor.can_manage_workspace_channels) {
        return NextResponse.json(
          { ok: false, error: "Only workspace managers can confirm deletion." },
          { status: 403 }
        )
      }

      if (channel.is_default) {
        return NextResponse.json(
          { ok: false, error: "Default channel cannot be deleted." },
          { status: 400 }
        )
      }

      await prisma.workspace_channels.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          delete_confirmed_by: actor.id,
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === "invite_member") {
      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
      }

      const userId = typeof body?.userId === "string" ? body.userId : ""

      if (!userId) {
        return NextResponse.json({ ok: false, error: "User is required." }, { status: 400 })
      }

      await prisma.workspace_channel_members.upsert({
        where: {
          channel_id_user_id: {
            channel_id: id,
            user_id: userId,
          },
        },
        update: {},
        create: {
          channel_id: id,
          user_id: userId,
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (action === "remove_member") {
      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
      }

      const userId = typeof body?.userId === "string" ? body.userId : ""
      if (!userId) {
        return NextResponse.json({ ok: false, error: "User is required." }, { status: 400 })
      }

      await prisma.workspace_channel_members.deleteMany({
        where: {
          channel_id: id,
          user_id: userId,
        },
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 })
  } catch (error) {
    console.error("PATCH WORKSPACE CHANNEL ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to update channel." },
      { status: 500 }
    )
  }
}
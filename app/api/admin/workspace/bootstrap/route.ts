import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureWorkspaceSeedData, getWorkspaceActor } from "../_lib"

export async function GET() {
  const auth = await getWorkspaceActor()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const actor = auth.actor
    const { team, settings } = await ensureWorkspaceSeedData()

    const channels = await prisma.workspace_channels.findMany({
      where: {
        team_id: team.id,
        deleted_at: null,
        is_archived: false,
        OR: [
          { is_hidden: false },
          { created_by: actor.id },
          { members: { some: { user_id: actor.id } } },
          ...(actor.isSuperAdmin ? [{}] : []),
        ],
      },
      orderBy: [{ is_default: "desc" }, { updated_at: "desc" }, { name: "asc" }],
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

    const notesRaw = await prisma.workspace_notes.findMany({
      where: {
        status: "active",
        OR: [
          { owner_id: actor.id },
          { visibility: "shared", shared_scope: "workspace" },
          { recipient_ids: { has: actor.id } },
          ...(actor.isSuperAdmin ? [{}] : []),
        ],
      },
      orderBy: [{ updated_at: "desc" }],
      take: 100,
      select: {
        id: true,
        owner_id: true,
        team_id: true,
        title: true,
        body: true,
        note_type: true,
        visibility: true,
        shared_scope: true,
        recipient_ids: true,
        status: true,
        forwarded_from_note_id: true,
        forwarded_original_author_name: true,
        created_at: true,
        updated_at: true,
        reactions: {
          select: {
            emoji: true,
            user_id: true,
          },
        },
        comments: {
          where: {
            is_deleted: false,
          },
          select: {
            id: true,
          },
        },
      },
    })

    const admins = await prisma.profiles.findMany({
      where: {
        is_blocked: false,
        OR: [{ is_admin: true }, { role: "admin" }, { role: "super_admin" }],
      },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone_number: true,
        role: true,
        admin_role: true,
        workspace_status: true,
        last_login_at: true,
        last_active_at: true,
        created_at: true,
      },
    })

    const teamMembers = admins.map((member) => ({
      id: member.id,
      name: member.full_name?.trim() || member.email.split("@")[0],
      email: member.email,
      phone_number: member.phone_number,
      role: member.role || "admin",
      title: member.admin_role || member.role || "admin",
      status:
        member.workspace_status === "away" ||
        member.workspace_status === "busy" ||
        member.workspace_status === "offline"
          ? member.workspace_status
          : "online",
      last_login_at: member.last_login_at,
      last_active_at: member.last_active_at,
      created_at: member.created_at,
    }))

    const directMembers = teamMembers.filter((m) => m.id !== actor.id)

    return NextResponse.json({
      ok: true,
      settings,
      channels,
      teams: [
        {
          id: team.id,
          slug: team.slug,
          name: team.name,
          description: team.description,
          member_count: teamMembers.length,
        },
      ],
      notes: notesRaw.map((note) => ({
        id: note.id,
        owner_id: note.owner_id,
        team_id: note.team_id,
        title: note.title,
        description: note.body.slice(0, 80),
        body: note.body,
        note_type: note.note_type,
        visibility: note.visibility,
        shared_scope: note.shared_scope,
        recipient_ids: note.recipient_ids,
        status: note.status,
        forwarded_from_note_id: note.forwarded_from_note_id,
        forwarded_original_author_name: note.forwarded_original_author_name,
        created_at: note.created_at,
        updated_at: note.updated_at,
        comment_count: note.comments.length,
        my_emojis: note.reactions
          .filter((reaction) => reaction.user_id === actor.id)
          .map((reaction) => reaction.emoji),
      })),
      directMembers,
      currentUser: {
        id: actor.id,
        full_name: actor.full_name,
        email: actor.email,
        phone_number: actor.phone_number,
        admin_role: actor.admin_role,
        role: actor.role,
        status:
          actor.workspace_status === "away" ||
          actor.workspace_status === "busy" ||
          actor.workspace_status === "offline"
            ? actor.workspace_status
            : "online",
        last_login_at: actor.last_login_at,
        last_active_at: actor.last_active_at,
        created_at: actor.created_at,
      },
      teamMembers,
    })
  } catch (error) {
    console.error("WORKSPACE BOOTSTRAP API ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to load workspace bootstrap." },
      { status: 500 }
    )
  }
}
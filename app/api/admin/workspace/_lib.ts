import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export async function getWorkspaceActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401, error: "Unauthorized" }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone_number: true,
      role: true,
      admin_role: true,
      is_admin: true,
      is_blocked: true,
      can_manage_workspace_members: true,
      can_create_workspace_channels: true,
      can_manage_workspace_channels: true,
      can_manage_hidden_channels: true,
      can_manage_workspace_notes: true,
      can_create_shared_notes: true,
      can_create_workspace_polls: true,
      can_send_workspace_wake_alerts: true,
      can_view_workspace_member_details: true,
      can_manage_all_workspace: true,
      workspace_status: true,
      last_login_at: true,
      last_active_at: true,
      created_at: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin" && profile.role !== "super_admin")) {
    return { ok: false as const, status: 403, error: "Forbidden" }
  }

  const isSuperAdmin =
    profile.can_manage_all_workspace ||
    profile.admin_role === "super_admin" ||
    profile.role === "super_admin"

  return {
    ok: true as const,
    actor: {
      ...profile,
      isSuperAdmin,
    },
  }
}

export async function getWorkspaceSettings() {
  return prisma.workspace_settings.upsert({
    where: { slug: "global" },
    update: {
      updated_at: new Date(),
    },
    create: {
      slug: "global",
    },
    select: {
      id: true,
      slug: true,
      allow_note_creation: true,
      allow_shared_note_creation: true,
      allow_channel_creation: true,
      allow_hidden_channel_creation: true,
      allow_poll_creation: true,
      allow_wake_alerts: true,
      created_at: true,
      updated_at: true,
    },
  })
}

export async function getOrCreateInternalWorkspaceTeam() {
  return prisma.workspace_teams.upsert({
    where: { slug: "internal-admin-team" },
    update: {
      updated_at: new Date(),
    },
    create: {
      slug: "internal-admin-team",
      name: "Internal Admin Team",
      description: "Core internal workspace for admins and editors",
      is_system: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      is_system: true,
      created_at: true,
      updated_at: true,
    },
  })
}

export async function ensureWorkspaceSeedData() {
  const team = await getOrCreateInternalWorkspaceTeam()
  const settings = await getWorkspaceSettings()

  const defaultChannels = [
    {
      slug: "general",
      name: "general",
      description: "General admin workspace communication",
      is_default: true,
      icon_symbol: "#",
      color_hex: "#6366f1",
    },
    {
      slug: "announcements",
      name: "announcements",
      description: "Important internal announcements",
      is_default: false,
      icon_symbol: "📢",
      color_hex: "#16a34a",
    },
  ]

  for (const channel of defaultChannels) {
    await prisma.workspace_channels.upsert({
      where: {
        team_id_slug: {
          team_id: team.id,
          slug: channel.slug,
        },
      },
      update: {
        updated_at: new Date(),
      },
      create: {
        team_id: team.id,
        slug: channel.slug,
        name: channel.name,
        description: channel.description,
        is_default: channel.is_default,
        is_private: false,
        is_hidden: false,
        icon_symbol: channel.icon_symbol,
        color_hex: channel.color_hex,
      },
    })
  }

  const admins = await prisma.profiles.findMany({
    where: {
      is_blocked: false,
      OR: [{ is_admin: true }, { role: "admin" }, { role: "super_admin" }],
    },
    select: {
      id: true,
      role: true,
      admin_role: true,
    },
  })

  if (admins.length > 0) {
    await prisma.workspace_team_members.createMany({
      data: admins.map((member) => ({
        team_id: team.id,
        user_id: member.id,
        team_role: member.admin_role || member.role || "member",
      })),
      skipDuplicates: true,
    })
  }

  return { team, settings }
}

export async function findAccessibleChannelBySlug(
  slug: string,
  actorId: string,
  isSuperAdmin: boolean
) {
  return prisma.workspace_channels.findFirst({
    where: {
      slug,
      deleted_at: null,
      is_archived: false,
      OR: [
        { is_hidden: false },
        { created_by: actorId },
        { members: { some: { user_id: actorId } } },
        ...(isSuperAdmin ? [{}] : []),
      ],
    },
    select: {
      id: true,
      team_id: true,
      slug: true,
      name: true,
      description: true,
      is_hidden: true,
      is_private: true,
      is_default: true,
      icon_symbol: true,
      color_hex: true,
      created_by: true,
    },
  })
}

export async function findAccessibleChannelById(
  id: string,
  actorId: string,
  isSuperAdmin: boolean
) {
  return prisma.workspace_channels.findFirst({
    where: {
      id,
      deleted_at: null,
      is_archived: false,
      OR: [
        { is_hidden: false },
        { created_by: actorId },
        { members: { some: { user_id: actorId } } },
        ...(isSuperAdmin ? [{}] : []),
      ],
    },
    select: {
      id: true,
      team_id: true,
      slug: true,
      name: true,
      description: true,
      is_hidden: true,
      is_private: true,
      is_default: true,
      icon_symbol: true,
      color_hex: true,
      created_by: true,
    },
  })
}

export async function findAccessibleNoteById(
  noteId: string,
  actorId: string,
  isSuperAdmin: boolean
) {
  const note = await prisma.workspace_notes.findUnique({
    where: { id: noteId },
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
    },
  })

  if (!note) return null
  if (!isSuperAdmin && note.status !== "active") return null

  const canAccess =
    isSuperAdmin ||
    note.owner_id === actorId ||
    note.visibility === "shared" ||
    note.recipient_ids.includes(actorId)

  return canAccess ? note : null
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function normalizeColorHex(value: string | null | undefined) {
  const raw = (value || "").trim()
  if (!raw) return "#6366f1"
  const normalized = raw.startsWith("#") ? raw : `#${raw}`
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "#6366f1"
}

export function normalizeChannelSymbol(value: string | null | undefined) {
  const raw = (value || "").trim()
  return raw ? raw.slice(0, 2) : "#"
}

export function canEditWithin(createdAt: Date, minutes: number) {
  const now = Date.now()
  const created = new Date(createdAt).getTime()
  return now - created <= minutes * 60 * 1000
}
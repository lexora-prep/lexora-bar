import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

type AdminProfileAccess = {
  admin_role: string | null
  can_manage_questions: boolean
  can_manage_rules: boolean
  can_manage_users: boolean
  can_manage_announcements: boolean
  can_view_billing: boolean
  can_manage_coupons: boolean
  can_manage_settings: boolean
  can_view_audit_log: boolean
}

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
      admin_role: true,
      is_blocked: true,
      full_name: true,
      email: true,
      can_manage_questions: true,
      can_manage_rules: true,
      can_manage_users: true,
      can_manage_announcements: true,
      can_view_billing: true,
      can_manage_coupons: true,
      can_manage_settings: true,
      can_view_audit_log: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    userId: user.id,
    name: profile.full_name || profile.email || "Admin",
    adminRole: profile.admin_role || "admin",
    profile,
  }
}

function getAudienceGroups(profile: AdminProfileAccess) {
  const groups = new Set<string>(["all_admins"])

  if (profile.admin_role === "super_admin") groups.add("super_admin_only")
  if (profile.admin_role === "admin" || profile.admin_role === "super_admin") groups.add("admins_only")
  if (profile.admin_role === "editor") groups.add("editors_only")

  if (profile.can_manage_questions || profile.can_manage_rules || profile.admin_role === "editor") {
    groups.add("content_team")
  }

  if (profile.can_view_billing || profile.can_manage_coupons) {
    groups.add("billing_team")
  }

  return Array.from(groups)
}

function getProfileGroups(profile: AdminProfileAccess) {
  return getAudienceGroups(profile)
}

async function resolveBroadcastRecipients(audience: string): Promise<string[]> {
  const profiles = await prisma.profiles.findMany({
    where: {
      deleted_at: null,
      is_blocked: false,
      OR: [{ is_admin: true }, { role: "admin" }],
    },
    select: {
      id: true,
      admin_role: true,
      can_manage_questions: true,
      can_manage_rules: true,
      can_manage_users: true,
      can_manage_announcements: true,
      can_view_billing: true,
      can_manage_coupons: true,
      can_manage_settings: true,
      can_view_audit_log: true,
    },
  })

  return profiles
    .filter((profile) => getProfileGroups(profile).includes(audience))
    .map((profile) => profile.id)
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const isSuperAdmin = auth.adminRole === "super_admin"
    const myGroups = getAudienceGroups(auth.profile)

    const allNotes = await prisma.admin_notes.findMany({
      orderBy: [{ is_pinned: "desc" }, { priority: "desc" }, { created_at: "desc" }],
      take: 100,
    })

    const notes = allNotes.filter((note) => {
      if (isSuperAdmin) return true
      if (note.author_id === auth.userId) return true
      if (Array.isArray(note.recipient_ids) && note.recipient_ids.includes(auth.userId)) return true
      if (note.audience && myGroups.includes(note.audience)) return true
      return false
    })

    const peopleIds = [
      ...new Set(
        notes.flatMap((n) => [n.author_id, n.assignee_id, ...(n.recipient_ids || [])].filter(Boolean) as string[])
      ),
    ]

    const people =
      peopleIds.length > 0
        ? await prisma.profiles.findMany({
            where: { id: { in: peopleIds } },
            select: {
              id: true,
              full_name: true,
              email: true,
              admin_role: true,
            },
          })
        : []

    const peopleMap = new Map(
      people.map((p) => [
        p.id,
        {
          name: p.full_name || p.email || "Admin",
          admin_role: p.admin_role || "admin",
        },
      ])
    )

    const noteIds = notes.map((n) => n.id)

    const [comments, reactions] =
      noteIds.length > 0
        ? await Promise.all([
            prisma.admin_note_comments.findMany({
              where: { note_id: { in: noteIds } },
              select: {
                id: true,
                note_id: true,
              },
            }),
            prisma.admin_note_reactions.findMany({
              where: { note_id: { in: noteIds } },
              select: {
                id: true,
                note_id: true,
                user_id: true,
                emoji: true,
              },
            }),
          ])
        : [[], []]

    return NextResponse.json({
      notes: notes.map((note) => {
        const noteComments = comments.filter((c) => c.note_id === note.id)
        const noteReactions = reactions.filter((r) => r.note_id === note.id)

        return {
          ...note,
          author_name: peopleMap.get(note.author_id)?.name || "Admin",
          author_role: peopleMap.get(note.author_id)?.admin_role || "admin",
          assignee_name: note.assignee_id ? peopleMap.get(note.assignee_id)?.name || "Unknown" : null,
          recipient_names: Array.isArray(note.recipient_ids)
            ? note.recipient_ids.map((id) => peopleMap.get(id)?.name).filter(Boolean)
            : [],
          checked_count: Array.isArray(note.checked_by) ? note.checked_by.length : 0,
          is_checked_by_me: Array.isArray(note.checked_by) ? note.checked_by.includes(auth.userId) : false,
          comments_count: noteComments.length,
          reactions_count: noteReactions.length,
          my_reactions: noteReactions.filter((r) => r.user_id === auth.userId).map((r) => r.emoji),
        }
      }),
    })
  } catch (err: any) {
    console.error("ADMIN NOTES GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Failed to load notes." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const body = await req.json()

    const title = String(body?.title || "").trim()
    const noteBody = String(body?.body || "").trim()
    const priority = String(body?.priority || "normal").trim().toLowerCase()
    const status = String(body?.status || "open").trim().toLowerCase()
    const sendMode = String(body?.send_mode || "broadcast").trim().toLowerCase()
    const audience = String(body?.audience || "all_admins").trim().toLowerCase()
    const assigneeIdRaw = String(body?.assignee_id || "").trim()
    const assignee_id = assigneeIdRaw || null
    const isPinned = !!body?.is_pinned
    const confidential = !!body?.confidential
    const recipient_ids: string[] = Array.isArray(body?.recipient_ids)
  ? body.recipient_ids
      .filter((id: unknown): id is string | number => typeof id === "string" || typeof id === "number")
      .map((id: string | number) => String(id).trim())
      .filter((id: string) => id.length > 0)
  : []
    const dueAtRaw = String(body?.due_at || "").trim()
    const due_at = dueAtRaw ? new Date(dueAtRaw) : null

    if (!noteBody) {
      return NextResponse.json({ error: "Note body is required." }, { status: 400 })
    }

    if (!["low", "normal", "high", "urgent"].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 })
    }

    if (!["open", "in_progress", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 })
    }

    if (!["broadcast", "direct"].includes(sendMode)) {
      return NextResponse.json({ error: "Invalid send mode." }, { status: 400 })
    }

    if (
      ![
        "all_admins",
        "super_admin_only",
        "admins_only",
        "editors_only",
        "content_team",
        "billing_team",
      ].includes(audience)
    ) {
      return NextResponse.json({ error: "Invalid audience." }, { status: 400 })
    }

    if (due_at && Number.isNaN(due_at.getTime())) {
      return NextResponse.json({ error: "Invalid due date." }, { status: 400 })
    }

    if (assignee_id) {
      const assignee = await prisma.profiles.findUnique({
        where: { id: assignee_id },
        select: { id: true },
      })

      if (!assignee) {
        return NextResponse.json({ error: "Assignee not found." }, { status: 404 })
      }
    }

    if (sendMode === "direct" && recipient_ids.length === 0) {
      return NextResponse.json({ error: "Select at least one direct recipient." }, { status: 400 })
    }

    if (sendMode === "direct") {
      const recipients = await prisma.profiles.findMany({
        where: { id: { in: recipient_ids } },
        select: { id: true },
      })

      if (recipients.length !== recipient_ids.length) {
        return NextResponse.json({ error: "One or more recipients were not found." }, { status: 404 })
      }
    }

    const finalAudience = sendMode === "direct" ? "all_admins" : audience
    const finalRecipientIds: string[] = sendMode === "direct" ? recipient_ids : []

    const note = await prisma.admin_notes.create({
      data: {
        author_id: auth.userId,
        title: title || null,
        body: noteBody,
        priority,
        status,
        audience: finalAudience,
        recipient_ids: finalRecipientIds,
        confidential,
        assignee_id,
        due_at,
        is_pinned: isPinned,
        checked_by: [],
      },
    })

    const recipientUserIds: string[] =
      sendMode === "direct" ? finalRecipientIds : await resolveBroadcastRecipients(finalAudience)

    const notificationUserIds: string[] = Array.from(
      new Set(
        recipientUserIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0 && id !== auth.userId
        )
      )
    )

    if (notificationUserIds.length > 0) {
      await prisma.admin_notifications.createMany({
        data: notificationUserIds.map((userId) => ({
          user_id: userId,
          type: "admin_note",
          title: title || "New internal note",
          body: noteBody.slice(0, 160),
          link: "/admin/notes",
          is_read: false,
        })),
      })
    }

    return NextResponse.json({ ok: true, note })
  } catch (err: any) {
    console.error("ADMIN NOTES POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Failed to create note." }, { status: 500 })
  }
}
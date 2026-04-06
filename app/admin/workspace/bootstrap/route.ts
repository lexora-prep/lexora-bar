import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        admin_role: true,
        is_admin: true,
        is_blocked: true,
      },
    })

    if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const channels = await prisma.workspace_channels.findMany({
      orderBy: [{ is_default: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    })

    const teams = await prisma.workspace_teams.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    })

    const notesRaw = await prisma.admin_notes.findMany({
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        body: true,
      },
    })

    const adminProfiles = await prisma.profiles.findMany({
      where: {
        is_blocked: false,
        OR: [{ is_admin: true }, { role: "admin" }],
      },
      orderBy: [{ admin_role: "asc" }, { full_name: "asc" }],
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        admin_role: true,
      },
      take: 30,
    })

    const statusCycle: Array<"online" | "away" | "busy" | "offline"> = [
      "online",
      "online",
      "away",
      "busy",
      "offline",
    ]

    const teamMembers = adminProfiles.map((member, index) => ({
      id: member.id,
      name: member.full_name?.trim() || member.email.split("@")[0],
      role: member.role || "admin",
      title: member.admin_role || member.role || "admin",
      status: member.id === profile.id ? "online" : statusCycle[index % statusCycle.length],
    }))

    const directMembers = adminProfiles
      .filter((member) => member.id !== profile.id)
      .map((member, index) => ({
        id: member.id,
        name: member.full_name?.trim() || member.email.split("@")[0],
        role: member.role || "admin",
        title: member.admin_role || member.role || "admin",
        status: statusCycle[index % statusCycle.length],
      }))

    const notes = notesRaw.map((note) => ({
      id: note.id,
      title: note.title?.trim() || "Untitled note",
      description: note.body?.trim() ? note.body.trim().slice(0, 80) : null,
      body: note.body?.trim() || null,
    }))

    return NextResponse.json({
      ok: true,
      channels,
      teams: teams.map((team) => ({
        ...team,
        member_count: teamMembers.length,
      })),
      notes,
      directMembers,
      currentUser: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        admin_role: profile.admin_role,
        role: profile.role,
        status: "online",
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
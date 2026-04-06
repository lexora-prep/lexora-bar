import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
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
      admin_role: true,
      is_blocked: true,
      full_name: true,
      email: true,
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
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params

    const note = await prisma.admin_notes.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 })
    }

    const comments = await prisma.admin_note_comments.findMany({
      where: { note_id: id },
      orderBy: { created_at: "asc" },
    })

    const authorIds = [...new Set(comments.map((c) => c.author_id))]
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
          admin_role: a.admin_role || "admin",
        },
      ])
    )

    return NextResponse.json({
      ok: true,
      comments: comments.map((comment) => ({
        ...comment,
        author_name: authorMap.get(comment.author_id)?.name || "Admin",
        author_role: authorMap.get(comment.author_id)?.admin_role || "admin",
      })),
    })
  } catch (err: any) {
    console.error("ADMIN NOTE COMMENTS GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load comments." },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = await req.json()
    const commentBody = String(body?.body || "").trim()

    if (!commentBody) {
      return NextResponse.json({ error: "Comment body is required." }, { status: 400 })
    }

    const note = await prisma.admin_notes.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 })
    }

    const comment = await prisma.admin_note_comments.create({
      data: {
        note_id: id,
        author_id: auth.userId,
        body: commentBody,
      },
    })

    return NextResponse.json({
      ok: true,
      comment: {
        ...comment,
        author_name: auth.name,
        author_role: auth.adminRole,
      },
    })
  } catch (err: any) {
    console.error("ADMIN NOTE COMMENTS POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to create comment." },
      { status: 500 }
    )
  }
}
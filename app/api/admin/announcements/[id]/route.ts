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
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      is_admin: true,
      role: true,
      is_blocked: true,
    },
  })

  if (!profile || profile.is_blocked || (!profile.is_admin && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId: user.id }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { id } = await context.params
    const body = await req.json()

    const data: any = {
      updated_at: new Date(),
    }

    if (typeof body.title === "string") data.title = body.title.trim()
    if (typeof body.body === "string") data.body = body.body.trim()
    if (typeof body.is_active === "boolean") data.is_active = body.is_active
    if ("starts_at" in body) data.starts_at = body.starts_at ? new Date(body.starts_at) : null
    if ("ends_at" in body) data.ends_at = body.ends_at ? new Date(body.ends_at) : null

    const updated = await prisma.announcements.update({
      where: { id },
      data,
    })

    return NextResponse.json({ ok: true, announcement: updated })
  } catch (err: any) {
    console.error("ADMIN ANNOUNCEMENTS PATCH ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to update announcement" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { id } = await context.params

    await prisma.announcements.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN ANNOUNCEMENTS DELETE ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to delete announcement" },
      { status: 500 }
    )
  }
}
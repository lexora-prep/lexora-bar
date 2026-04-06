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
    const action = String(body?.action || "")

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    if (id === admin.userId && (action === "block" || action === "remove_admin")) {
      return NextResponse.json(
        { error: "You cannot perform that action on your own admin account." },
        { status: 400 }
      )
    }

    const existing = await prisma.profiles.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let updated

    if (action === "block") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_blocked: true,
          updated_at: new Date(),
        },
      })
    } else if (action === "unblock") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_blocked: false,
          updated_at: new Date(),
        },
      })
    } else if (action === "make_admin") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_admin: true,
          role: "admin",
          updated_at: new Date(),
        },
      })
    } else if (action === "remove_admin") {
      updated = await prisma.profiles.update({
        where: { id },
        data: {
          is_admin: false,
          role: "user",
          updated_at: new Date(),
        },
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user: updated })
  } catch (err: any) {
    console.error("ADMIN USER PATCH ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to update user" },
      { status: 500 }
    )
  }
}
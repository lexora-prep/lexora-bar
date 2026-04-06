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

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const status = (searchParams.get("status") || "all").trim()
    const plan = (searchParams.get("plan") || "all").trim()

    const where: any = {
      deleted_at: null,
    }

    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { full_name: { contains: q, mode: "insensitive" } },
      ]
    }

    if (status === "active") {
      where.is_blocked = false
    } else if (status === "blocked") {
      where.is_blocked = true
    } else if (status === "admin") {
      where.OR = [
        ...(where.OR || []),
        { is_admin: true },
        { role: "admin" },
      ]
    } else if (status === "pending_deletion") {
      where.pending_deletion = true
    }

    if (plan !== "all") {
      where.subscription_tier = plan
    }

    const users = await prisma.profiles.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        full_name: true,
        law_school: true,
        jurisdiction: true,
        exam_month: true,
        exam_year: true,
        subscription_tier: true,
        mbe_access: true,
        role: true,
        is_admin: true,
        is_blocked: true,
        pending_deletion: true,
        deletion_requested_at: true,
        created_at: true,
        updated_at: true,
      },
      take: 200,
    })

    return NextResponse.json({ users })
  } catch (err: any) {
    console.error("ADMIN USERS GET ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load users" },
      { status: 500 }
    )
  }
}
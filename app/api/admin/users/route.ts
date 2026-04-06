import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

function daysBetween(from: Date, to: Date) {
  const diff = to.getTime() - from.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const me = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        is_admin: true,
        role: true,
        admin_role: true,
        is_blocked: true,
        can_manage_users: true,
      },
    })

    if (!me || me.is_blocked || (!me.is_admin && me.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    if (!me.can_manage_users && me.admin_role !== "super_admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams

    const q = sp.get("q")?.trim() || ""
    const status = sp.get("status")?.trim() || "all"
    const plan = sp.get("plan")?.trim() || "all"
    const jurisdiction = sp.get("jurisdiction")?.trim() || ""
    const lawSchool = sp.get("lawSchool")?.trim() || ""
    const sort = sp.get("sort")?.trim() || "newest"

    const where: any = {
      deleted_at: null,
    }

    if (q) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { law_school: { contains: q, mode: "insensitive" } },
        { jurisdiction: { contains: q, mode: "insensitive" } },
      ]
    }

    if (jurisdiction) {
      where.jurisdiction = { contains: jurisdiction, mode: "insensitive" }
    }

    if (lawSchool) {
      where.law_school = { contains: lawSchool, mode: "insensitive" }
    }

    if (plan !== "all") {
      where.subscription_tier = plan
    }

    if (status === "active") {
      where.is_blocked = false
      where.pending_deletion = false
      where.subscription_tier = {
        in: ["premium", "pro", "monthly", "annual", "pro_monthly", "pro_annual", "enterprise"],
      }
    } else if (status === "trial") {
      where.is_blocked = false
      where.pending_deletion = false
      where.subscription_tier = "trial"
    } else if (status === "churned") {
      where.is_blocked = true
    } else if (status === "cancelled") {
      where.pending_deletion = true
    } else if (status === "renewed") {
      where.is_blocked = false
      where.pending_deletion = false
      where.subscription_tier = {
        in: ["monthly", "annual", "pro_monthly", "pro_annual", "premium", "pro", "enterprise"],
      }
    }

    let orderBy: any = { created_at: "desc" }

    if (sort === "oldest") {
      orderBy = { created_at: "asc" }
    } else if (sort === "name_asc") {
      orderBy = { full_name: "asc" }
    } else if (sort === "name_desc") {
      orderBy = { full_name: "desc" }
    } else if (sort === "plan_asc") {
      orderBy = { subscription_tier: "asc" }
    } else if (sort === "plan_desc") {
      orderBy = { subscription_tier: "desc" }
    }

    const users = await prisma.profiles.findMany({
      where,
      orderBy,
      take: 500,
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
        admin_role: true,
        is_admin: true,
        is_blocked: true,
        pending_deletion: true,
        deletion_requested_at: true,
        created_at: true,
        updated_at: true,
      },
    })

    const now = new Date()

    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        ...u,
        account_age_days: daysBetween(new Date(u.created_at), now),
        last_active_at: u.updated_at,
      })),
    })
  } catch (error) {
    console.error("ADMIN USERS GET ERROR:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to load users." },
      { status: 500 }
    )
  }
}
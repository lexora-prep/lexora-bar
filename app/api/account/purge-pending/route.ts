import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)

    const profilesToPurge = await prisma.profiles.findMany({
      where: {
        pending_deletion: true,
        deletion_requested_at: {
          lte: cutoff,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
      },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase admin credentials are not configured." },
        { status: 500 }
      )
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)

    const results = []

    for (const profile of profilesToPurge) {
      const deleteResult = await adminClient.auth.admin.deleteUser(profile.id)

      if (deleteResult.error) {
        results.push({
          userId: profile.id,
          email: profile.email,
          ok: false,
          error: deleteResult.error.message,
        })
        continue
      }

      await prisma.profiles.update({
        where: { id: profile.id },
        data: {
          is_blocked: true,
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      })

      results.push({
        userId: profile.id,
        email: profile.email,
        ok: true,
      })
    }

    return NextResponse.json({
      ok: true,
      purgedCount: results.filter((r) => r.ok).length,
      results,
    })
  } catch (err: any) {
    console.error("PURGE PENDING ACCOUNTS ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
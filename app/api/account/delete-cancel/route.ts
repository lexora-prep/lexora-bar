import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        pending_deletion: true,
        deletion_requested_at: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (!profile.pending_deletion) {
      return NextResponse.json({
        ok: true,
        message: "No pending deletion request found.",
      })
    }

    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        pending_deletion: false,
        deletion_requested_at: null,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      message: "Account deletion request cancelled.",
    })
  } catch (err: any) {
    console.error("DELETE CANCEL ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
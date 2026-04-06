import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import crypto from "crypto"

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await prisma.account_deletion_requests.updateMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
      data: {
        used_at: new Date(),
      },
    })

    await prisma.account_deletion_requests.create({
      data: {
        user_id: user.id,
        email: user.email,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    })

    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        pending_deletion: true,
        deletion_requested_at: new Date(),
        updated_at: new Date(),
      },
    })

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"

    const confirmUrl = `${appUrl}/delete-account/confirm?token=${rawToken}`

    return NextResponse.json({
      ok: true,
      message: "Deletion request created.",
      devConfirmUrl: confirmUrl,
    })
  } catch (err: any) {
    console.error("DELETE REQUEST ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
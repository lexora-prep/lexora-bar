import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = body?.token

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const requestRow = await prisma.account_deletion_requests.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!requestRow) {
      return NextResponse.json({ error: "Invalid deletion token" }, { status: 404 })
    }

    if (requestRow.used_at) {
      return NextResponse.json({ error: "Deletion token already used" }, { status: 400 })
    }

    if (requestRow.expires_at.getTime() < Date.now()) {
      return NextResponse.json({ error: "Deletion token expired" }, { status: 400 })
    }

    await prisma.account_deletion_requests.update({
      where: { token_hash: tokenHash },
      data: {
        used_at: new Date(),
      },
    })

    const deletionRequestedAt = new Date()
    const scheduledDeletionAt = new Date(
      deletionRequestedAt.getTime() + 1000 * 60 * 60 * 24 * 14
    )

    await prisma.profiles.update({
      where: { id: requestRow.user_id },
      data: {
        pending_deletion: true,
        deletion_requested_at: deletionRequestedAt,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      message: "Account scheduled for deletion.",
      deletionRequestedAt: deletionRequestedAt.toISOString(),
      scheduledDeletionAt: scheduledDeletionAt.toISOString(),
    })
  } catch (err: any) {
    console.error("DELETE CONFIRM ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
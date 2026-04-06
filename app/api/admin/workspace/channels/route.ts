import { NextResponse } from "next/server"

export async function PATCH() {
  return NextResponse.json(
    { ok: false, error: "Use /api/admin/workspace/channels/[id] for channel updates." },
    { status: 400 }
  )
}
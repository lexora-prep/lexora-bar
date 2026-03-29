import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ allowed: false }, { status: 400 })
    }

    const invite = await prisma.beta_invites.findUnique({
      where: { email },
    })

    if (!invite || !invite.is_active) {
      return NextResponse.json({ allowed: false }, { status: 403 })
    }

    return NextResponse.json({ allowed: true })
  } catch (err) {
    console.error("BETA INVITE CHECK ERROR:", err)
    return NextResponse.json({ allowed: false }, { status: 500 })
  }
}
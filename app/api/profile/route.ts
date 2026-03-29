import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (!isUuid(userId)) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 })
    }

    console.log("PROFILE API userId:", userId)

    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
    })

    console.log("PROFILE API profile:", profile)

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (err: any) {
    console.error("PROFILE GET ERROR:", err)
    return NextResponse.json(
      {
        error: "failed",
        message: err?.message || "unknown error",
      },
      { status: 500 }
    )
  }
}
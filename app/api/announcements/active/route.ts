import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const now = new Date()

    const announcements = await prisma.announcements.findMany({
      where: {
        is_active: true,
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
        AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
      },
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        starts_at: true,
        ends_at: true,
      },
      take: 10,
    })

    return NextResponse.json({ announcements })
  } catch (err: any) {
    console.error("ACTIVE ANNOUNCEMENTS ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load announcements" },
      { status: 500 }
    )
  }
}
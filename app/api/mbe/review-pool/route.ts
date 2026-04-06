import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const source = searchParams.get("source")

    if (!source) {
      return NextResponse.json({
        success: false,
        error: "Missing source parameter"
      })
    }

    const subjects = await prisma.subjects.findMany({
      include: {
        topics: true
      }
    })

    return NextResponse.json({
      success: true,
      subjects
    })
  } catch (error) {
    console.error("REVIEW POOL ERROR:", error)

    return NextResponse.json({
      success: false,
      error: "Failed to load review pool"
    })
  }
}
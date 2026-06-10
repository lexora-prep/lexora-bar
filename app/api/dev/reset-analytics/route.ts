import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function productionNotFound() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

function methodNotAllowed() {
  return NextResponse.json(
    { ok: false, error: "Use POST in local development." },
    { status: 405 }
  )
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") return productionNotFound()
  return methodNotAllowed()
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") return productionNotFound()

  try {
    const userId = "demo-user"

    await prisma.user_mbe_attempts.deleteMany({
      where: { user_id: userId },
    })

    await prisma.user_rule_attempts.deleteMany({
      where: { user_id: userId },
    })

    await prisma.user_rule_progress.deleteMany({
      where: { user_id: userId },
    })

    await prisma.userRuleStat.deleteMany({
      where: { userId },
    })

    await prisma.topicProgress.deleteMany({
      where: { user_id: userId },
    })

    await prisma.userSubjectStat.deleteMany({
      where: { user_id: userId },
    })

    await prisma.userOverallStat.deleteMany({
      where: { user_id: userId },
    })

    await prisma.examSession.deleteMany({
      where: { user_id: userId },
    })

    return NextResponse.json({
      ok: true,
      success: true,
    })
  } catch (error) {
    console.error("RESET ANALYTICS ERROR:", error)

    return NextResponse.json(
      { ok: false, success: false, error: "Reset failed" },
      { status: 500 }
    )
  }
}
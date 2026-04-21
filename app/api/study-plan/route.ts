import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, error: null }
}

function normalizeDateOnly(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return null
  return date
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const body = await req.json()

    const userId = body.userId
    const startDate = normalizeDateOnly(body.startDate)
    const examDate = normalizeDateOnly(body.examDate)
    const studyWeekends = body.studyWeekends ?? true
    const offDates: string[] = Array.isArray(body.offDates) ? body.offDates : []

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!startDate || !examDate) {
      return NextResponse.json({ error: "Missing or invalid dates" }, { status: 400 })
    }

    if (startDate > examDate) {
      return NextResponse.json(
        { error: "Start date cannot be after exam date" },
        { status: 400 }
      )
    }

    let totalDays = 0
    const current = new Date(startDate)

    while (current <= examDate) {
      const currentDateString = current.toISOString().slice(0, 10)
      const isOff = offDates.includes(currentDateString)

      if (!isOff) {
        totalDays++
      }

      current.setDate(current.getDate() + 1)
    }

    if (totalDays <= 0) {
      return NextResponse.json(
        { error: "No active study days left. Remove some days off." },
        { status: 400 }
      )
    }

    const totalRules = await prisma.rules.count()
    const dailyRules = Math.max(1, Math.ceil(totalRules / totalDays))
    const dailyMBE = 50

    const plan = await prisma.studyPlan.upsert({
      where: { userId },
      update: {
        startDate,
        examDate,
        studyWeekends,
        totalDays,
        dailyRules,
        dailyMBE,
        offDates,
      },
      create: {
        userId,
        startDate,
        examDate,
        studyWeekends,
        totalDays,
        dailyRules,
        dailyMBE,
        offDates,
      },
    })

    return NextResponse.json(plan)
  } catch (err) {
    console.error("Study plan error:", err)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const plan = await prisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    if (!plan) {
      return NextResponse.json(null)
    }

    return NextResponse.json(plan)
  } catch (err) {
    console.error("GET STUDY PLAN ERROR:", err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.studyPlan.deleteMany({
      where: { userId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE STUDY PLAN ERROR:", err)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
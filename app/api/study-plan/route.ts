import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/* =========================
   POST — CREATE / UPDATE PLAN
========================= */

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const userId = body.userId
    const startDate = new Date(body.startDate)
    const examDate = new Date(body.examDate)
    const studyWeekends = body.studyWeekends ?? true
    const offDates: string[] = Array.isArray(body.offDates) ? body.offDates : []

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (
      !body.startDate ||
      !body.examDate ||
      isNaN(startDate.getTime()) ||
      isNaN(examDate.getTime())
    ) {
      return NextResponse.json({ error: "Missing or invalid dates" }, { status: 400 })
    }

    if (startDate > examDate) {
      return NextResponse.json(
        { error: "Start date cannot be after exam date" },
        { status: 400 }
      )
    }

    let totalDays = 0
    let current = new Date(startDate)

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

/* =========================
   GET — LOAD PLAN
========================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
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
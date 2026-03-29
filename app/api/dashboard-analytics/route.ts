import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {

  try {

    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const state = url.searchParams.get("state")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" })
    }

    let user = null

    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          jurisdiction: true,
        },
      })
    } catch {
      user = null
    }

    const goalMBE = 60
    const goalBLL = 20

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayMBE = 0

    try {
      todayMBE = await prisma.userMBEAttempt.count({
        where: {
          userId,
          createdAt: {
            gte: today,
          },
        },
      })
    } catch {}

    // ✅ FIXED → use user_rule_attempts
    const todayBLL = await prisma.user_rule_attempts.count({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
        },
      },
    })

    let mbeAttempts: any[] = []

    try {
      mbeAttempts = await prisma.userMBEAttempt.findMany({
        where: { userId },
        select: { isCorrect: true },
      })
    } catch {
      mbeAttempts = []
    }

    const mbeCorrect = mbeAttempts.filter((a) => a.isCorrect).length
    const mbeTotal = mbeAttempts.length

    const overallMBE =
      mbeTotal === 0 ? 0 : Math.round((mbeCorrect / mbeTotal) * 100)

    // ✅ FIXED → use user_rule_progress
    const ruleStats = await prisma.user_rule_progress.findMany({
      where: { user_id: userId },
      select: {
        correct_count: true,
        attempts: true,
      },
    })

    const ruleCorrect = ruleStats.reduce(
      (sum, r) => sum + r.correct_count,
      0
    )

    const ruleTotal = ruleStats.reduce(
      (sum, r) => sum + r.attempts,
      0
    )

    const overallBLL =
      ruleTotal === 0 ? 0 : Math.round((ruleCorrect / ruleTotal) * 100)

    let stateUsers: any[] = []

    try {
      stateUsers = await prisma.user.findMany({
        where: {
          jurisdiction: state || user?.jurisdiction || undefined,
        },
        select: { id: true },
      })
    } catch {
      stateUsers = []
    }

    const stateUserIds = stateUsers.map(u => u.id)

    let stateAttempts: any[] = []

    try {
      stateAttempts = await prisma.userMBEAttempt.findMany({
        where: {
          userId: { in: stateUserIds },
        },
        select: {
          isCorrect: true,
        },
      })
    } catch {
      stateAttempts = []
    }

    const stateCorrect = stateAttempts.filter(a => a.isCorrect).length
    const stateTotal = stateAttempts.length

    const stateMBEAvg =
      stateTotal === 0 ? 0 : Math.round((stateCorrect / stateTotal) * 100)

    // ✅ FIXED → state BLL
    const stateRuleStats = await prisma.user_rule_progress.findMany({
      where: {
        user_id: { in: stateUserIds }
      },
      select: {
        correct_count: true,
        attempts: true
      }
    })

    const stateRuleCorrect = stateRuleStats.reduce(
      (sum, r) => sum + r.correct_count,
      0
    )

    const stateRuleTotal = stateRuleStats.reduce(
      (sum, r) => sum + r.attempts,
      0
    )

    const stateBLLAvg =
      stateRuleTotal === 0 ? 0 :
      Math.round((stateRuleCorrect / stateRuleTotal) * 100)

    const prevMBE = overallMBE
    const prevBLL = overallBLL

    /* =========================
       🔥 STREAK LOGIC
    ========================= */

    const days: Date[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      d.setHours(0, 0, 0, 0)
      days.push(d)
    }

    const streakDays: any[] = []

    let currentStreak = 0

    for (let i = 0; i < days.length; i++) {

      const start = days[i]
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)

      let dayMBE = 0

      try {
        dayMBE = await prisma.userMBEAttempt.count({
          where: {
            userId,
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        })
      } catch {}

      // ✅ FIXED → rule attempts
      const dayBLL = await prisma.user_rule_attempts.count({
        where: {
          user_id: userId,
          created_at: {
            gte: start,
            lte: end,
          },
        },
      })

      const completed = dayMBE > 0 || dayBLL > 0

      if (completed) {
        streakDays.push({ status: "fire" })
      } else if (start < today) {
        streakDays.push({ status: "ice" })
      } else {
        streakDays.push({ status: "empty" })
      }
    }

    for (let i = streakDays.length - 1; i >= 0; i--) {
      if (streakDays[i].status === "fire") {
        currentStreak++
      } else {
        break
      }
    }

    const bestStreak = currentStreak

    return NextResponse.json({
      todayMBE,
      todayBLL,

      goalMBE,
      goalBLL,

      overallMBE,
      overallBLL,

      totalMBEQuestions: mbeTotal,
      mbeAccuracy: overallMBE,
      bllScore: overallBLL,
      ruleAttempts: todayBLL,

      prevMBE,
      prevBLL,

      userMBE: overallMBE,
      userBLL: overallBLL,
      stateMBEAvg,
      stateBLLAvg,

      streak: currentStreak,
      bestStreak,
      streakDays,
    })

  } catch (error) {

    console.error("Dashboard analytics error:", error)

    return NextResponse.json({
      todayMBE: 0,
      todayBLL: 0,
      goalMBE: 60,
      goalBLL: 20,
      overallMBE: 0,
      overallBLL: 0,
      totalMBEQuestions: 0,
      mbeAccuracy: 0,
      bllScore: 0,
      ruleAttempts: 0,
      prevMBE: 0,
      prevBLL: 0,
      userMBE: 0,
      userBLL: 0,
      stateMBEAvg: 0,
      stateBLLAvg: 0,
      streak: 0,
      bestStreak: 0,
      streakDays: [],
    })

  }

}
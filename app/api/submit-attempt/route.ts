import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("🔥 SUBMIT API HIT", body)

    const ruleId = body.ruleId
    const userAnswer = body.userAnswer
    const userId = body.userId
    const trainingMode = body.trainingMode || "study"

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId", score: 0, missedBuzzwords: [] },
        { status: 400 }
      )
    }

    if (!ruleId || !userAnswer) {
      return NextResponse.json({
        score: 0,
        missedBuzzwords: []
      })
    }

    const { data: rule, error } = await supabase
      .from("rules")
      .select("buzzwords")
      .eq("id", ruleId)
      .single()

    if (error || !rule) {
      return NextResponse.json({
        score: 0,
        missedBuzzwords: []
      })
    }

    const buzzwords: string[] = Array.isArray(rule.buzzwords) ? rule.buzzwords : []
    const normalized = String(userAnswer).toLowerCase()

    const matched = buzzwords.filter((w) =>
      normalized.includes(String(w).toLowerCase())
    )

    const missed = buzzwords.filter((w) =>
      !normalized.includes(String(w).toLowerCase())
    )

    const score =
      buzzwords.length === 0
        ? 0
        : Math.round((matched.length / buzzwords.length) * 100)

    await prisma.user_rule_attempts.create({
      data: {
        user_id: userId,
        rule_id: ruleId,
        score,
        missed_buzzwords: missed
      }
    })

    console.log("✅ ATTEMPT SAVED")

    const attempts = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
        rule_id: ruleId
      },
      orderBy: {
        created_at: "desc"
      },
      take: 10
    })

    const scores = attempts.map((a) => a.score)
    const totalAttempts = scores.length

    const averageScore =
      totalAttempts === 0
        ? 0
        : Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts)

    const correctAttempts = scores.filter((s) => s >= 80).length

    const accuracyRatio =
      totalAttempts === 0 ? 0 : correctAttempts / totalAttempts

    const recentAttempts = scores.slice(0, 3)

    const recentAverage =
      recentAttempts.length === 0
        ? 0
        : Math.round(
            recentAttempts.reduce((a, b) => a + b, 0) /
            recentAttempts.length
          )

    const masteryScore = Math.round(
      averageScore * 0.6 +
      accuracyRatio * 100 * 0.3 +
      recentAverage * 0.1
    )

    let masteryLevel = "CRITICAL"

    if (masteryScore >= 80) masteryLevel = "MASTERED"
    else if (masteryScore >= 60) masteryLevel = "IMPROVING"
    else if (masteryScore >= 30) masteryLevel = "NEEDS_WORK"

    const progress = await prisma.user_rule_progress.findFirst({
      where: {
        user_id: userId,
        rule_id: ruleId
      }
    })

    let intervalDays = progress?.interval_days ?? 1

    if (score >= 80) {
      intervalDays = intervalDays * 2
    } else if (score >= 60) {
      intervalDays = intervalDays + 1
    } else {
      intervalDays = 1
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervalDays)

    if (progress) {
      await prisma.user_rule_progress.update({
        where: {
          user_id_rule_id: {
            user_id: userId,
            rule_id: ruleId
          }
        },
        data: {
          attempts: { increment: 1 },
          correct_count: { increment: score >= 80 ? 1 : 0 },
          incorrect_count: { increment: score < 80 ? 1 : 0 },
          last_score: score,
          rolling_average: averageScore,
          mastery_level: masteryScore,
          last_reviewed: new Date(),
          next_review_at: nextReview,
          interval_days: intervalDays
        }
      })

      console.log("✅ PROGRESS UPDATED")
    } else {
      await prisma.user_rule_progress.create({
        data: {
          user_id: userId,
          rule_id: ruleId,
          attempts: 1,
          correct_count: score >= 80 ? 1 : 0,
          incorrect_count: score >= 80 ? 0 : 1,
          last_score: score,
          rolling_average: averageScore,
          mastery_level: masteryScore,
          last_reviewed: new Date(),
          next_review_at: nextReview,
          interval_days: intervalDays
        }
      })

      console.log("✅ PROGRESS CREATED")
    }

    return NextResponse.json({
      score,
      masteryScore,
      masteryLevel,
      missedBuzzwords: missed,
      trainingMode
    })
  } catch (err) {
    console.error("SUBMIT ATTEMPT ERROR:", err)

    return NextResponse.json(
      {
        score: 0,
        missedBuzzwords: []
      },
      { status: 500 }
    )
  }
}
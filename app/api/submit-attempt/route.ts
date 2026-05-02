import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeExerciseMode(value: unknown) {
  const mode = String(value ?? "").trim().toLowerCase()

  if (mode === "typing") return "typing"
  if (mode === "fillblank" || mode === "fill_blank") return "fillblank"
  if (mode === "buzzwords" || mode === "buzzword") return "buzzwords"
  if (mode === "ordering") return "ordering"
  if (mode === "flashcard" || mode === "flashcards") return "flashcard"

  return "typing"
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  return null
}

function normalizeLoose(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stemLoose(word: string) {
  const clean = normalizeLoose(word)
  if (clean.length <= 3) return clean

  return clean
    .replace(/ies$/, "y")
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/es$/, "")
    .replace(/s$/, "")
}

const KEYWORD_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "when", "while", "unless",
  "to", "of", "in", "on", "for", "from", "with", "without", "by", "as", "at",
  "is", "are", "was", "were", "be", "been", "being", "may", "must", "shall",
  "can", "could", "would", "should", "will", "only", "also", "generally",
  "usually", "typically", "under", "that", "this", "these", "those"
])

function meaningfulKeywordTokens(value: string) {
  return normalizeLoose(value)
    .split(/\s+/)
    .map(stemLoose)
    .filter((word) => word.length > 2 && !KEYWORD_STOPWORDS.has(word))
}

function flexibleKeywordMatch(answer: string, keyword: string) {
  const normalizedAnswer = normalizeLoose(answer)
  const normalizedKeyword = normalizeLoose(keyword)

  if (!normalizedAnswer || !normalizedKeyword) return false

  // Exact phrase still counts.
  if (normalizedAnswer.includes(normalizedKeyword)) return true

  // Flexible phrase counts when all meaningful legal words appear,
  // even if the saved buzzword order is imperfect.
  const answerTokens = new Set(
    normalizedAnswer
      .split(/\s+/)
      .map(stemLoose)
      .filter(Boolean)
  )

  const keywordTokens = meaningfulKeywordTokens(keyword)

  if (keywordTokens.length === 0) return false

  return keywordTokens.every((token) => answerTokens.has(token))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("🔥 SUBMIT API HIT", body)

    const ruleId = body.ruleId
    const userAnswer = body.userAnswer
    const userId = body.userId
    const exerciseMode = normalizeExerciseMode(body.mode ?? body.exerciseMode)

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId", score: 0, missedBuzzwords: [] },
        { status: 400 }
      )
    }

    if (!ruleId) {
      return NextResponse.json({
        score: 0,
        missedBuzzwords: [],
      })
    }

    const { data: rule, error } = await supabase
      .from("rules")
      .select("buzzwords, rule_text")
      .eq("id", ruleId)
      .single()

    if (error || !rule) {
      return NextResponse.json({
        score: 0,
        missedBuzzwords: [],
      })
    }

    const buzzwords: string[] = Array.isArray(rule.buzzwords) ? rule.buzzwords : []
    const answerText = String(userAnswer ?? "")
    const normalizedAnswer = normalizeLoose(answerText)
    const normalizedRuleText = normalizeLoose(String(rule.rule_text ?? ""))

    const fullRuleMatched =
      Boolean(normalizedAnswer && normalizedRuleText) &&
      (
        normalizedAnswer.includes(normalizedRuleText) ||
        (
          normalizedRuleText.includes(normalizedAnswer) &&
          normalizedAnswer.length >= normalizedRuleText.length * 0.92
        )
      )

    const computedMatched = fullRuleMatched
      ? buzzwords
      : buzzwords.filter((w) => flexibleKeywordMatch(answerText, String(w)))

    const computedMissed = fullRuleMatched
      ? []
      : buzzwords.filter((w) => !flexibleKeywordMatch(answerText, String(w)))

    const computedScore =
      buzzwords.length === 0
        ? 0
        : fullRuleMatched
          ? 100
          : Math.round((computedMatched.length / buzzwords.length) * 100)

    const matchedKeywordsOverride = toStringArray(body.matchedKeywordsOverride)
    const missedKeywordsOverride = toStringArray(body.missedKeywordsOverride)

    const matchedKeywords =
      matchedKeywordsOverride.length > 0 ? matchedKeywordsOverride : computedMatched

    const missedKeywords =
      Array.isArray(body.missedKeywordsOverride) ? missedKeywordsOverride : computedMissed

    const scoreOverride = toNumberOrNull(body.scoreOverride)
    const keywordScoreOverride = toNumberOrNull(body.keywordScoreOverride)
    const similarityOverride = toNumberOrNull(body.similarityOverride)

    const score = scoreOverride ?? computedScore
    const keywordScore = keywordScoreOverride ?? score
    const similarity = similarityOverride ?? Math.min(100, Math.round(score * 0.55))

    await prisma.user_rule_attempts.create({
      data: {
        user_id: userId,
        rule_id: ruleId,
        score,
        training_mode: exerciseMode,
        missed_buzzwords: missedKeywords,
      },
    })

    console.log("✅ ATTEMPT SAVED")

    const attempts = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: userId,
        rule_id: ruleId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
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
      averageScore * 0.6 + accuracyRatio * 100 * 0.3 + recentAverage * 0.1
    )

    let masteryLevel = "CRITICAL"

    if (masteryScore >= 80) masteryLevel = "MASTERED"
    else if (masteryScore >= 60) masteryLevel = "IMPROVING"
    else if (masteryScore >= 30) masteryLevel = "NEEDS_WORK"

    const progress = await prisma.user_rule_progress.findFirst({
      where: {
        user_id: userId,
        rule_id: ruleId,
      },
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
            rule_id: ruleId,
          },
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
          interval_days: intervalDays,
        },
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
          interval_days: intervalDays,
        },
      })

      console.log("✅ PROGRESS CREATED")
    }

    return NextResponse.json({
      score,
      masteryScore,
      masteryLevel,
      matched_keywords: matchedKeywords,
      missed_keywords: missedKeywords,
      keywordScore,
      similarity,
      missedBuzzwords: missedKeywords,
      exerciseMode,
    })
  } catch (err) {
    console.error("SUBMIT ATTEMPT ERROR:", err)

    return NextResponse.json(
      {
        score: 0,
        missedBuzzwords: [],
      },
      { status: 500 }
    )
  }
}
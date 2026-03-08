import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const ruleId = body.ruleId
    const userAnswer = body.userAnswer

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

    const buzzwords: string[] = rule.buzzwords || []

    const normalized = userAnswer.toLowerCase()

    const matched = buzzwords.filter((w) =>
      normalized.includes(w.toLowerCase())
    )

    const missed = buzzwords.filter((w) =>
      !normalized.includes(w.toLowerCase())
    )

    const score =
      buzzwords.length === 0
        ? 0
        : Math.round((matched.length / buzzwords.length) * 100)

    return NextResponse.json({
      score: score,
      missedBuzzwords: missed
    })
  } catch (err) {
    return NextResponse.json({
      score: 0,
      missedBuzzwords: []
    })
  }
}
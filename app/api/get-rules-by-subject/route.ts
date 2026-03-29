import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId missing" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("rules")
      .select("id, title, rule_text, buzzwords, topic_id, subtopic_id")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const topicIds = [...new Set((data ?? []).map((rule: any) => rule.topic_id).filter(Boolean))]

    let topicMap: Record<string, string> = {}

    if (topicIds.length > 0) {
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("id, name")
        .in("id", topicIds)

      if (topicsError) {
        console.error("Topics lookup error:", topicsError)
      } else {
        topicMap = Object.fromEntries((topicsData ?? []).map((t: any) => [t.id, t.name]))
      }
    }

    const normalized = (data ?? []).map((rule: any) => ({
      id: rule.id,
      title: rule.title,
      rule_text: rule.rule_text,
      keywords: Array.isArray(rule.buzzwords)
        ? rule.buzzwords
        : typeof rule.buzzwords === "string"
          ? [rule.buzzwords]
          : [],
      topic: topicMap[rule.topic_id] ?? "",
      topic_id: rule.topic_id,
      subtopic_id: rule.subtopic_id,
    }))

    return NextResponse.json(normalized)
  } catch (err) {
    console.error("API crash:", err)

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}
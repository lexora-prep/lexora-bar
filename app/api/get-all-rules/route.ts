import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("rules")
      .select("id, title, rule_text, buzzwords, subject_id, topic_id, subtopic_id")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const topicIds = [...new Set((data ?? []).map((r: any) => r.topic_id).filter(Boolean))]
    const subjectIds = [...new Set((data ?? []).map((r: any) => r.subject_id).filter(Boolean))]

    let topicMap: Record<string, string> = {}
    let subjectMap: Record<string, string> = {}

    // 🔹 LOAD TOPICS
    if (topicIds.length > 0) {
      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, name")
        .in("id", topicIds)

      topicMap = Object.fromEntries((topicsData ?? []).map((t: any) => [t.id, t.name]))
    }

    // 🔹 LOAD SUBJECTS
    if (subjectIds.length > 0) {
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds)

      subjectMap = Object.fromEntries((subjectsData ?? []).map((s: any) => [s.id, s.name]))
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
      subject_id: rule.subject_id,
      subject: subjectMap[rule.subject_id] ?? "",
      topic_id: rule.topic_id,
      topic: topicMap[rule.topic_id] ?? "",
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
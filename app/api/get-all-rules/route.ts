import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean)
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function cleanId(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

export async function GET() {
  try {
    const { data: rulesData, error: rulesError } = await supabase
      .from("rules")
      .select("*")

    if (rulesError) {
      console.error("GET ALL RULES ERROR:", rulesError)
      return NextResponse.json(
        { error: rulesError.message },
        { status: 500 }
      )
    }

    const rules = Array.isArray(rulesData) ? rulesData : []

    const subjectIds = Array.from(
      new Set(
        rules
          .map((rule: any) => cleanId(rule.subject_id))
          .filter(Boolean)
      )
    )

    const topicIds = Array.from(
      new Set(
        rules
          .map((rule: any) => cleanId(rule.topic_id))
          .filter(Boolean)
      )
    )

    const subtopicIds = Array.from(
      new Set(
        rules
          .map((rule: any) => cleanId(rule.subtopic_id))
          .filter(Boolean)
      )
    )

    let subjectMap: Record<string, string> = {}
    let topicMap: Record<string, string> = {}
    let subtopicMap: Record<string, string> = {}

    if (subjectIds.length > 0) {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds)

      if (subjectsError) {
        console.error("GET SUBJECT MAP ERROR:", subjectsError)
      } else {
        subjectMap = Object.fromEntries(
          (subjectsData ?? []).map((row: any) => [
            cleanId(row.id),
            cleanString(row.name),
          ])
        )
      }
    }

    if (topicIds.length > 0) {
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("id, name, subject_id")
        .in("id", topicIds)

      if (topicsError) {
        console.error("GET TOPIC MAP ERROR:", topicsError)
      } else {
        topicMap = Object.fromEntries(
          (topicsData ?? []).map((row: any) => [
            cleanId(row.id),
            cleanString(row.name),
          ])
        )
      }
    }

    if (subtopicIds.length > 0) {
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from("subtopics")
        .select("id, name")
        .in("id", subtopicIds)

      if (subtopicsError) {
        console.error("GET SUBTOPIC MAP ERROR:", subtopicsError)
      } else {
        subtopicMap = Object.fromEntries(
          (subtopicsData ?? []).map((row: any) => [
            cleanId(row.id),
            cleanString(row.name),
          ])
        )
      }
    }

    const normalized = rules
      .map((rule: any) => {
        const rawSubjectId = cleanId(rule.subject_id)
        const rawTopicId = cleanId(rule.topic_id)
        const rawSubtopicId = cleanId(rule.subtopic_id)

        const rawSubjectName = cleanString(
          rule.subject ?? rule.subject_name ?? rule.subject_title
        )

        const rawTopicName = cleanString(
          rule.topic ?? rule.topic_name ?? rule.topic_title
        )

        const rawSubtopicName = cleanString(
          rule.subtopic ?? rule.subtopic_name ?? rule.subtopic_title
        )

        const subjectName = subjectMap[rawSubjectId] || rawSubjectName
        const topicName = topicMap[rawTopicId] || rawTopicName
        const subtopicName = subtopicMap[rawSubtopicId] || rawSubtopicName

        return {
          id: cleanId(rule.id),
          title: cleanString(rule.title),
          rule_text: cleanString(rule.rule_text),
          keywords: normalizeKeywords(rule.keywords ?? rule.buzzwords),
          subject_id: rawSubjectId,
          subject: subjectName,
          topic_id: rawTopicId,
          topic: topicName,
          subtopic_id: rawSubtopicId,
          subtopic: subtopicName,
          prompt_question: cleanString(rule.prompt_question),
          avgScore:
            typeof rule.avgScore === "number"
              ? rule.avgScore
              : typeof rule.avg_score === "number"
                ? rule.avg_score
                : 0,
        }
      })
      .filter((rule) => rule.id)

    console.log("GET ALL RULES COUNT:", normalized.length)
    console.log("GET ALL RULES SAMPLE:", normalized.slice(0, 5))

    return NextResponse.json(normalized)
  } catch (err) {
    console.error("GET ALL RULES CRASH:", err)
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}
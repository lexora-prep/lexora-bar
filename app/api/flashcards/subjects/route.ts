import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { data: subjectsData, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name, order_index")
    .order("order_index")

  if (subjectError) {
    console.error(subjectError)
    return NextResponse.json({ success: false, subjects: [] })
  }

  const { data: topicsData, error: topicError } = await supabase
    .from("topics")
    .select("id, name, subject_id")

  if (topicError) {
    console.error(topicError)
    return NextResponse.json({ success: false, subjects: [] })
  }

  const { data: rulesData, error: ruleError } = await supabase
    .from("rules")
    .select("id, subject_id, topic_id")

  if (ruleError) {
    console.error(ruleError)
  }

  const subjects = subjectsData ?? []
  const topics = topicsData ?? []

  let rules = rulesData ?? []

  if (rules.length === 0) {
    const prismaRules = await prisma.rules.findMany({
      select: {
        id: true,
        subject_id: true,
        topic_id: true
      }
    })

    rules = prismaRules as any
  }

  const result = subjects.map((subject) => {
    const subjectRules = rules.filter((r: any) =>
      (r.subject_id ?? r.subjectId) === subject.id
    )

    return {
      id: subject.id,
      name: subject.name,
      ruleCount: subjectRules.length,
      topics: topics
        .filter((t) => t.subject_id === subject.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          ruleCount: rules.filter((r: any) =>
            (r.topic_id ?? r.topicId) === t.id
          ).length
        }))
    }
  })

  return NextResponse.json({
    success: true,
    subjects: result
  })
}
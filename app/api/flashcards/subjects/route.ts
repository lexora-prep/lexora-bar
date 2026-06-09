import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type SubjectRow = {
  id: string
  name: string
  order_index: number | null
}

type TopicRow = {
  id: string
  name: string
  subject_id: string
}

type RuleRow = {
  id: string
  subject_id: string | null
  topic_id: string | null
}

export async function GET() {
  try {
    const subjectsData = await prisma.$queryRaw<SubjectRow[]>`
      select id::text, name, order_index
      from public.subjects
      order by order_index nulls last, name asc
    `

    const topicsData = await prisma.$queryRaw<TopicRow[]>`
      select id::text, name, subject_id::text
      from public.topics
      order by name asc
    `

    const rulesData = await prisma.$queryRaw<RuleRow[]>`
      select id::text, subject_id::text, topic_id::text
      from public.rules
      where is_active = true
        and rule_type is null
        and prompt_question is not null
        and rule_text <> ''
    `

    const result = subjectsData
      .map((subject) => {
        const subjectRules = rulesData.filter((rule) => rule.subject_id === subject.id)

        return {
          id: subject.id,
          name: subject.name,
          ruleCount: subjectRules.length,
          topics: topicsData
            .filter((topic) => topic.subject_id === subject.id)
            .map((topic) => ({
              id: topic.id,
              name: topic.name,
              ruleCount: rulesData.filter((rule) => rule.topic_id === topic.id).length,
            }))
            .filter((topic) => topic.ruleCount > 0),
        }
      })
      .filter((subject) => subject.ruleCount > 0)

    return NextResponse.json({
      success: true,
      subjects: result,
    })
  } catch (error) {
    console.error("FLASHCARD SUBJECTS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        subjects: [],
        error: "Failed to load flashcard subjects",
      },
      { status: 500 }
    )
  }
}
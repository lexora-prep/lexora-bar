import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export async function GET() {

  try {

    const { data: subjects, error: subjectError } = await supabase
      .from("subjects")
      .select("id, name, order_index")
      .order("order_index")

    if (subjectError) {
      console.error("Subjects error:", subjectError)
      return NextResponse.json({ success: false, subjects: [] })
    }

    const { data: topics, error: topicError } = await supabase
      .from("topics")
      .select("id, name, subject_id")

    if (topicError) {
      console.error("Topics error:", topicError)
      return NextResponse.json({ success: false, subjects: [] })
    }

    const result = (subjects || []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      ruleCount: 0,
      topics: (topics || [])
        .filter((t) => t.subject_id === subject.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          ruleCount: 0
        }))
    }))

    return NextResponse.json({
      success: true,
      subjects: result
    })

  } catch (err) {

    console.error("Flashcards subjects API error:", err)

    return NextResponse.json({
      success: false,
      subjects: []
    })

  }

}
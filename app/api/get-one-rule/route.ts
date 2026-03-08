import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const subjectId = searchParams.get("subject")
  const mode = searchParams.get("mode")

  let query = supabase.from("rules").select("*")

  if (mode !== "random" && subjectId) {
    query = query.eq("subject_id", subjectId)
  }

  const { data, error } = await query.limit(1).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
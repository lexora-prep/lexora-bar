import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { buildProgressHistoryAnalytics } from "@/lib/progress-history-analytics"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") ?? "30d"
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const timezoneOffset = Number(searchParams.get("timezoneOffset") ?? 0)

    const data = await buildProgressHistoryAnalytics({
      userId: user.id,
      range,
      start,
      end,
      timezoneOffset: Number.isFinite(timezoneOffset) ? timezoneOffset : 0,
    })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("PROGRESS HISTORY ANALYTICS ERROR:", error)

    return NextResponse.json(
      { error: "Progress history could not be loaded." },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { requireBLL } from "@/lib/access"
import { buildDailyLearningRecommendation } from "@/lib/learning/recommendations"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const access = await requireBLL("Daily recommended sessions")
    if (!access.ok) return access.response

    const { searchParams } = new URL(request.url)
    const minutes = Number(searchParams.get("minutes") ?? 30)

    const recommendation = await buildDailyLearningRecommendation({
      userId: access.userId,
      minutes,
    })

    return NextResponse.json(recommendation, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("RECOMMENDED SESSION ERROR:", error)

    return NextResponse.json(
      { error: "Your recommended session could not be generated." },
      { status: 500 }
    )
  }
}

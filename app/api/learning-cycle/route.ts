import { NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/authenticated-user"
import {
  advanceLearningCycle,
  getLearningCycleSummary,
} from "@/lib/learning"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) return auth.response

    const summary = await getLearningCycleSummary(auth.userId)

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("LEARNING CYCLE GET ERROR:", error)
    return NextResponse.json(
      { error: "Learning cycle could not be loaded." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => null)
    const action = String(body?.action ?? "").trim()

    if (action !== "start_next" && action !== "restart_current") {
      return NextResponse.json(
        { error: "Unsupported learning-cycle action." },
        { status: 400 }
      )
    }

    if (action === "start_next") {
      const current = await getLearningCycleSummary(auth.userId)
      if (!current.totals.isComplete) {
        return NextResponse.json(
          {
            error: "Complete the current cycle before starting the next cycle.",
            remainingRules: current.totals.remainingStudy,
          },
          { status: 409 }
        )
      }
    }

    await advanceLearningCycle({
      userId: auth.userId,
      action,
      reason: typeof body?.reason === "string" ? body.reason : undefined,
    })

    const summary = await getLearningCycleSummary(auth.userId)

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("LEARNING CYCLE POST ERROR:", error)
    return NextResponse.json(
      { error: "Learning cycle could not be updated." },
      { status: 500 }
    )
  }
}

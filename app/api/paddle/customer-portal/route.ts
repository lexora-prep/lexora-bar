import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

type PortalAction =
  | "overview"
  | "manage_subscription"
  | "update_payment_method"
  | "cancel_subscription"
  | "invoices"

function getPaddleApiBaseUrl() {
  const env = String(process.env.PADDLE_ENVIRONMENT || "production").toLowerCase()
  return env === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com"
}

function pickPortalUrl(data: any, subscriptionId: string | null, action: PortalAction) {
  const general = data?.urls?.general || {}
  const subscriptions = Array.isArray(data?.urls?.subscriptions)
    ? data.urls.subscriptions
    : []

  const sub =
    subscriptions.find(
      (item: any) => item?.id === subscriptionId || item?.subscription_id === subscriptionId
    ) || subscriptions[0] || {}

  if (action === "cancel_subscription") {
    return sub.cancel_subscription || sub.cancel || sub.overview || general.overview || null
  }

  if (action === "update_payment_method") {
    return (
      sub.update_payment_method ||
      sub.payment_method_update ||
      sub.overview ||
      general.overview ||
      null
    )
  }

  if (action === "manage_subscription") {
    return sub.overview || sub.update_subscription || general.overview || null
  }

  if (action === "invoices") {
    return general.overview || sub.overview || null
  }

  return general.overview || sub.overview || null
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.PADDLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "PADDLE_API_KEY is missing." },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        paddle_customer_id: true,
        paddle_subscription_id: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found." },
        { status: 404 }
      )
    }

    if (!profile.paddle_customer_id || !profile.paddle_customer_id.startsWith("ctm_")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paddle customer ID is missing or invalid. Re-sync the subscription or contact support.",
        },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "overview") as PortalAction

    const payload: Record<string, unknown> = {
      customer_id: profile.paddle_customer_id,
    }

    if (profile.paddle_subscription_id?.startsWith("sub_")) {
      payload.subscription_ids = [profile.paddle_subscription_id]
    }

    const paddleRes = await fetch(`${getPaddleApiBaseUrl()}/customer-portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const paddleData = await paddleRes.json().catch(() => null)

    if (!paddleRes.ok) {
      console.error("PADDLE CUSTOMER PORTAL ERROR:", paddleData)

      return NextResponse.json(
        {
          ok: false,
          error:
            paddleData?.error?.detail ||
            paddleData?.error?.message ||
            "Failed to create Paddle customer portal session.",
        },
        { status: paddleRes.status }
      )
    }

    const url = pickPortalUrl(paddleData?.data, profile.paddle_subscription_id, action)

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Paddle did not return a usable portal URL." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, url })
  } catch (err: any) {
    console.error("CUSTOMER PORTAL ROUTE ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to open billing portal." },
      { status: 500 }
    )
  }
}

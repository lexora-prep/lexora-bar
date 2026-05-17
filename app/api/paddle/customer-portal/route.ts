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

function isValidCustomerId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("ctm_")
}

function isValidSubscriptionId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("sub_")
}

function isValidTransactionId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("txn_")
}

async function fetchPaddleData(apiKey: string, path: string) {
  const res = await fetch(`${getPaddleApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    console.error("PADDLE FETCH ERROR:", {
      path,
      status: res.status,
      response: json,
    })
    return null
  }

  return json?.data || null
}

async function recoverCustomerId({
  apiKey,
  profileId,
  subscriptionId,
  transactionId,
}: {
  apiKey: string
  profileId: string
  subscriptionId: string | null
  transactionId: string | null
}) {
  let customerId: string | null = null

  if (isValidSubscriptionId(subscriptionId)) {
    const subscription = await fetchPaddleData(apiKey, `/subscriptions/${subscriptionId}`)
    customerId = subscription?.customer_id || null
  }

  if (!isValidCustomerId(customerId) && isValidTransactionId(transactionId)) {
    const transaction = await fetchPaddleData(apiKey, `/transactions/${transactionId}`)
    customerId = transaction?.customer_id || null
  }

  if (!isValidCustomerId(customerId)) {
    return null
  }

  await prisma.profiles.update({
    where: { id: profileId },
    data: {
      paddle_customer_id: customerId,
      updated_at: new Date(),
    },
  })

  return customerId
}

async function createGeneralPortalSession({
  apiKey,
  customerId,
}: {
  apiKey: string
  customerId: string
}) {
  const res = await fetch(
    `${getPaddleApiBaseUrl()}/customers/${customerId}/portal-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    },
  )

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    console.error("PADDLE CUSTOMER PORTAL ERROR:", json)

    return {
      url: null,
      error:
        json?.error?.detail ||
        json?.error?.message ||
        "Failed to create Paddle customer portal session.",
      status: res.status,
    }
  }

  return {
    url: json?.data?.urls?.general?.overview || null,
    error: null,
    status: 200,
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.PADDLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "PADDLE_API_KEY is missing." },
        { status: 500 },
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
        paddle_transaction_id: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found." },
        { status: 404 },
      )
    }

    let customerId = profile.paddle_customer_id

    if (!isValidCustomerId(customerId)) {
      customerId = await recoverCustomerId({
        apiKey,
        profileId: profile.id,
        subscriptionId: profile.paddle_subscription_id,
        transactionId: profile.paddle_transaction_id,
      })
    }

    if (!isValidCustomerId(customerId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paddle customer ID is missing and could not be recovered from the subscription or transaction.",
        },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "overview") as PortalAction

    const subscription = isValidSubscriptionId(profile.paddle_subscription_id)
      ? await fetchPaddleData(apiKey, `/subscriptions/${profile.paddle_subscription_id}`)
      : null

    if (action === "update_payment_method") {
      const url = subscription?.management_urls?.update_payment_method

      if (url) {
        return NextResponse.json({ ok: true, url })
      }
    }

    if (action === "cancel_subscription") {
      const url = subscription?.management_urls?.cancel

      if (url) {
        return NextResponse.json({ ok: true, url })
      }
    }

    const portal = await createGeneralPortalSession({
      apiKey,
      customerId,
    })

    if (!portal.url) {
      return NextResponse.json(
        {
          ok: false,
          error: portal.error || "Paddle did not return a usable portal URL.",
        },
        { status: portal.status || 500 },
      )
    }

    return NextResponse.json({ ok: true, url: portal.url })
  } catch (err: any) {
    console.error("CUSTOMER PORTAL ROUTE ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to open billing portal." },
      { status: 500 },
    )
  }
}
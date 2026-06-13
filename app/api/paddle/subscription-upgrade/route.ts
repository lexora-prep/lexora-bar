import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

const PADDLE_API_BASE =
  process.env.PADDLE_API_BASE_URL || "https://api.paddle.com"

const BLL_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_BLL_MONTHLY_PRICE_ID
const PREMIUM_MONTHLY_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PREMIUM_MONTHLY_PRICE_ID

type UpgradeAction = "preview" | "apply"

function isValidSubscriptionId(value: string | null | undefined) {
  return Boolean(value && value.startsWith("sub_"))
}

function isValidPriceId(value: string | null | undefined) {
  return Boolean(value && value.startsWith("pri_"))
}

async function paddleRequest(
  apiKey: string,
  path: string,
  options: RequestInit = {},
) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      json?.error?.detail ||
      json?.error?.message ||
      json?.message ||
      "Paddle request failed."

    throw new Error(message)
  }

  return json?.data ?? json
}

function getSubscriptionItems(subscription: any) {
  const items = Array.isArray(subscription?.items) ? subscription.items : []

  return items
    .map((item: any) => {
      const priceId =
        item?.price?.id ||
        item?.price_id ||
        item?.priceId ||
        null

      const quantity = Number(item?.quantity || 1)

      if (!isValidPriceId(priceId)) return null

      return {
        price_id: String(priceId),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      }
    })
    .filter(Boolean) as Array<{ price_id: string; quantity: number }>
}

function buildPremiumUpgradeItems(subscription: any) {
  const currentItems = getSubscriptionItems(subscription)

  if (currentItems.length === 0) {
    return [
      {
        price_id: PREMIUM_MONTHLY_PRICE_ID!,
        quantity: 1,
      },
    ]
  }

  let replaced = false

  const nextItems = currentItems.map((item) => {
    if (item.price_id === BLL_MONTHLY_PRICE_ID) {
      replaced = true
      return {
        ...item,
        price_id: PREMIUM_MONTHLY_PRICE_ID!,
      }
    }

    return item
  })

  if (!replaced && nextItems.length === 1) {
    nextItems[0] = {
      ...nextItems[0],
      price_id: PREMIUM_MONTHLY_PRICE_ID!,
    }
  }

  return nextItems
}

function getImmediateCharge(data: any) {
  const transaction =
    data?.immediate_transaction ||
    data?.immediateTransaction ||
    null

  const totals =
    transaction?.details?.totals ||
    transaction?.totals ||
    null

  return {
    currency:
      totals?.currency_code ||
      totals?.currencyCode ||
      transaction?.currency_code ||
      transaction?.currencyCode ||
      null,
    total:
      totals?.total ||
      totals?.grand_total ||
      null,
    subtotal: totals?.subtotal || null,
    tax: totals?.tax || totals?.grand_total_tax || null,
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

    if (!isValidPriceId(BLL_MONTHLY_PRICE_ID)) {
      return NextResponse.json(
        { ok: false, error: "BLL Monthly Paddle price ID is missing or invalid." },
        { status: 500 },
      )
    }

    if (!isValidPriceId(PREMIUM_MONTHLY_PRICE_ID)) {
      return NextResponse.json(
        { ok: false, error: "Premium Paddle price ID is missing or invalid." },
        { status: 500 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "preview") as UpgradeAction

    if (action !== "preview" && action !== "apply") {
      return NextResponse.json(
        { ok: false, error: "Invalid upgrade action." },
        { status: 400 },
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
        subscription_tier: true,
        billing_status: true,
        paddle_subscription_id: true,
        paddle_price_id: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found." },
        { status: 404 },
      )
    }

    const currentTier = String(profile.subscription_tier || "free").toLowerCase()
    const billingStatus = String(profile.billing_status || "free").toLowerCase()

    if (currentTier === "premium") {
      return NextResponse.json(
        { ok: false, error: "This account is already on Premium." },
        { status: 409 },
      )
    }

    if (
      currentTier !== "bll-monthly" &&
      currentTier !== "bll_monthly" &&
      currentTier !== "bll"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only active BLL Monthly users can upgrade to Premium from here.",
        },
        { status: 409 },
      )
    }

    if (billingStatus !== "active" && billingStatus !== "paid") {
      return NextResponse.json(
        { ok: false, error: "Subscription must be active before upgrading." },
        { status: 409 },
      )
    }

    if (!isValidSubscriptionId(profile.paddle_subscription_id)) {
      return NextResponse.json(
        { ok: false, error: "Active Paddle subscription ID is missing." },
        { status: 409 },
      )
    }

    const subscription = await paddleRequest(
      apiKey,
      `/subscriptions/${profile.paddle_subscription_id}`,
    )

    const items = buildPremiumUpgradeItems(subscription)

    const payload = {
      items,
      proration_billing_mode: "prorated_immediately",
      custom_data: {
        user_id: profile.id,
        email: profile.email,
        plan: "premium",
        previous_plan: "bll-monthly",
        source: "lexora_subscription_upgrade",
      },
    }

    if (action === "preview") {
      const preview = await paddleRequest(
        apiKey,
        `/subscriptions/${profile.paddle_subscription_id}/preview`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      )

      return NextResponse.json({
        ok: true,
        action,
        subscriptionId: profile.paddle_subscription_id,
        currentPlan: "bll-monthly",
        targetPlan: "premium",
        immediateCharge: getImmediateCharge(preview),
        raw: preview,
      })
    }

    const updated = await paddleRequest(
      apiKey,
      `/subscriptions/${profile.paddle_subscription_id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          on_payment_failure: "prevent_change",
        }),
      },
    )

    await prisma.profiles.update({
      where: { id: profile.id },
      data: {
        billing_status: "upgrade_processing",
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      action,
      subscriptionId: profile.paddle_subscription_id,
      currentPlan: "bll-monthly",
      targetPlan: "premium",
      subscription: updated,
    })
  } catch (error: any) {
    console.error("PADDLE SUBSCRIPTION UPGRADE ERROR:", error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to process subscription upgrade.",
      },
      { status: 500 },
    )
  }
}

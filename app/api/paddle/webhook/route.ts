import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type PaddleEvent = {
  event_id?: string
  event_type?: string
  occurred_at?: string
  data?: any
}

type PaddleCustomData = {
  user_id?: string
  userId?: string
  email?: string
  plan?: string
  selected_plan?: string
  selectedPlan?: string
  source?: string
}

function getSignatureParts(signatureHeader: string | null) {
  if (!signatureHeader) {
    return null
  }

  const parts = signatureHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=")

    if (key && value) {
      acc[key.trim()] = value.trim()
    }

    return acc
  }, {})

  if (!parts.ts || !parts.h1) {
    return null
  }

  return {
    timestamp: parts.ts,
    signature: parts.h1,
  }
}

function timingSafeEqualHex(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left, "hex")
    const rightBuffer = Buffer.from(right, "hex")

    if (leftBuffer.length !== rightBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET

  if (!secret) {
    throw new Error("PADDLE_WEBHOOK_SECRET is missing.")
  }

  const signatureParts = getSignatureParts(signatureHeader)

  if (!signatureParts) {
    return false
  }

  const signedPayload = `${signatureParts.timestamp}:${rawBody}`

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")

  return timingSafeEqualHex(expectedSignature, signatureParts.signature)
}

function normalizePlan(value: unknown) {
  const plan = String(value || "").trim().toLowerCase()

  if (plan === "premium") return "premium"

  if (
    plan === "bll-monthly" ||
    plan === "bll_monthly" ||
    plan === "monthly" ||
    plan === "bll"
  ) {
    return "bll-monthly"
  }

  return null
}

function getCustomData(event: PaddleEvent): PaddleCustomData {
  const data = event.data || {}

  return (
    data.custom_data ||
    data.customData ||
    data.transaction?.custom_data ||
    data.transaction?.customData ||
    data.subscription?.custom_data ||
    data.subscription?.customData ||
    {}
  )
}

function getUserIdentifier(event: PaddleEvent) {
  const data = event.data || {}
  const customData = getCustomData(event)

  const userId =
    customData.user_id ||
    customData.userId ||
    data.custom_data?.user_id ||
    data.custom_data?.userId ||
    null

  const email =
    customData.email ||
    data.customer?.email ||
    data.customer_email ||
    data.customerEmail ||
    data.email ||
    null

  return {
    userId: userId ? String(userId) : null,
    email: email ? String(email).trim().toLowerCase() : null,
  }
}

function getPlanFromEvent(event: PaddleEvent) {
  const data = event.data || {}
  const customData = getCustomData(event)

  return (
    normalizePlan(customData.plan) ||
    normalizePlan(customData.selected_plan) ||
    normalizePlan(customData.selectedPlan) ||
    normalizePlan(data.custom_data?.plan) ||
    normalizePlan(data.custom_data?.selected_plan) ||
    normalizePlan(data.custom_data?.selectedPlan) ||
    null
  )
}

async function findProfileForEvent(event: PaddleEvent) {
  const { userId, email } = getUserIdentifier(event)

  if (userId) {
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    })

    if (profile) return profile
  }

  if (email) {
    const profile = await prisma.profiles.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    })

    if (profile) return profile
  }

  return null
}

async function activatePaidAccess(event: PaddleEvent) {
  const profile = await findProfileForEvent(event)

  if (!profile) {
    console.warn("PADDLE WEBHOOK: No matching profile found.", {
      event_id: event.event_id,
      event_type: event.event_type,
      identifier: getUserIdentifier(event),
      custom_data: getCustomData(event),
    })

    return
  }

  const plan = getPlanFromEvent(event) || "premium"

  await prisma.profiles.update({
    where: { id: profile.id },
    data: {
      subscription_tier: plan,
      mbe_access: true,
      is_blocked: false,
      pending_deletion: false,
      updated_at: new Date(),
    },
  })

  console.log("PADDLE WEBHOOK: Paid access activated.", {
    event_id: event.event_id,
    event_type: event.event_type,
    profile_id: profile.id,
    email: profile.email,
    plan,
  })
}

async function restrictPaidAccess(event: PaddleEvent) {
  const profile = await findProfileForEvent(event)

  if (!profile) {
    console.warn("PADDLE WEBHOOK: No matching profile found for restriction.", {
      event_id: event.event_id,
      event_type: event.event_type,
      identifier: getUserIdentifier(event),
      custom_data: getCustomData(event),
    })

    return
  }

  await prisma.profiles.update({
    where: { id: profile.id },
    data: {
      subscription_tier: "free",
      mbe_access: false,
      updated_at: new Date(),
    },
  })

  console.log("PADDLE WEBHOOK: Paid access restricted.", {
    event_id: event.event_id,
    event_type: event.event_type,
    profile_id: profile.id,
    email: profile.email,
  })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get("paddle-signature")

    const validSignature = verifyPaddleSignature(rawBody, signatureHeader)

    if (!validSignature) {
      console.warn("PADDLE WEBHOOK: Invalid signature.")

      return NextResponse.json(
        { ok: false, error: "Invalid signature." },
        { status: 401 }
      )
    }

    const event = JSON.parse(rawBody) as PaddleEvent
    const eventType = event.event_type || ""

    console.log("PADDLE WEBHOOK RECEIVED:", {
      event_id: event.event_id,
      event_type: eventType,
      occurred_at: event.occurred_at,
    })

    console.log("PADDLE WEBHOOK DEBUG SAFE:", {
      event_id: event.event_id,
      event_type: eventType,
      data_id: event.data?.id || null,
      data_status: event.data?.status || null,
      customer_id: event.data?.customer_id || event.data?.customerId || event.data?.customer?.id || null,
      subscription_id: event.data?.subscription_id || event.data?.subscriptionId || event.data?.subscription?.id || null,
      transaction_id: event.data?.transaction_id || event.data?.transactionId || event.data?.transaction?.id || null,
      price_id:
        event.data?.items?.[0]?.price?.id ||
        event.data?.items?.[0]?.price_id ||
        event.data?.price?.id ||
        event.data?.price_id ||
        null,
      currency:
        event.data?.currency_code ||
        event.data?.currencyCode ||
        event.data?.details?.totals?.currency_code ||
        event.data?.details?.totals?.currencyCode ||
        null,
      totals: event.data?.details?.totals || event.data?.totals || null,
      billing_period:
        event.data?.current_billing_period ||
        event.data?.currentBillingPeriod ||
        event.data?.billing_period ||
        event.data?.billingPeriod ||
        null,
      custom_data:
        event.data?.custom_data ||
        event.data?.customData ||
        event.data?.transaction?.custom_data ||
        event.data?.subscription?.custom_data ||
        null,
      discount:
        event.data?.discount ||
        event.data?.discounts?.[0] ||
        event.data?.details?.totals?.discount ||
        null,
    })

    if (
      eventType === "transaction.completed" ||
      eventType === "transaction.paid" ||
      eventType === "subscription.created" ||
      eventType === "subscription.activated" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.resumed"
    ) {
      await activatePaidAccess(event)
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "subscription.paused" ||
      eventType === "subscription.past_due" ||
      eventType === "transaction.payment_failed"
    ) {
      await restrictPaidAccess(event)
    } else {
      console.log("PADDLE WEBHOOK: Event acknowledged without profile update.", {
        event_id: event.event_id,
        event_type: eventType,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("PADDLE WEBHOOK ERROR:", error)

    return NextResponse.json(
      { ok: false, error: error?.message || "Webhook failed." },
      { status: 500 }
    )
  }
}

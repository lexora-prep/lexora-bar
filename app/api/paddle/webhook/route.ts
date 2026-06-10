import crypto from "crypto"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
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
  if (!signatureHeader) return null

  const parts = signatureHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=")

    if (key && value) {
      acc[key.trim()] = value.trim()
    }

    return acc
  }, {})

  if (!parts.ts || !parts.h1) return null

  return {
    timestamp: parts.ts,
    signature: parts.h1,
  }
}

function timingSafeEqualHex(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left, "hex")
    const rightBuffer = Buffer.from(right, "hex")

    if (leftBuffer.length !== rightBuffer.length) return false

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

  if (!signatureParts) return false

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

function asDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function asCents(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const num = Number(value)
  return Number.isFinite(num) ? Math.round(num) : undefined
}

function getCustomerId(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.customer_id ||
    data.customerId ||
    data.customer?.id ||
    data.transaction?.customer_id ||
    data.transaction?.customerId ||
    data.subscription?.customer_id ||
    data.subscription?.customerId ||
    null
  )
}

function getSubscriptionId(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.subscription_id ||
    data.subscriptionId ||
    data.subscription?.id ||
    data.transaction?.subscription_id ||
    data.transaction?.subscriptionId ||
    null
  )
}

function getTransactionId(event: PaddleEvent) {
  const data = event.data || {}

  if (String(event.event_type || "").startsWith("transaction.")) {
    return data.id || null
  }

  return data.transaction_id || data.transactionId || data.transaction?.id || null
}

function getPriceId(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.items?.[0]?.price?.id ||
    data.items?.[0]?.price_id ||
    data.items?.[0]?.priceId ||
    data.price?.id ||
    data.price_id ||
    data.priceId ||
    data.transaction?.items?.[0]?.price?.id ||
    data.subscription?.items?.[0]?.price?.id ||
    null
  )
}

function getCurrency(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.currency_code ||
    data.currencyCode ||
    data.details?.totals?.currency_code ||
    data.details?.totals?.currencyCode ||
    data.totals?.currency_code ||
    data.totals?.currencyCode ||
    data.items?.[0]?.price?.unit_price?.currency_code ||
    null
  )
}

function getTotals(event: PaddleEvent) {
  const data = event.data || {}

  return data.details?.totals || data.totals || data.adjusted_totals || null
}

function getAmountCents(event: PaddleEvent) {
  const totals = getTotals(event)
  return asCents(totals?.subtotal)
}

function getTaxCents(event: PaddleEvent) {
  const totals = getTotals(event)
  return asCents(totals?.tax || totals?.grand_total_tax)
}

function getTotalCents(event: PaddleEvent) {
  const totals = getTotals(event)
  return asCents(totals?.total || totals?.grand_total)
}

function getBillingInterval(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.items?.[0]?.price?.billing_cycle?.interval ||
    data.subscription?.items?.[0]?.price?.billing_cycle?.interval ||
    data.billing_cycle?.interval ||
    null
  )
}

function getBillingPeriod(event: PaddleEvent) {
  const data = event.data || {}

  return (
    data.billing_period ||
    data.billingPeriod ||
    data.current_billing_period ||
    data.currentBillingPeriod ||
    data.subscription?.billing_period ||
    data.subscription?.current_billing_period ||
    null
  )
}

function getPeriodStartsAt(event: PaddleEvent) {
  const period = getBillingPeriod(event)
  return asDate(period?.starts_at || period?.startsAt)
}

function getPeriodEndsAt(event: PaddleEvent) {
  const period = getBillingPeriod(event)
  return asDate(period?.ends_at || period?.endsAt)
}

function getPaidAt(event: PaddleEvent) {
  const data = event.data || {}

  return (
    asDate(data.billed_at) ||
    asDate(data.billedAt) ||
    asDate(data.payments?.[0]?.captured_at) ||
    asDate(data.payments?.[0]?.capturedAt) ||
    asDate(data.created_at) ||
    asDate(data.createdAt) ||
    asDate(event.occurred_at) ||
    new Date()
  )
}

function isSafeBillingDocumentUrl(value: unknown) {
  if (typeof value !== "string") return false

  try {
    const url = new URL(value)

    if (url.hostname === "lexoraprep.com" && url.pathname.startsWith("/checkout")) {
      return false
    }

    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function firstSafeBillingDocumentUrl(...values: unknown[]) {
  for (const value of values) {
    if (isSafeBillingDocumentUrl(value)) {
      return value as string
    }
  }

  return null
}

function getInvoiceUrl(event: PaddleEvent) {
  const data = event.data || {}

  return firstSafeBillingDocumentUrl(
    data.invoice_url,
    data.invoiceUrl,
    data.receipt_url,
    data.receiptUrl,
  )
}

function getReceiptUrl(event: PaddleEvent) {
  const data = event.data || {}

  return firstSafeBillingDocumentUrl(
    data.receipt_url,
    data.receiptUrl,
    data.invoice_url,
    data.invoiceUrl,
  )
}

function getDiscountData(event: PaddleEvent) {
  const data = event.data || {}
  const discount =
    data.discount ||
    data.discounts?.[0] ||
    data.discount_id ||
    data.discountId ||
    null

  return {
    id:
      (typeof discount === "string" ? discount : discount?.id) ||
      data.discount_id ||
      data.discountId ||
      null,
    code:
      discount?.code ||
      discount?.coupon_code ||
      discount?.couponCode ||
      data.discount_code ||
      data.discountCode ||
      null,
    amount:
      discount?.amount ||
      discount?.amount_off ||
      discount?.amountOff ||
      getTotals(event)?.discount ||
      null,
  }
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

async function upsertPaymentRecord(event: PaddleEvent, profile: { id: string; email: string }) {
  const transactionId = getTransactionId(event)

  if (!transactionId) {
    console.warn("PADDLE WEBHOOK: Payment record skipped because transaction ID is missing.", {
      event_id: event.event_id,
      event_type: event.event_type,
    })
    return
  }

  const discount = getDiscountData(event)
  const plan = getPlanFromEvent(event) || "premium"

  await prisma.$executeRaw`
    insert into public.paddle_payment_records (
      user_id,
      email,
      paddle_event_id,
      paddle_customer_id,
      paddle_subscription_id,
      paddle_transaction_id,
      paddle_price_id,
      plan,
      status,
      currency,
      amount_cents,
      tax_cents,
      total_cents,
      billing_period_starts_at,
      billing_period_ends_at,
      paid_at,
      discount_id,
      discount_code,
      discount_amount,
      invoice_url,
      receipt_url,
      raw_event,
      updated_at
    )
    values (
      ${profile.id}::uuid,
      ${profile.email},
      ${event.event_id || null},
      ${getCustomerId(event)},
      ${getSubscriptionId(event)},
      ${transactionId},
      ${getPriceId(event)},
      ${plan},
      ${"paid"},
      ${getCurrency(event)},
      ${getAmountCents(event) ?? null},
      ${getTaxCents(event) ?? null},
      ${getTotalCents(event) ?? null},
      ${getPeriodStartsAt(event) ?? null},
      ${getPeriodEndsAt(event) ?? null},
      ${getPaidAt(event)},
      ${discount.id || null},
      ${discount.code || null},
      ${discount.amount ? String(discount.amount) : null},
      ${getInvoiceUrl(event)},
      ${getReceiptUrl(event)},
      ${JSON.stringify(event)}::jsonb,
      now()
    )
    on conflict (paddle_transaction_id)
    do update set
      user_id = excluded.user_id,
      email = excluded.email,
      paddle_event_id = excluded.paddle_event_id,
      paddle_customer_id = excluded.paddle_customer_id,
      paddle_subscription_id = excluded.paddle_subscription_id,
      paddle_price_id = excluded.paddle_price_id,
      plan = excluded.plan,
      status = excluded.status,
      currency = excluded.currency,
      amount_cents = excluded.amount_cents,
      tax_cents = excluded.tax_cents,
      total_cents = excluded.total_cents,
      billing_period_starts_at = excluded.billing_period_starts_at,
      billing_period_ends_at = excluded.billing_period_ends_at,
      paid_at = excluded.paid_at,
      discount_id = excluded.discount_id,
      discount_code = excluded.discount_code,
      discount_amount = excluded.discount_amount,
      invoice_url = excluded.invoice_url,
      receipt_url = excluded.receipt_url,
      raw_event = excluded.raw_event,
      updated_at = now()
  `

  console.log("PADDLE WEBHOOK: Payment record stored.", {
    event_id: event.event_id,
    event_type: event.event_type,
    profile_id: profile.id,
    transaction_id: transactionId,
  })
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

  const now = new Date()
  const plan = getPlanFromEvent(event) || "premium"
  const discount = getDiscountData(event)
  const eventType = event.event_type || ""

  await prisma.profiles.update({
    where: { id: profile.id },
    data: {
      subscription_tier: plan,
      billing_status: "active",

      paddle_customer_id: getCustomerId(event) || undefined,
      paddle_subscription_id: getSubscriptionId(event) || undefined,
      paddle_transaction_id: getTransactionId(event) || undefined,
      paddle_price_id: getPriceId(event) || undefined,

      billing_currency: getCurrency(event) || undefined,
      billing_amount_cents: getAmountCents(event) ?? undefined,
      billing_tax_cents: getTaxCents(event) ?? undefined,
      billing_total_cents: getTotalCents(event) ?? undefined,
      billing_interval: getBillingInterval(event) || undefined,

      billing_started_at: eventType === "subscription.created" ? now : undefined,
      billing_period_starts_at: getPeriodStartsAt(event) || undefined,
      billing_period_ends_at: getPeriodEndsAt(event) || undefined,
      billing_cancelled_at: null,
      billing_last_paid_at:
        eventType === "transaction.completed" || eventType === "transaction.paid"
          ? getPaidAt(event)
          : undefined,

      billing_discount_id: discount.id || undefined,
      billing_discount_code: discount.code || undefined,
      billing_discount_amount: discount.amount ? String(discount.amount) : undefined,
      billing_invoice_url: getInvoiceUrl(event) || undefined,

      mbe_access: true,
      is_blocked: false,
      pending_deletion: false,
      updated_at: now,
    },
  })

  if (eventType === "transaction.completed" || eventType === "transaction.paid") {
    await upsertPaymentRecord(event, profile)
  }

  console.log("PADDLE WEBHOOK: Paid access activated.", {
    event_id: event.event_id,
    event_type: event.event_type,
    profile_id: profile.id,
    email: profile.email,
    plan,
    customer_id: getCustomerId(event),
    subscription_id: getSubscriptionId(event),
    transaction_id: getTransactionId(event),
    price_id: getPriceId(event),
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

  const eventType = event.event_type || ""
  const now = new Date()

  await prisma.profiles.update({
    where: { id: profile.id },
    data: {
      subscription_tier: "free",
      billing_status:
        eventType === "subscription.past_due" || eventType === "transaction.payment_failed"
          ? "past_due"
          : "inactive",
      mbe_access: false,
      billing_cancelled_at: eventType === "subscription.canceled" ? now : undefined,
      updated_at: now,
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
        { status: 401 },
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
      subscription_id:
        event.data?.subscription_id ||
        event.data?.subscriptionId ||
        event.data?.subscription?.id ||
        null,
      transaction_id:
        event.data?.transaction_id ||
        event.data?.transactionId ||
        event.data?.transaction?.id ||
        null,
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
      { status: 500 },
    )
  }
}
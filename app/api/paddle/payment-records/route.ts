import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

type PaymentRecordRow = {
  id: string
  user_id: string
  email: string
  paddle_event_id: string | null
  paddle_customer_id: string | null
  paddle_subscription_id: string | null
  paddle_transaction_id: string
  paddle_price_id: string | null
  plan: string | null
  status: string | null
  currency: string | null
  amount_cents: number | null
  tax_cents: number | null
  total_cents: number | null
  billing_period_starts_at: Date | null
  billing_period_ends_at: Date | null
  paid_at: Date | null
  discount_id: string | null
  discount_code: string | null
  discount_amount: string | null
  invoice_url: string | null
  receipt_url: string | null
  created_at: Date
  updated_at: Date
}

function serializeRecord(record: PaymentRecordRow) {
  return {
    id: record.id,
    user_id: record.user_id,
    email: record.email,
    paddle_event_id: record.paddle_event_id,
    paddle_customer_id: record.paddle_customer_id,
    paddle_subscription_id: record.paddle_subscription_id,
    paddle_transaction_id: record.paddle_transaction_id,
    paddle_price_id: record.paddle_price_id,
    plan: record.plan,
    status: record.status,
    currency: record.currency,
    amount_cents: record.amount_cents,
    tax_cents: record.tax_cents,
    total_cents: record.total_cents,
    billing_period_starts_at: record.billing_period_starts_at?.toISOString() || null,
    billing_period_ends_at: record.billing_period_ends_at?.toISOString() || null,
    paid_at: record.paid_at?.toISOString() || null,
    discount_id: record.discount_id,
    discount_code: record.discount_code,
    discount_amount: record.discount_amount,
    invoice_url: record.invoice_url,
    receipt_url: record.receipt_url,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const records = await prisma.$queryRaw<PaymentRecordRow[]>`
      select
        id,
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
        created_at,
        updated_at
      from public.paddle_payment_records
      where user_id = ${user.id}::uuid
      order by coalesce(paid_at, created_at) desc
      limit 50
    `

    return NextResponse.json({
      ok: true,
      records: records.map(serializeRecord),
    })
  } catch (error: any) {
    console.error("PADDLE PAYMENT RECORDS GET ERROR:", error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load payment records.",
      },
      { status: 500 },
    )
  }
}
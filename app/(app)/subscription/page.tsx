"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCcw } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import {
  AccountActivityCard,
  BillingSummaryCard,
  ManageBillingCard,
  PaymentHistoryCard,
  PaymentHistoryRecord,
  PlanAccessCard,
  SubscriptionHero,
} from "./_components/SubscriptionCards"
import {
  InvoiceHistoryModal,
  SupportModal,
  topicLabel,
} from "./_components/SubscriptionModals"

type ProfileData = {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string | null
  billing_status: string | null
  billing_currency: string | null
  billing_amount_cents: number | null
  billing_tax_cents: number | null
  billing_total_cents: number | null
  billing_interval: string | null
  billing_started_at: string | null
  billing_period_starts_at: string | null
  billing_period_ends_at: string | null
  billing_cancelled_at: string | null
  billing_last_paid_at: string | null
  billing_discount_code: string | null
  billing_discount_amount: string | null
  billing_invoice_url: string | null
  created_at: string
  updated_at: string
}

type PaymentRecordData = {
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
  billing_period_starts_at: string | null
  billing_period_ends_at: string | null
  paid_at: string | null
  discount_id: string | null
  discount_code: string | null
  discount_amount: string | null
  invoice_url: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

type SupportMessage = {
  id: string
  sender: string
  message: string
  created_at: string
}

type SupportTicket = {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  messages: SupportMessage[]
}

type BillingPortalAction =
  | "overview"
  | "manage_subscription"
  | "update_payment_method"
  | "cancel_subscription"
  | "invoices"

const plans = {
  free: {
    label: "Free",
    price: "$0",
    note: "Limited preview access",
  },
  "bll-monthly": {
    label: "BLL Monthly",
    price: "$29.99",
    note: "Black Letter Law memorization access",
  },
  premium: {
    label: "Premium",
    price: "$39.99",
    note: "Full memorization access with premium tools",
  },
}

function normalizePlan(plan: string | null | undefined): keyof typeof plans {
  const value = String(plan || "free").toLowerCase()

  if (value === "premium") return "premium"

  if (value === "bll-monthly" || value === "bll_monthly" || value === "bll") {
    return "bll-monthly"
  }

  return "free"
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (typeof cents !== "number") return "Not available"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}

function formatPlanLabel(value: string | null | undefined) {
  const plan = normalizePlan(value)

  if (plan === "premium") return "Premium"
  if (plan === "bll-monthly") return "BLL Monthly"

  return "Free"
}

function formatStatus(value: string | null | undefined) {
  const status = String(value || "paid").trim().toLowerCase()

  if (status === "paid" || status === "active" || status === "completed") return "Paid"
  if (status === "refunded") return "Refunded"
  if (status === "failed") return "Failed"
  if (status === "past_due") return "Past due"

  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecordData[]>([])

  const [invoiceHistoryOpen, setInvoiceHistoryOpen] = useState(false)

  const [supportOpen, setSupportOpen] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState("")
  const [supportTopic, setSupportTopic] = useState("billing")
  const [supportSubject, setSupportSubject] = useState("Billing support request")
  const [supportMessage, setSupportMessage] = useState("")
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  const planKey = normalizePlan(profile?.subscription_tier)
  const plan = plans[planKey]
  const billingStatus = String(profile?.billing_status || "free").toLowerCase()
  const isPaid = planKey !== "free" || billingStatus === "active"
  const currency = profile?.billing_currency || "USD"

  const nextRenewal = formatDate(profile?.billing_period_ends_at)
  const lastPaymentDate = formatDate(profile?.billing_last_paid_at)
  const accountCreated = formatDateTime(profile?.created_at)
  const billingActivated = formatDateTime(
    profile?.billing_last_paid_at || profile?.billing_started_at,
  )

  const subtotal = formatMoney(profile?.billing_amount_cents, currency)
  const tax = formatMoney(profile?.billing_tax_cents, currency)
  const total = formatMoney(profile?.billing_total_cents, currency)

  const discount = profile?.billing_discount_code
    ? profile.billing_discount_amount
      ? `${profile.billing_discount_code} · ${profile.billing_discount_amount}`
      : profile.billing_discount_code
    : "None"

  const paymentHistoryRecords: PaymentHistoryRecord[] =
    paymentRecords.length > 0
      ? paymentRecords.map((record, index) => {
          const recordCurrency = record.currency || currency
          const amount =
            typeof record.total_cents === "number"
              ? record.total_cents
              : record.amount_cents

          return {
            id: record.id,
            number: index + 1,
            planLabel: formatPlanLabel(record.plan),
            paidAt: formatDate(record.paid_at || record.created_at),
            billingPeriodEnds: formatDate(record.billing_period_ends_at),
            amount: formatMoney(amount, recordCurrency),
            tax: formatMoney(record.tax_cents, recordCurrency),
            status: formatStatus(record.status),
            receiptUrl: record.receipt_url || record.invoice_url,
          }
        })
      : isPaid
        ? [
            {
              id: "latest-profile-record",
              number: 1,
              planLabel: plan.label,
              paidAt: lastPaymentDate,
              billingPeriodEnds: nextRenewal,
              amount: total,
              tax,
              status: "Paid",
              receiptUrl: profile?.billing_invoice_url || null,
            },
          ]
        : []

  async function loadPaymentRecords() {
    try {
      const res = await fetch("/api/paddle/payment-records", {
        cache: "no-store",
      })

      if (!res.ok) {
        setPaymentRecords([])
        return
      }

      const data = await res.json().catch(() => null)
      setPaymentRecords(Array.isArray(data?.records) ? data.records : [])
    } catch (err) {
      console.error("PAYMENT RECORDS LOAD ERROR:", err)
      setPaymentRecords([])
    }
  }

  async function loadSubscription(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true)
      setRefreshing(!showSpinner)
      setError("")

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError("Unable to load subscription data.")
        return
      }

      const res = await fetch("/api/profile", { cache: "no-store" })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to load subscription data.")
        return
      }

      const data: ProfileData = await res.json()
      setProfile(data)

      await loadPaymentRecords()
    } catch (err) {
      console.error("SUBSCRIPTION LOAD ERROR:", err)
      setError("Something went wrong while loading subscription.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadTickets() {
    try {
      setSupportError("")

      const res = await fetch("/api/support/tickets", { cache: "no-store" })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSupportError(data?.error || "Failed to load support history.")
        return
      }

      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (err) {
      console.error("SUPPORT TICKETS LOAD ERROR:", err)
      setSupportError("Failed to load support history.")
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [supabase])

  useEffect(() => {
    if (supportOpen) loadTickets()
  }, [supportOpen])

  function openSupport(topic: string) {
    setSupportTopic(topic)
    setSupportSubject(topic === "billing" ? "Billing support request" : topicLabel(topic))
    setSupportMessage("")
    setSupportError("")
    setSupportOpen(true)
  }

  async function openBillingPortal(action: BillingPortalAction) {
    try {
      const res = await fetch("/api/paddle/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.url) {
        window.alert(
          data?.error ||
            "Unable to open Paddle billing portal. Please try again or contact billing help.",
        )
        return
      }

      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (err) {
      console.error("OPEN BILLING PORTAL ERROR:", err)
      window.alert(
        "Unable to open Paddle billing portal. Please try again or contact billing help.",
      )
    }
  }

  function isExternalBillingUrl(url: string | null | undefined) {
    if (!url) return false

    try {
      const parsed = new URL(url, window.location.origin)

      if (parsed.origin === window.location.origin) {
        return false
      }

      return parsed.protocol === "https:" || parsed.protocol === "http:"
    } catch {
      return false
    }
  }

  function openPaymentRecord(record: PaymentHistoryRecord) {
    if (isExternalBillingUrl(record.receiptUrl)) {
      window.open(record.receiptUrl as string, "_blank", "noopener,noreferrer")
      return
    }

    openBillingPortal("invoices")
  }

  function openLatestInvoice() {
    if (paymentHistoryRecords[0]) {
      openPaymentRecord(paymentHistoryRecords[0])
      return
    }

    if (isExternalBillingUrl(profile?.billing_invoice_url)) {
      window.open(profile?.billing_invoice_url as string, "_blank", "noopener,noreferrer")
      return
    }

    openBillingPortal("invoices")
  }

  async function submitSupportTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supportSubject.trim()) {
      setSupportError("Subject is required.")
      return
    }

    if (!supportMessage.trim()) {
      setSupportError("Message is required.")
      return
    }

    try {
      setSupportLoading(true)
      setSupportError("")

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: supportSubject,
          category: supportTopic,
          message: supportMessage,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setSupportError(data?.error || "Failed to create support ticket.")
        return
      }

      setSupportMessage("")
      setSupportSubject(
        supportTopic === "billing" ? "Billing support request" : topicLabel(supportTopic),
      )
      await loadTickets()
    } catch (err) {
      console.error("SUPPORT TICKET SUBMIT ERROR:", err)
      setSupportError("Failed to create support ticket.")
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] px-6 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Account
            </div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">
              Subscription
            </h1>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-[14px] font-medium text-slate-500 shadow-sm">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-[14px] font-semibold text-red-600 shadow-sm">
            {error}
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <SubscriptionHero
              email={profile.email}
              isPaid={isPaid}
              label={plan.label}
              note={plan.note}
              price={plan.price}
              nextRenewal={nextRenewal}
              lastPaymentDate={lastPaymentDate}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <BillingSummaryCard
                subtotal={subtotal}
                tax={tax}
                total={total}
                discount={discount}
                onBillingHelp={() => openSupport("billing")}
              />

              <AccountActivityCard
                accountCreated={accountCreated}
                billingActivated={isPaid ? billingActivated : "Not active"}
                planLabel={plan.label}
              />
            </div>

            <PaymentHistoryCard
              isPaid={isPaid}
              records={paymentHistoryRecords}
              onView={openPaymentRecord}
              onViewAll={() => setInvoiceHistoryOpen(true)}
            />

            <PlanAccessCard planKey={planKey} />

            <ManageBillingCard
              isPaid={isPaid}
              onManage={() => openBillingPortal("manage_subscription")}
              onUpdatePayment={() => openBillingPortal("update_payment_method")}
              onInvoices={() => openBillingPortal("invoices")}
              onCancel={() => openBillingPortal("cancel_subscription")}
              onChooseBLL={() => {
                window.location.href = "/checkout?plan=bll-monthly"
              }}
              onChoosePremium={() => {
                window.location.href = "/checkout?plan=premium"
              }}
            />
          </div>
        ) : null}
      </div>

      {invoiceHistoryOpen && (
        <InvoiceHistoryModal
          isPaid={isPaid}
          paidAt={paymentHistoryRecords[0]?.paidAt || profile?.billing_last_paid_at}
          total={paymentHistoryRecords[0]?.amount || total}
          onClose={() => setInvoiceHistoryOpen(false)}
          onView={openLatestInvoice}
        />
      )}

      {supportOpen && (
        <SupportModal
          tickets={tickets}
          supportTopic={supportTopic}
          supportSubject={supportSubject}
          supportMessage={supportMessage}
          supportLoading={supportLoading}
          supportError={supportError}
          onClose={() => setSupportOpen(false)}
          onRefresh={loadTickets}
          onSubmit={submitSupportTicket}
          onTopicChange={(value) => {
            setSupportTopic(value)
            setSupportSubject(
              value === "billing" ? "Billing support request" : topicLabel(value),
            )
          }}
          onSubjectChange={setSupportSubject}
          onMessageChange={setSupportMessage}
        />
      )}
    </div>
  )
}
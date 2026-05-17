"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, HelpCircle, Loader2, RefreshCcw, Send, X } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

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

const supportTopics = [
  { value: "billing", label: "Billing or payment issue" },
  { value: "subscription", label: "Subscription change" },
  { value: "invoice", label: "Invoice or receipt request" },
  { value: "technical", label: "Technical issue" },
  { value: "account", label: "Account access issue" },
  { value: "other", label: "Other question" },
]

const plans = {
  free: {
    label: "Free",
    price: "$0",
    note: "Limited preview access",
  },
  "bll-monthly": {
    label: "BLL Monthly",
    price: "$19.99",
    note: "Black Letter Law memorization access",
  },
  premium: {
    label: "Premium",
    price: "$24.99",
    note: "Full memorization access with premium tools",
  },
}

function normalizePlan(plan: string | null | undefined) {
  const value = String(plan || "free").toLowerCase()

  if (value === "premium") return "premium"

  if (value === "bll-monthly" || value === "bll_monthly" || value === "bll") {
    return "bll-monthly"
  }

  return "free"
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

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (typeof cents !== "number") return "Not available"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}

function topicLabel(value: string) {
  return supportTopics.find((topic) => topic.value === value)?.label || "Support request"
}

function StatusText({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      Inactive
    </span>
  )
}

function Row({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[170px_1fr_auto] items-center gap-4 border-b border-slate-200 py-3 text-[13px] last:border-b-0">
      <div className="font-medium text-slate-500">{label}</div>
      <div className="min-w-0 font-semibold text-slate-900">{value}</div>
      <div>{action}</div>
    </div>
  )
}

function SmallButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  )
}

export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<ProfileData | null>(null)

  const [supportOpen, setSupportOpen] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState("")
  const [supportTopic, setSupportTopic] = useState("billing")
  const [supportSubject, setSupportSubject] = useState("Billing or payment issue")
  const [supportMessage, setSupportMessage] = useState("")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [invoiceHistoryOpen, setInvoiceHistoryOpen] = useState(false)

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

      const res = await fetch("/api/profile", {
        cache: "no-store",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to load subscription data.")
        return
      }

      const data: ProfileData = await res.json()
      setProfile(data)
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

      const res = await fetch("/api/support/tickets", {
        cache: "no-store",
      })

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
    if (supportOpen) {
      loadTickets()
    }
  }, [supportOpen])

  function openSupport(topic: string) {
    const label = topicLabel(topic)
    setSupportTopic(topic)
    setSupportSubject(label)
    setSupportMessage("")
    setSupportError("")
    setSupportOpen(true)
  }

  async function openBillingPortal(
    action:
      | "manage_subscription"
      | "update_payment_method"
      | "cancel_subscription"
      | "invoices"
  ) {
    try {
      setError("")

      const res = await fetch("/api/paddle/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.url) {
        setError(data?.error || "Unable to open Paddle billing portal.")
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error("OPEN BILLING PORTAL ERROR:", err)
      setError("Unable to open Paddle billing portal.")
    }
  }

  function openLatestInvoice() {
    if (profile?.billing_invoice_url) {
      window.open(profile.billing_invoice_url, "_blank", "noopener,noreferrer")
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
      setSupportSubject(topicLabel(supportTopic))
      await loadTickets()
    } catch (err) {
      console.error("SUPPORT TICKET SUBMIT ERROR:", err)
      setSupportError("Failed to create support ticket.")
    } finally {
      setSupportLoading(false)
    }
  }

  const planKey = normalizePlan(profile?.subscription_tier)
  const plan = plans[planKey]
  const billingStatus = String(profile?.billing_status || "free").toLowerCase()
  const isPaid = planKey !== "free" || billingStatus === "active"
  const currency = profile?.billing_currency || "USD"

  const nextRenewal = formatDate(profile?.billing_period_ends_at)
  const accountCreated = formatDateTime(profile?.created_at)
  const billingActivated = formatDateTime(profile?.billing_last_paid_at || profile?.billing_started_at)
  const lastPayment = formatDateTime(profile?.billing_last_paid_at)

  const subtotal = formatMoney(profile?.billing_amount_cents, currency)
  const tax = formatMoney(profile?.billing_tax_cents, currency)
  const total = formatMoney(profile?.billing_total_cents, currency)

  const discount = profile?.billing_discount_code
    ? profile.billing_discount_amount
      ? `${profile.billing_discount_code} · ${profile.billing_discount_amount}`
      : profile.billing_discount_code
    : "None"

  return (
    <div className="min-h-screen bg-[#F7F8FB] px-8 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 text-[12px] font-semibold text-slate-400">
              Account / Subscription
            </div>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em]">
              Subscription
            </h1>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
          <div className="border-t border-slate-200 py-6 text-[13px] font-medium text-slate-500">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="border-t border-red-200 py-6 text-[13px] font-semibold text-red-600">
            {error}
          </div>
        ) : profile ? (
          <div className="space-y-10">
            <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
              <div className="px-6 py-5">
                <div className="flex items-start justify-between gap-8">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {isPaid ? "Active subscription" : "No active subscription"}
                    </div>

                    <h2 className="text-[24px] font-semibold tracking-[-0.03em]">
                      {plan.label}
                    </h2>

                    <p className="mt-1 text-[13px] font-medium text-slate-300">
                      {plan.note}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[30px] font-semibold tracking-[-0.05em]">
                      {plan.price}
                    </div>
                    <div className="mt-1 text-[12px] font-medium text-slate-400">
                      plus applicable taxes/VAT
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                  <div className="border-r border-white/10 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Email
                    </div>
                    <div className="mt-1 truncate text-[13px] font-semibold text-white">
                      {profile.email}
                    </div>
                  </div>

                  <div className="border-r border-white/10 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Next renewal
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white">
                      {isPaid ? nextRenewal : "Not active"}
                    </div>
                  </div>

                  <div className="border-r border-white/10 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Last payment
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white">
                      {isPaid ? lastPayment : "No payment yet"}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white">
                      {isPaid ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Billing summary
                  </h3>
                  <SmallButton onClick={() => openSupport("billing")}>
                    Billing help
                  </SmallButton>
                </div>

                <div className="border-y border-slate-200">
                  <Row label="Subtotal" value={subtotal} />
                  <Row label="Tax/VAT" value={tax} />
                  <Row label="Amount paid" value={total} />
                  <Row label="Discount" value={discount} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Account activity
                  </h3>
                </div>

                <div className="border-y border-slate-200">
                  <Row label="Created" value={accountCreated} />
                  <Row label="Billing activated" value={isPaid ? billingActivated : "Not active"} />
                  <Row label="Current plan" value={plan.label} />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Payment history
                </h3>

                {isPaid ? (
                  <button
                    type="button"
                    onClick={() => setInvoiceHistoryOpen(true)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-900 hover:bg-white"
                  >
                    View all
                  </button>
                ) : (
                  <span className="text-[12px] font-medium text-slate-400">
                    No records yet
                  </span>
                )}
              </div>

              <div className="border-y border-slate-200">
                <div className="grid grid-cols-[1fr_110px_90px_70px] items-center gap-4 border-b border-slate-200 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span className="text-right">Receipt</span>
                </div>

                {isPaid ? (
                  <div className="grid grid-cols-[1fr_110px_90px_70px] items-center gap-4 py-3 text-[13px]">
                    <span className="font-medium text-slate-900">
                      {profile?.billing_last_paid_at
                        ? formatDate(profile.billing_last_paid_at)
                        : "Latest payment"}
                    </span>

                    <span className="font-medium text-slate-700">
                      {total}
                    </span>

                    <span className="font-semibold text-emerald-700">
                      Paid
                    </span>

                    <button
                      type="button"
                      onClick={openLatestInvoice}
                      className="justify-self-end text-[13px] font-semibold text-slate-900 underline"
                    >
                      View
                    </button>
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] font-medium text-slate-500">
                    No payment history yet.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Manage billing
                </h3>
                <span className="text-[12px] font-medium text-slate-400">
                  Securely handled by Paddle
                </span>
              </div>

              <div className="border-y border-slate-200">
                <button
                  type="button"
                  onClick={() => openBillingPortal("manage_subscription")}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-3 text-left text-[13px] hover:bg-white"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      Manage subscription
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-slate-500">
                      Change, pause, or manage your plan in Paddle.
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-slate-500">
                    Open
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openBillingPortal("update_payment_method")}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-3 text-left text-[13px] hover:bg-white"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      Update payment method
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-slate-500">
                      Update your card or billing details securely in Paddle.
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-slate-500">
                    Open
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openBillingPortal("invoices")}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-3 text-left text-[13px] hover:bg-white"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      View invoices
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-slate-500">
                      Open receipts and invoice records in Paddle.
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-slate-500">
                    Open
                  </span>
                </button>

                {isPaid && (
                  <button
                    type="button"
                    onClick={() => openBillingPortal("cancel_subscription")}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-3 text-left text-[13px] hover:bg-red-50"
                  >
                    <span>
                      <span className="block font-semibold text-red-700">
                        Cancel subscription
                      </span>
                      <span className="mt-1 block text-[12px] font-medium text-red-400">
                        Cancel renewal securely through Paddle.
                      </span>
                    </span>
                    <span className="text-[12px] font-semibold text-red-400">
                      Open
                    </span>
                  </button>
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Support
                </h3>
              </div>

              <div className="border-y border-slate-200">
                <button
                  type="button"
                  onClick={() => openSupport("billing")}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-4 text-left text-[13px] hover:bg-white"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      Contact support
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-slate-500">
                      Choose billing, subscription, invoice, technical, account, or other issue.
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-slate-500">
                    Open
                  </span>
                </button>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Plan access
                </h3>
              </div>

              <div className="grid grid-cols-2 border-y border-slate-200">
                {[
                  "Full BLL rule access",
                  "Spaced repetition",
                  "Weak rule targeting",
                  "Study progress tracking",
                  "120 Golden Rules",
                  "120 Golden Flashcards",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 border-b border-slate-200 py-3 text-[13px] font-semibold text-slate-900"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {feature}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {invoiceHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceHistoryOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                  Invoices
                </h2>
              </div>
            </div>

            <div className="max-h-[calc(86vh-64px)] overflow-y-auto p-5">
              <div className="border-y border-slate-200">
                <div className="grid grid-cols-[1fr_110px_90px_70px] items-center gap-4 border-b border-slate-200 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span className="text-right">Receipt</span>
                </div>

                {isPaid ? (
                  <div className="grid grid-cols-[1fr_110px_90px_70px] items-center gap-4 py-3 text-[13px]">
                    <span className="font-medium text-slate-900">
                      {profile?.billing_last_paid_at
                        ? formatDate(profile.billing_last_paid_at)
                        : "Latest payment"}
                    </span>

                    <span className="font-medium text-slate-700">
                      {total}
                    </span>

                    <span className="font-semibold text-emerald-700">
                      Paid
                    </span>

                    <button
                      type="button"
                      onClick={openLatestInvoice}
                      className="justify-self-end text-[13px] font-semibold text-slate-900 underline"
                    >
                      View
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[13px] font-medium text-slate-500">
                    No invoices yet.
                  </div>
                )}
              </div>

              <p className="mt-4 text-[12px] font-medium leading-5 text-slate-400">
                Older invoice records will appear here after each successful Paddle billing event is stored.
              </p>
            </div>
          </div>
        </div>
      )}

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Support request
                </div>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
                  Contact support
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(88vh-76px)] overflow-y-auto md:grid-cols-[0.85fr_1fr]">
              <form onSubmit={submitSupportTicket} className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Topic
                </label>
                <select
                  value={supportTopic}
                  onChange={(event) => {
                    setSupportTopic(event.target.value)
                    setSupportSubject(topicLabel(event.target.value))
                  }}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] font-medium outline-none focus:border-slate-900"
                >
                  {supportTopics.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Subject
                </label>
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] font-medium outline-none focus:border-slate-900"
                />

                <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Message
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  rows={6}
                  placeholder="Explain the issue..."
                  className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[13px] font-medium outline-none focus:border-slate-900"
                />

                {supportError && (
                  <div className="mt-3 text-[12px] font-semibold text-red-600">
                    {supportError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {supportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit ticket
                </button>
              </form>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Ticket history
                  </h3>
                  <button
                    type="button"
                    onClick={loadTickets}
                    className="text-[12px] font-semibold text-slate-600 hover:text-slate-950"
                  >
                    Refresh
                  </button>
                </div>

                <div className="border-y border-slate-200">
                  {tickets.length === 0 ? (
                    <div className="py-5 text-[13px] font-medium text-slate-500">
                      No tickets yet.
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div key={ticket.id} className="border-b border-slate-200 py-4 last:border-b-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[13px] font-semibold text-slate-900">
                              {ticket.subject}
                            </div>
                            <div className="mt-1 text-[12px] font-medium text-slate-500">
                              {topicLabel(ticket.category)} · {formatDateTime(ticket.created_at)}
                            </div>
                          </div>
                          <span className="text-[12px] font-semibold text-amber-700">
                            {ticket.status}
                          </span>
                        </div>

                        <div className="mt-3 space-y-3">
                          {ticket.messages.map((message) => (
                            <div key={message.id} className="border-l border-slate-300 pl-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  {message.sender}
                                </div>
                                <div className="text-[11px] font-medium text-slate-400">
                                  {formatDateTime(message.created_at)}
                                </div>
                              </div>
                              <div className="mt-1 text-[13px] font-medium leading-5 text-slate-800">
                                {message.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

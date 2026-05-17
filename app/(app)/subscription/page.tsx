"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronLeft,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCcw,
  Send,
  X,
} from "lucide-react"
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

function formatShortDateTime(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

function statusLabel(value: string) {
  if (!value) return "Open"
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  )
}

function SectionHeader({
  title,
  right,
}: {
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-6">
      <h3 className="text-[15px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h3>
      {right}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 px-6 last:border-b-0">
      <div className="text-[16px] font-medium text-slate-500">{label}</div>
      <div className={`text-right text-[16px] font-medium text-slate-700 ${valueClassName}`}>
        {value}
      </div>
    </div>
  )
}

function BillingActionRow({
  icon,
  title,
  subtitle,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full grid-cols-[44px_1fr_auto] items-center gap-4 border-b border-slate-200 px-6 py-4 text-left last:border-b-0 ${
        danger ? "hover:bg-red-50" : "hover:bg-slate-50"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        {icon}
      </span>

      <span>
        <span className={`block text-[16px] font-semibold ${danger ? "text-red-700" : "text-slate-950"}`}>
          {title}
        </span>
        <span className={`mt-1 block text-[15px] font-medium ${danger ? "text-red-400" : "text-slate-400"}`}>
          {subtitle}
        </span>
      </span>

      <span className={`text-[18px] font-medium ${danger ? "text-red-300" : "text-slate-300"}`}>
        →
      </span>
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
  const [supportSubject, setSupportSubject] = useState("Billing support request")
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
    setSupportSubject(topic === "billing" ? "Billing support request" : label)
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
      setSupportSubject(supportTopic === "billing" ? "Billing support request" : topicLabel(supportTopic))
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
  const accountCreated = formatShortDateTime(profile?.created_at)
  const billingActivated = formatShortDateTime(profile?.billing_last_paid_at || profile?.billing_started_at)
  const lastPaymentDate = formatDate(profile?.billing_last_paid_at)

  const subtotal = formatMoney(profile?.billing_amount_cents, currency)
  const tax = formatMoney(profile?.billing_tax_cents, currency)
  const total = formatMoney(profile?.billing_total_cents, currency)

  const discount = profile?.billing_discount_code
    ? profile.billing_discount_amount
      ? `${profile.billing_discount_code} · ${profile.billing_discount_amount}`
      : profile.billing_discount_code
    : "None"

  const discountIsNone = discount === "None"

  return (
    <div className="min-h-screen bg-[#F7F6F2] px-8 py-8 text-slate-950">
      <div className="mx-auto max-w-[980px]">
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
          <Card>
            <div className="p-6 text-[14px] font-medium text-slate-500">
              Loading subscription...
            </div>
          </Card>
        ) : error ? (
          <Card>
            <div className="p-6 text-[14px] font-semibold text-red-600">
              {error}
            </div>
          </Card>
        ) : profile ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl bg-[#111420] text-white shadow-sm">
              <div className="relative px-9 py-9">
                <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="flex items-start justify-between gap-8">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[16px] font-medium text-emerald-300">
                      <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      {isPaid ? "Active subscription" : "No active subscription"}
                    </div>

                    <h2 className="mt-4 font-serif text-[42px] font-normal leading-none tracking-[-0.04em]">
                      {plan.label}
                    </h2>

                    <p className="mt-4 text-[17px] font-medium text-slate-400">
                      {plan.note}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-serif text-[38px] font-normal leading-none tracking-[-0.05em]">
                      {plan.price}
                    </div>
                    <div className="mt-4 text-[16px] font-medium text-slate-500">
                      plus applicable taxes / VAT
                    </div>
                  </div>
                </div>

                <div className="mt-9 grid grid-cols-4 overflow-hidden rounded-xl bg-white/10">
                  <div className="border-r border-slate-950/25 px-5 py-4">
                    <div className="text-[16px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Email
                    </div>
                    <div className="mt-3 truncate text-[16px] font-semibold text-slate-200">
                      {profile.email}
                    </div>
                  </div>

                  <div className="border-r border-slate-950/25 px-5 py-4">
                    <div className="text-[16px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Next renewal
                    </div>
                    <div className="mt-3 text-[16px] font-semibold text-slate-200">
                      {isPaid ? nextRenewal : "Not active"}
                    </div>
                  </div>

                  <div className="border-r border-slate-950/25 px-5 py-4">
                    <div className="text-[16px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Last payment
                    </div>
                    <div className="mt-3 text-[16px] font-semibold text-slate-200">
                      {isPaid ? lastPaymentDate : "No payment yet"}
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[16px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Status
                    </div>
                    <div className="mt-3 text-[16px] font-semibold text-emerald-300">
                      {isPaid ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <SectionHeader title="Billing summary" />
                <SummaryRow label="Subtotal" value={subtotal} />
                <SummaryRow label="Tax / VAT" value={tax} />
                <SummaryRow label="Amount paid" value={total} />
                <SummaryRow
                  label="Discount"
                  value={
                    discountIsNone ? (
                      "None"
                    ) : (
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-[15px] font-semibold text-orange-700">
                        {discount}
                      </span>
                    )
                  }
                />
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 bg-blue-50/80 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => openSupport("billing")}
                    className="text-left text-[16px] font-medium text-blue-600 hover:underline"
                  >
                    ⓘ Payment issue?
                  </button>
                  <button
                    type="button"
                    onClick={() => openSupport("billing")}
                    className="text-[16px] font-semibold text-blue-600 underline underline-offset-2"
                  >
                    Contact billing help →
                  </button>
                </div>
              </Card>

              <Card>
                <SectionHeader title="Account activity" />
                <SummaryRow label="Account created" value={accountCreated} />
                <SummaryRow label="Billing activated" value={isPaid ? billingActivated : "Not active"} />
                <SummaryRow
                  label="Current plan"
                  value={
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700">
                      {plan.label}
                    </span>
                  }
                />
                <SummaryRow label="Payment processor" value="Paddle" />
              </Card>
            </div>

            <Card>
              <SectionHeader
                title="Payment history"
                right={
                  isPaid ? (
                    <button
                      type="button"
                      onClick={() => setInvoiceHistoryOpen(true)}
                      className="text-[15px] font-medium text-slate-400 hover:text-slate-700"
                    >
                      Latest record
                    </button>
                  ) : (
                    <span className="text-[15px] font-medium text-slate-400">
                      No records yet
                    </span>
                  )
                }
              />

              {isPaid ? (
                <div className="grid grid-cols-[52px_1fr_110px_110px_110px_80px] items-center gap-4 px-6 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                    <CreditCard className="h-4 w-4" />
                  </div>

                  <div>
                    <div className="text-[17px] font-semibold text-slate-950">
                      {plan.label}
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-slate-400">
                      Billing period ends {isPaid ? nextRenewal : "Not active"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Paid
                    </div>
                    <div className="mt-1 text-[17px] font-medium text-slate-950">
                      {total}
                    </div>
                  </div>

                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Tax / VAT
                    </div>
                    <div className="mt-1 text-[17px] font-medium text-slate-950">
                      {tax}
                    </div>
                  </div>

                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </div>
                    <div className="mt-1 text-[17px] font-semibold text-emerald-700">
                      Active
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openLatestInvoice}
                    className="justify-self-end text-[15px] font-semibold text-blue-600 underline underline-offset-2"
                  >
                    View
                  </button>
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-[15px] font-medium text-slate-500">
                  No payment history yet.
                </div>
              )}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <SectionHeader
                  title="Plan access"
                  right={
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700">
                      All unlocked
                    </span>
                  }
                />

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
                    className="flex min-h-[54px] items-center gap-3 border-b border-slate-200 px-6 last:border-b-0"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                    <span className="text-[16px] font-medium text-slate-600">
                      {feature}
                    </span>
                  </div>
                ))}
              </Card>

              <Card>
                <SectionHeader title="Support" />

                <button
                  type="button"
                  onClick={() => openSupport("billing")}
                  className="grid min-h-[58px] w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 px-6 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <span className="text-[16px] font-medium text-slate-700">
                    Contact support
                  </span>
                  <span className="text-[15px] font-medium text-slate-400">
                    Open →
                  </span>
                </button>
              </Card>
            </div>

            <Card>
              <SectionHeader
                title="Manage billing"
                right={
                  <span className="text-[15px] font-medium text-slate-400">
                    via Paddle customer portal
                  </span>
                }
              />

              <BillingActionRow
                icon={<CreditCard className="h-4 w-4" />}
                title="Manage subscription"
                subtitle="Cancel, pause, or change your plan"
                onClick={() => openBillingPortal("manage_subscription")}
              />

              <BillingActionRow
                icon={<CreditCard className="h-4 w-4" />}
                title="Update payment method"
                subtitle="Change card or billing details"
                onClick={() => openBillingPortal("update_payment_method")}
              />

              <BillingActionRow
                icon={<FileText className="h-4 w-4" />}
                title="Download invoices"
                subtitle="Export PDF receipts for your records"
                onClick={() => openBillingPortal("invoices")}
              />

              {isPaid && (
                <BillingActionRow
                  icon={<X className="h-4 w-4" />}
                  title="Cancel subscription"
                  subtitle="Cancel renewal through Paddle"
                  danger
                  onClick={() => openBillingPortal("cancel_subscription")}
                />
              )}
            </Card>
          </div>
        ) : null}
      </div>

      {invoiceHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceHistoryOpen(false)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Billing records
                  </div>
                  <h2 className="font-serif text-[30px] font-normal tracking-[-0.04em]">
                    Invoices
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInvoiceHistoryOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(86vh-92px)] overflow-y-auto p-6">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span className="text-right">Receipt</span>
                </div>

                {isPaid ? (
                  <div className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-4 px-5 py-4 text-[15px]">
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
                      className="justify-self-end font-semibold text-blue-600 underline underline-offset-2"
                    >
                      View
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[15px] font-medium text-slate-500">
                    No invoices yet.
                  </div>
                )}
              </div>

              <p className="mt-4 text-[13px] font-medium leading-5 text-slate-400">
                Older invoice records will appear here after each successful Paddle billing event is stored.
              </p>
            </div>
          </div>
        </div>
      )}

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111420] px-7 py-6">
          <div className="max-h-[88vh] w-full max-w-[1450px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-10 py-9">
              <div className="flex items-center gap-7">
                <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <HelpCircle className="h-6 w-6" />
                </div>

                <div>
                  <div className="text-[18px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Support request
                  </div>
                  <h2 className="font-serif text-[36px] font-normal leading-none tracking-[-0.04em] text-slate-950">
                    Contact support
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="grid max-h-[calc(88vh-150px)] overflow-hidden md:grid-cols-[1fr_1.08fr]">
              <form onSubmit={submitSupportTicket} className="overflow-y-auto border-r border-slate-200 px-10 py-10">
                <label className="block text-[18px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Topic
                </label>
                <select
                  value={supportTopic}
                  onChange={(event) => {
                    setSupportTopic(event.target.value)
                    setSupportSubject(event.target.value === "billing" ? "Billing support request" : topicLabel(event.target.value))
                  }}
                  className="mt-4 h-[70px] w-full rounded-2xl border border-slate-300 bg-white px-6 text-[23px] font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  {supportTopics.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>

                <label className="mt-8 block text-[18px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Subject
                </label>
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  className="mt-4 h-[68px] w-full rounded-2xl border border-slate-300 px-6 text-[23px] font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                <label className="mt-8 block text-[18px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Message
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  rows={7}
                  placeholder="Explain the issue in detail. The more context, the faster we can help."
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-300 px-6 py-5 text-[23px] font-medium leading-9 text-slate-950 outline-none placeholder:text-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                {supportError && (
                  <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600">
                    {supportError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="mt-8 inline-flex h-[70px] w-full items-center justify-center gap-4 rounded-xl bg-[#101218] px-6 text-[23px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {supportLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                  Submit ticket
                </button>
              </form>

              <div className="overflow-y-auto bg-[#FAFAF8]">
                <div className="sticky top-0 z-10 flex h-[78px] items-center justify-between border-b border-slate-200 bg-[#FAFAF8] px-9">
                  <h3 className="text-[18px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Ticket history
                  </h3>

                  <button
                    type="button"
                    onClick={loadTickets}
                    className="inline-flex items-center gap-2 text-[20px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    <RefreshCcw className="h-5 w-5" />
                    Refresh
                  </button>
                </div>

                <div className="space-y-4 p-6">
                  {tickets.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-[18px] font-medium text-slate-500">
                      No tickets yet.
                    </div>
                  ) : (
                    tickets.map((ticket) => {
                      const normalizedStatus = statusLabel(ticket.status)
                      const isResolved = normalizedStatus.toLowerCase() === "resolved"

                      return (
                        <div key={ticket.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                            <div>
                              <div className="text-[22px] font-semibold text-slate-950">
                                {ticket.subject}
                              </div>
                              <div className="mt-2 text-[17px] font-medium text-slate-400">
                                {topicLabel(ticket.category)} · {formatDateTime(ticket.created_at)}
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-4 py-2 text-[18px] font-bold ${
                                isResolved
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-orange-50 text-orange-700"
                              }`}
                            >
                              <span className="mr-2">●</span>
                              {normalizedStatus}
                            </span>
                          </div>

                          <div>
                            {ticket.messages.map((message) => {
                              const isSupport = message.sender.toLowerCase() === "support"

                              return (
                                <div
                                  key={message.id}
                                  className={`border-b border-slate-200 px-6 py-5 last:border-b-0 ${
                                    isSupport ? "bg-blue-50/70" : "bg-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className={`text-[18px] font-bold uppercase tracking-[0.14em] ${
                                      isSupport ? "text-blue-600" : "text-slate-400"
                                    }`}>
                                      {message.sender}
                                    </div>
                                    <div className="text-[18px] font-medium text-slate-400">
                                      {formatDateTime(message.created_at)}
                                    </div>
                                  </div>

                                  <div className="mt-3 text-[22px] font-medium leading-8 text-slate-600">
                                    {message.message}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
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

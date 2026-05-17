"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string | null
  billing_status: string | null
  paddle_customer_id: string | null
  paddle_subscription_id: string | null
  paddle_transaction_id: string | null
  paddle_price_id: string | null
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
  billing_discount_id: string | null
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

const planContent = {
  free: {
    label: "Free",
    price: "$0",
    description: "Preview access for exploring Lexora Prep before upgrading.",
  },
  "bll-monthly": {
    label: "BLL Monthly",
    price: "$19.99",
    description: "Full Black Letter Law access with focused memorization tools.",
  },
  premium: {
    label: "Premium",
    price: "$24.99",
    description:
      "Advanced BLL memorization with Golden Rules, Golden Flashcards, spaced repetition, and progress tracking.",
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

function Pill({
  children,
  tone = "neutral",
}: {
  children: string
  tone?: "neutral" | "green" | "orange" | "dark"
}) {
  const classes =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-amber-50 text-amber-700"
        : tone === "dark"
          ? "bg-[#171C3A] text-white"
          : "bg-[#F5F6FB] text-[#65708F]"

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${classes}`}>
      {children}
    </span>
  )
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[#ECEEF6] py-3 last:border-b-0">
      <span className="text-[14px] font-medium text-[#66708F]">{label}</span>
      <span className={`text-right text-[14px] font-semibold ${muted ? "text-[#8B94B4]" : "text-[#10152F]"}`}>
        {value}
      </span>
    </div>
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
  const [supportMessage, setSupportMessage] = useState("")
  const [supportSubject, setSupportSubject] = useState("Billing support request")
  const [tickets, setTickets] = useState<SupportTicket[]>([])

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

      const profileRes = await fetch("/api/profile", {
        cache: "no-store",
      })

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => null)
        setError(data?.error || "Failed to load subscription data.")
        return
      }

      const data: ProfileData = await profileRes.json()
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

  async function submitSupportTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supportMessage.trim()) {
      setSupportError("Please write your message first.")
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
          category: "billing",
          message: supportMessage,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setSupportError(data?.error || "Failed to create support ticket.")
        return
      }

      setSupportMessage("")
      setSupportSubject("Billing support request")
      await loadTickets()
    } catch (err) {
      console.error("SUPPORT TICKET SUBMIT ERROR:", err)
      setSupportError("Failed to create support ticket.")
    } finally {
      setSupportLoading(false)
    }
  }

  const plan = normalizePlan(profile?.subscription_tier)
  const billingStatus = String(profile?.billing_status || "free").toLowerCase()
  const isPaid = plan !== "free" || billingStatus === "active"
  const currentPlan = planContent[plan]
  const currency = profile?.billing_currency || "USD"

  const renewalDate = formatDate(profile?.billing_period_ends_at)
  const accountCreatedAt = formatDateTime(profile?.created_at)
  const billingActivatedAt = formatDateTime(profile?.billing_last_paid_at || profile?.billing_started_at)
  const lastPaidAt = formatDateTime(profile?.billing_last_paid_at)

  const subtotal = formatMoney(profile?.billing_amount_cents, currency)
  const tax = formatMoney(profile?.billing_tax_cents, currency)
  const paidTotal = formatMoney(profile?.billing_total_cents, currency)

  const discountText = profile?.billing_discount_code
    ? profile.billing_discount_amount
      ? `${profile.billing_discount_code} · ${profile.billing_discount_amount}`
      : profile.billing_discount_code
    : "No discount"

  return (
    <div className="min-h-screen bg-[#F5F6FB] px-6 py-8 text-[#10152F]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-6 text-[13px] font-semibold text-[#8B94B4]">
              Account <span className="mx-2">›</span>
              <span className="text-[#303856]">Subscription</span>
            </div>
            <h1 className="font-serif text-[34px] font-semibold tracking-[-0.03em] text-[#111730]">
              Subscription
            </h1>
            <p className="mt-1 text-[15px] font-medium text-[#56607F]">
              Manage your plan, billing, payment history, and support requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4EF] bg-white px-4 py-3 text-[14px] font-semibold text-[#59617D] shadow-sm transition hover:bg-[#FAFAFE] disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-[#E1E4EF] bg-white p-8 text-[14px] font-semibold text-[#66708F] shadow-sm">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-[14px] font-semibold text-red-600 shadow-sm">
            {error}
          </div>
        ) : profile ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
            <main className="space-y-6">
              <section className="overflow-hidden rounded-[30px] border border-[#E1E4EF] bg-white shadow-sm">
                <div className="grid lg:grid-cols-[1fr_250px]">
                  <div className="p-7">
                    <Pill tone={isPaid ? "green" : "neutral"}>
                      {isPaid ? "Active plan" : "Current plan"}
                    </Pill>

                    <h2 className="mt-4 font-serif text-[34px] font-semibold tracking-[-0.03em] text-[#111730]">
                      {currentPlan.label}
                    </h2>

                    <p className="mt-3 max-w-xl text-[15px] font-medium leading-7 text-[#56607F]">
                      {currentPlan.description}
                    </p>

                    <div className="mt-7 grid gap-8 border-t border-[#ECEEF6] pt-5 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                          Account
                        </h3>
                        <Row label="Email" value={profile.email} />
                        <Row label="Current plan" value={currentPlan.label} />
                        <Row label="Status" value={isPaid ? "Active subscription" : "No active subscription"} />
                      </div>

                      <div>
                        <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                          Billing
                        </h3>
                        <Row label="Next renewal" value={isPaid ? renewalDate : "Not active"} />
                        <Row label="Payment method" value="Paddle checkout" />
                        <Row label="Last payment" value={isPaid ? lastPaidAt : "No payment yet"} />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-[#171C3A] p-7 text-white">
                    <div className="absolute right-[-60px] top-[-60px] h-44 w-44 rounded-full bg-[#6B5DE4]/40 blur-2xl" />
                    <div className="absolute bottom-[-80px] left-[-60px] h-52 w-52 rounded-full bg-[#7EE7C8]/20 blur-3xl" />

                    <div className="relative">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80">
                        <Sparkles className="h-3.5 w-3.5" />
                        Lexora access
                      </div>

                      <div className="mt-8 text-[12px] font-bold uppercase tracking-[0.22em] text-white/50">
                        Monthly price
                      </div>

                      <div className="mt-2 font-serif text-[48px] leading-none tracking-[-0.05em] drop-shadow-[0_0_24px_rgba(255,255,255,0.22)]">
                        {currentPlan.price}
                      </div>

                      <div className="mt-2 text-[14px] font-medium text-white/60">
                        plus applicable taxes/VAT
                      </div>
                    </div>

                    <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/10 p-4">
                      <div className="text-[13px] font-semibold text-white/60">
                        Next renewal
                      </div>
                      <div className="mt-1 text-[17px] font-bold text-white">
                        {isPaid ? renewalDate : "Not active"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-[#E1E4EF] bg-white shadow-sm">
                <div className="border-b border-[#ECEEF6] px-7 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                      Payment history
                    </h3>
                    <span className="text-[13px] font-semibold text-[#8B94B4]">
                      Latest billing record
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  {isPaid ? (
                    <div className="rounded-[24px] border border-[#ECEEF6] bg-[#FAFAFE] p-5">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Pill tone="green">Paid plan active</Pill>
                            {profile.billing_discount_code && <Pill tone="orange">Discount applied</Pill>}
                          </div>

                          <h4 className="mt-4 text-[18px] font-bold text-[#111730]">
                            {currentPlan.label} subscription
                          </h4>

                          <p className="mt-1 text-[14px] font-medium text-[#66708F]">
                            Billing period ends {renewalDate}
                          </p>
                        </div>

                        <div className="min-w-[230px] rounded-2xl bg-white p-4">
                          <Row label="Subtotal" value={subtotal} />
                          <Row label="Tax/VAT" value={tax} />
                          <Row label="Amount paid" value={paidTotal} />
                          <Row label="Discount" value={discountText} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-[#ECEEF6] bg-[#FAFAFE] p-8 text-center">
                      <FileText className="mx-auto h-8 w-8 text-[#98A1C0]" />
                      <div className="mt-4 text-[15px] font-bold text-[#303856]">
                        No payment history yet
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                        Your receipts and billing activity will appear here after payment.
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-[#E1E4EF] bg-white shadow-sm">
                <div className="border-b border-[#ECEEF6] px-7 py-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                    Account activity
                  </h3>
                </div>

                <div className="grid gap-0 md:grid-cols-3">
                  <div className="border-b border-[#ECEEF6] p-6 md:border-b-0 md:border-r">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="mt-4 text-[15px] font-bold text-[#111730]">
                      Account created
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                      {accountCreatedAt}
                    </div>
                  </div>

                  <div className="border-b border-[#ECEEF6] p-6 md:border-b-0 md:border-r">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="mt-4 text-[15px] font-bold text-[#111730]">
                      Billing activated
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                      {isPaid ? billingActivatedAt : "Not active"}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5DE4]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="mt-4 text-[15px] font-bold text-[#111730]">
                      Current plan
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                      {currentPlan.label}
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-[#E1E4EF] bg-white shadow-sm">
                <div className="border-b border-[#ECEEF6] px-7 py-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                    Plan access
                  </h3>
                </div>

                <div className="grid md:grid-cols-2">
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
                      className="flex items-center gap-3 border-b border-r border-[#ECEEF6] px-6 py-4 text-[15px] font-semibold text-[#202744] even:border-r-0"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>
              </section>
            </main>

            <aside className="space-y-6">
              <section className="rounded-[30px] border border-[#E1E4EF] bg-white p-6 shadow-sm">
                <Pill tone={isPaid ? "green" : "neutral"}>
                  {isPaid ? "Active" : "Upgrade option"}
                </Pill>

                <h3 className="mt-4 font-serif text-[25px] font-semibold tracking-[-0.03em] text-[#111730]">
                  {isPaid ? `${currentPlan.label} active` : "Upgrade to BLL Monthly"}
                </h3>

                <p className="mt-3 text-[14px] font-medium leading-6 text-[#56607F]">
                  {isPaid
                    ? "Your paid access is active. Billing changes are handled through Paddle."
                    : "Upgrade to unlock full BLL memorization access."}
                </p>
              </section>

              <section className="rounded-[30px] border border-[#E1E4EF] bg-white shadow-sm">
                <div className="border-b border-[#ECEEF6] px-6 py-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                    Billing actions
                  </h3>
                </div>

                <div className="p-5">
                  <button
                    type="button"
                    onClick={() => setSupportOpen(true)}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#171C3A] px-5 py-4 text-left text-white transition hover:bg-[#20264C]"
                  >
                    <span>
                      <span className="block text-[14px] font-bold">
                        Request billing help
                      </span>
                      <span className="mt-1 block text-[12px] font-medium text-white/60">
                        Subscription, invoice, or payment issue
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="mt-4 rounded-2xl border border-[#ECEEF6] bg-[#FAFAFE] p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-[#6B5DE4]" />
                      <div>
                        <div className="text-[14px] font-bold text-[#111730]">
                          Paddle billing portal
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-[#8B94B4]">
                          Add this next when we create the portal session API.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-[#E1E4EF] bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F1FF] text-[#6B5DE4]">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#151A33]">
                      Need help?
                    </h3>
                    <p className="mt-2 text-[14px] font-medium leading-6 text-[#56607F]">
                      Open a ticket without leaving this page. Your request stays saved in your account.
                    </p>

                    <button
                      type="button"
                      onClick={() => setSupportOpen(true)}
                      className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#6B5DE4] hover:underline"
                    >
                      Contact support
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1020]/55 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECEEF6] px-7 py-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F3F1FF] px-3 py-1 text-[12px] font-bold text-[#6B5DE4]">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Support tickets
                </div>
                <h2 className="mt-3 font-serif text-[30px] font-semibold tracking-[-0.03em] text-[#111730]">
                  How can we help?
                </h2>
                <p className="mt-1 text-[14px] font-medium text-[#66708F]">
                  Submit a request and track replies here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7FC] text-[#59617D] hover:bg-[#EEF0F7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-116px)] overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={submitSupportTicket} className="border-b border-[#ECEEF6] p-7 lg:border-b-0 lg:border-r">
                <label className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                  Subject
                </label>
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#E1E4EF] bg-white px-4 py-3 text-[14px] font-semibold text-[#111730] outline-none focus:border-[#6B5DE4]"
                />

                <label className="mt-5 block text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                  Message
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  rows={7}
                  placeholder="Explain the billing or subscription issue..."
                  className="mt-2 w-full resize-none rounded-2xl border border-[#E1E4EF] bg-white px-4 py-3 text-[14px] font-medium text-[#111730] outline-none focus:border-[#6B5DE4]"
                />

                {supportError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
                    {supportError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171C3A] px-5 py-3.5 text-[14px] font-bold text-white transition hover:bg-[#20264C] disabled:opacity-60"
                >
                  {supportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit ticket
                </button>
              </form>

              <div className="bg-[#FAFAFE] p-7">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                    Ticket history
                  </h3>
                  <button
                    type="button"
                    onClick={loadTickets}
                    className="text-[12px] font-bold text-[#6B5DE4] hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {tickets.length === 0 ? (
                    <div className="rounded-[24px] border border-[#E1E4EF] bg-white p-7 text-center">
                      <HelpCircle className="mx-auto h-8 w-8 text-[#98A1C0]" />
                      <div className="mt-4 text-[15px] font-bold text-[#303856]">
                        No tickets yet
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                        Your support requests will appear here.
                      </div>
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-[24px] border border-[#E1E4EF] bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[15px] font-bold text-[#111730]">
                              {ticket.subject}
                            </div>
                            <div className="mt-1 text-[12px] font-semibold text-[#8B94B4]">
                              Created {formatDateTime(ticket.created_at)}
                            </div>
                          </div>
                          <Pill tone={ticket.status === "open" ? "orange" : "green"}>
                            {ticket.status}
                          </Pill>
                        </div>

                        <div className="mt-4 space-y-3">
                          {ticket.messages.map((message) => (
                            <div
                              key={message.id}
                              className="rounded-2xl border border-[#ECEEF6] bg-[#FAFAFE] p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B5DE4]">
                                  {message.sender}
                                </div>
                                <div className="text-[11px] font-semibold text-[#A0A8C4]">
                                  {formatDateTime(message.created_at)}
                                </div>
                              </div>
                              <div className="mt-2 text-[13px] font-medium leading-5 text-[#303856]">
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

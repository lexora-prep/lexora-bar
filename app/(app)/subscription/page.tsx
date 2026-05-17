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
  ShieldCheck,
  Star,
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
    description:
      "Basic preview access before upgrading to full BLL training.",
  },
  "bll-monthly": {
    label: "BLL Monthly",
    price: "$19.99",
    description:
      "Full Black Letter Law access with focused memorization tools.",
  },
  premium: {
    label: "Premium",
    price: "$24.99",
    description:
      "Advanced BLL memorization access with Golden Rules, Golden Flashcards, and stronger review tools.",
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

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "green" | "orange" }) {
  const classes =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-amber-50 text-amber-700"
        : "bg-[#F7F7FC] text-[#59617D]"

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${classes}`}>
      {children}
    </span>
  )
}

function DetailRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#E8EAF3] py-3 last:border-b-0">
      <span className="text-[14px] text-[#5F6785]">{label}</span>
      <span className={`text-right text-[14px] font-semibold text-[#151A33] ${valueClassName}`}>
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
  const isBillingConnected =
    billingStatus === "active" &&
    Boolean(profile?.paddle_subscription_id || profile?.paddle_transaction_id)

  const currentPlan = planContent[plan]
  const currency = profile?.billing_currency || "USD"
  const renewalDate = formatDate(profile?.billing_period_ends_at)
  const accountCreatedAt = formatDateTime(profile?.created_at)
  const billingActivatedAt = formatDateTime(profile?.billing_last_paid_at || profile?.billing_started_at)

  const subtotal = formatMoney(profile?.billing_amount_cents, currency)
  const tax = formatMoney(profile?.billing_tax_cents, currency)
  const paidTotal = formatMoney(profile?.billing_total_cents, currency)

  return (
    <div className="min-h-screen bg-[#F5F6FB] px-6 py-8 text-[#10152F]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-7 text-[13px] font-semibold text-[#8B94B4]">
              Account <span className="mx-2">›</span>
              <span className="text-[#303856]">Subscription</span>
            </div>
            <h1 className="font-serif text-[34px] font-semibold tracking-[-0.03em] text-[#111730]">
              Subscription
            </h1>
            <p className="mt-1 text-[15px] font-medium text-[#56607F]">
              Manage your plan, billing details, payment history, and support requests.
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
          <div className="rounded-3xl border border-[#E1E4EF] bg-white p-8 text-[14px] font-semibold text-[#66708F] shadow-sm">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-[14px] font-semibold text-red-600 shadow-sm">
            {error}
          </div>
        ) : profile ? (
          <>
            {!isBillingConnected && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] font-semibold text-amber-700">
                Billing sync pending. Paddle data will appear once your subscription records are connected. Taxes/VAT are calculated separately at checkout based on your location.
              </div>
            )}

            {isBillingConnected && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-700">
                Billing connected. Your subscription record is active and synced with Paddle.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <main className="space-y-6">
                <section className="rounded-3xl border border-[#E1E4EF] bg-white p-7 shadow-sm">
                  <div className="flex flex-col justify-between gap-6 md:flex-row">
                    <div>
                      <StatusPill tone={isPaid ? "green" : "neutral"}>
                        {isPaid ? "Current paid plan" : "Current plan"}
                      </StatusPill>

                      <h2 className="mt-4 font-serif text-[32px] font-semibold tracking-[-0.03em] text-[#111730]">
                        {currentPlan.label}
                      </h2>

                      <p className="mt-3 max-w-xl text-[15px] font-medium leading-7 text-[#56607F]">
                        {currentPlan.description}
                      </p>
                    </div>

                    <div className="flex h-[118px] w-[150px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#171C3A] text-white">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                        Price
                      </div>
                      <div className="font-serif text-[34px] leading-none">
                        {currentPlan.price}
                      </div>
                      <div className="mt-2 text-[13px] text-white/60">
                        per month
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 border-t border-[#E8EAF3] pt-5">
                    <div className="grid gap-8 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                          Account
                        </h3>
                        <DetailRow label="Email" value={profile.email} />
                        <DetailRow label="Current plan" value={currentPlan.label} />
                        <DetailRow
                          label="Status"
                          value={isPaid ? "Active subscription" : "No active subscription"}
                        />
                      </div>

                      <div>
                        <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                          Billing details
                        </h3>
                        <DetailRow
                          label="Renewal date"
                          value={isBillingConnected ? renewalDate : "Pending sync"}
                          valueClassName={isBillingConnected ? "text-emerald-700" : "text-amber-700"}
                        />
                        <DetailRow label="Payment method" value="Paddle" />
                        <DetailRow
                          label="Invoices"
                          value={profile.billing_invoice_url ? "Available" : "Not available yet"}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E1E4EF] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E8EAF3] px-6 py-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                      Billing summary
                    </h3>
                    <span className="text-[13px] font-semibold text-[#8B94B4]">
                      {isBillingConnected ? "Synced from Paddle" : "Waiting for Paddle sync"}
                    </span>
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="border-b border-[#E8EAF3] p-6 md:border-b-0 md:border-r">
                      <DetailRow label="Subtotal" value={subtotal} />
                      <DetailRow label="Tax/VAT" value={tax} />
                      <DetailRow label="Amount paid" value={paidTotal} />
                    </div>

                    <div className="p-6">
                      <DetailRow
                        label="Discount"
                        value={
                          profile.billing_discount_code
                            ? profile.billing_discount_amount
                              ? `${profile.billing_discount_code} · ${profile.billing_discount_amount}`
                              : profile.billing_discount_code
                            : "None"
                        }
                      />
                      <DetailRow
                        label="Subscription ID"
                        value={profile.paddle_subscription_id || "Not available"}
                      />
                      <DetailRow
                        label="Transaction ID"
                        value={profile.paddle_transaction_id || "Not available"}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E1E4EF] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E8EAF3] px-6 py-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                      Plan access
                    </h3>
                    <span className="text-[13px] font-semibold text-[#8B94B4]">
                      Features under your current plan
                    </span>
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
                        className="flex items-center gap-3 border-b border-r border-[#E8EAF3] px-6 py-4 text-[15px] font-semibold text-[#202744] even:border-r-0"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E1E4EF] bg-white shadow-sm">
                  <div className="border-b border-[#E8EAF3] px-6 py-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                      Account activity
                    </h3>
                  </div>

                  <div className="space-y-5 p-6">
                    <div className="flex gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[15px] font-bold text-[#151A33]">
                          Account created
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                          {accountCreatedAt}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[15px] font-bold text-[#151A33]">
                          Billing status
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                          {isBillingConnected
                            ? `Active since ${billingActivatedAt}`
                            : "Waiting for subscription records to be connected."}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F1FF] text-[#6B5DE4]">
                        <Star className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[15px] font-bold text-[#151A33]">
                          Current plan loaded
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-[#8B94B4]">
                          Current plan: {currentPlan.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </main>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-[#E1E4EF] bg-white p-6 shadow-sm">
                  <StatusPill tone="green">
                    {isPaid ? "Highest plan" : "Upgrade available"}
                  </StatusPill>

                  <h3 className="mt-4 font-serif text-[25px] font-semibold tracking-[-0.03em] text-[#111730]">
                    {isPaid ? `${currentPlan.label} active` : "Upgrade your plan"}
                  </h3>

                  <p className="mt-3 text-[14px] font-medium leading-6 text-[#56607F]">
                    {isPaid
                      ? "Your paid Lexora Prep access is active."
                      : "Upgrade to unlock full BLL training access."}
                  </p>
                </section>

                <section className="rounded-3xl border border-[#E1E4EF] bg-white shadow-sm">
                  <div className="border-b border-[#E8EAF3] px-6 py-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#98A1C0]">
                      Manage billing
                    </h3>
                  </div>

                  <div className="space-y-1 p-5">
                    {[
                      ["Manage subscription", "Cancel, upgrade, or modify", CreditCard],
                      ["Update payment method", "Change card or billing info", CreditCard],
                      ["View invoices", "Download PDF receipts", FileText],
                    ].map(([title, subtitle, Icon]) => {
                      const ItemIcon = Icon as typeof CreditCard

                      return (
                        <div
                          key={String(title)}
                          className="flex items-center justify-between rounded-2xl px-3 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7FC] text-[#59617D]">
                              <ItemIcon className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="text-[14px] font-bold text-[#151A33]">
                                {String(title)}
                              </div>
                              <div className="text-[13px] font-medium text-[#8B94B4]">
                                {String(subtitle)}
                              </div>
                            </div>
                          </div>
                          <StatusPill tone="orange">Soon</StatusPill>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E1E4EF] bg-white p-6 shadow-sm">
                  <div className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F1FF] text-[#6B5DE4]">
                      <HelpCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#151A33]">
                        Need billing help?
                      </h3>
                      <p className="mt-2 text-[14px] font-medium leading-6 text-[#56607F]">
                        Open a support ticket without leaving this page. Your ticket history will stay attached to your account.
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
          </>
        ) : null}
      </div>

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8EAF3] px-6 py-5">
              <div>
                <h2 className="font-serif text-[27px] font-semibold tracking-[-0.03em] text-[#111730]">
                  Support center
                </h2>
                <p className="mt-1 text-[14px] font-medium text-[#66708F]">
                  Submit a billing request and track your ticket history.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7FC] text-[#59617D] hover:bg-[#EEF0F7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-92px)] overflow-y-auto md:grid-cols-[1fr_1fr]">
              <form onSubmit={submitSupportTicket} className="border-b border-[#E8EAF3] p-6 md:border-b-0 md:border-r">
                <label className="block text-[13px] font-bold uppercase tracking-[0.14em] text-[#98A1C0]">
                  Subject
                </label>
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#E1E4EF] px-4 py-3 text-[14px] font-medium outline-none focus:border-[#6B5DE4]"
                />

                <label className="mt-5 block text-[13px] font-bold uppercase tracking-[0.14em] text-[#98A1C0]">
                  Message
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  rows={7}
                  placeholder="Describe the billing or subscription issue..."
                  className="mt-2 w-full resize-none rounded-2xl border border-[#E1E4EF] px-4 py-3 text-[14px] font-medium outline-none focus:border-[#6B5DE4]"
                />

                {supportError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
                    {supportError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171C3A] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#20264C] disabled:opacity-60"
                >
                  {supportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit ticket
                </button>
              </form>

              <div className="p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#98A1C0]">
                  Ticket history
                </h3>

                <div className="mt-4 space-y-4">
                  {tickets.length === 0 ? (
                    <div className="rounded-2xl border border-[#E1E4EF] bg-[#FAFAFE] p-5 text-[14px] font-medium text-[#66708F]">
                      No support tickets yet.
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-2xl border border-[#E1E4EF] bg-[#FAFAFE] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[15px] font-bold text-[#151A33]">
                              {ticket.subject}
                            </div>
                            <div className="mt-1 text-[12px] font-semibold text-[#8B94B4]">
                              Created {formatDateTime(ticket.created_at)}
                            </div>
                          </div>
                          <StatusPill tone={ticket.status === "open" ? "orange" : "green"}>
                            {ticket.status}
                          </StatusPill>
                        </div>

                        <div className="mt-4 space-y-3">
                          {ticket.messages.map((message) => (
                            <div key={message.id} className="rounded-xl bg-white p-3">
                              <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#98A1C0]">
                                {message.sender}
                              </div>
                              <div className="mt-1 text-[13px] font-medium leading-5 text-[#303856]">
                                {message.message}
                              </div>
                              <div className="mt-2 text-[11px] font-semibold text-[#A0A8C4]">
                                {formatDateTime(message.created_at)}
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

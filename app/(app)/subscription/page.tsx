"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  subscription_tier: string | null
  mbe_access: boolean
}

type PlanKey = "free" | "bll-monthly" | "premium"

type PlanDefinition = {
  id: PlanKey
  label: string
  price: string
  billing: string
  description: string
  features: string[]
}

const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    price: "$0",
    billing: "/mo",
    description: "Basic account access. Upgrade when you are ready to unlock full BLL training.",
    features: [
      "Account access",
      "Basic dashboard",
      "Limited preview access",
    ],
  },
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    price: "$19.99",
    billing: "/mo",
    description: "Full Black Letter Law memorization access with focused review tools.",
    features: [
      "Full BLL rule access",
      "Spaced repetition",
      "Weak rule targeting",
      "Study progress tracking",
    ],
  },
  premium: {
    id: "premium",
    label: "Premium",
    price: "$24.99",
    billing: "/mo",
    description: "Advanced BLL memorization tools and premium rule sets.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced review tools",
    ],
  },
}

function normalizePlan(value: string | null | undefined): PlanKey {
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

  return "free"
}

function planBadgeClass(plan: PlanKey) {
  if (plan === "premium") {
    return "border-violet-200 bg-violet-50 text-violet-700"
  }

  if (plan === "bll-monthly") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-600"
}

function PlanBadge({ plan }: { plan: PlanKey }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${planBadgeClass(
        plan
      )}`}
    >
      {PLANS[plan].label}
    </span>
  )
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string
  value: React.ReactNode
  helper?: string
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {helper ? <div className="mt-1 text-sm leading-5 text-slate-500">{helper}</div> : null}
      </div>
      <div className="shrink-0 text-right text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function FeatureItem({
  children,
  enabled = true,
}: {
  children: React.ReactNode
  enabled?: boolean
}) {
  return (
    <div className={enabled ? "flex items-center gap-2 text-sm text-slate-700" : "flex items-center gap-2 text-sm text-slate-400"}>
      <CheckCircle2 className={enabled ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-300"} />
      <span>{children}</span>
    </div>
  )
}

export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState<PlanKey>("free")

  const currentPlan = PLANS[plan]
  const isPaid = plan !== "free"
  const recommendedPlan = plan === "premium" ? null : plan === "bll-monthly" ? PLANS.premium : PLANS["bll-monthly"]

  async function loadSubscription(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      if (!showRefreshing) setLoading(true)
      setError("")

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError("Unable to load subscription data.")
        return
      }

      const profileRes = await fetch(`/api/profile?userId=${user.id}`, {
        cache: "no-store",
      })

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => null)
        setError(data?.error || "Failed to load subscription data.")
        return
      }

      const profile: ProfileData = await profileRes.json()

      setEmail(profile.email || "")
      setPlan(normalizePlan(profile.subscription_tier))
    } catch (err) {
      console.error("SUBSCRIPTION PAGE LOAD ERROR:", err)
      setError("Something went wrong while loading subscription.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadSubscription(false)
  }, [])

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F7F8FC] text-slate-950">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-4xl">
              Subscription
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              View your current plan, billing status, and available upgrade options.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          {currentPlan.label}
                        </h2>
                        <PlanBadge plan={plan} />
                      </div>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        {currentPlan.description}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                      <div className="text-xs font-medium text-white/55">Current price</div>
                      <div className="mt-1 flex items-end gap-1">
                        <span className="text-3xl font-semibold tracking-[-0.04em]">
                          {currentPlan.price}
                        </span>
                        <span className="pb-1 text-sm text-white/60">{currentPlan.billing}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-0 p-6 md:grid-cols-2 md:gap-8">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Account
                    </div>

                    <DetailRow label="Email" value={email || "—"} />
                    <DetailRow label="Current plan" value={<PlanBadge plan={plan} />} />
                    <DetailRow
                      label="Billing status"
                      value={isPaid ? "Active" : "Free"}
                      helper={isPaid ? "Your paid plan is active." : "No paid subscription is active yet."}
                    />
                  </div>

                  <div className="mt-6 md:mt-0">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Billing details
                    </div>

                    <DetailRow
                      label="Renewal date"
                      value="Pending sync"
                      helper="Will appear after Paddle subscription records are stored."
                    />
                    <DetailRow
                      label="Payment method"
                      value="Paddle"
                      helper="Payments, invoices, taxes, and receipts are handled by Paddle."
                    />
                    <DetailRow
                      label="Invoices"
                      value="Pending sync"
                      helper="Invoice history will appear after Paddle data is connected."
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                      Plan access
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Access available under your current subscription.
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FeatureItem enabled={isPaid}>Full BLL rule access</FeatureItem>
                  <FeatureItem enabled={isPaid}>Spaced repetition</FeatureItem>
                  <FeatureItem enabled={isPaid}>Weak rule targeting</FeatureItem>
                  <FeatureItem enabled={isPaid}>Study progress tracking</FeatureItem>
                  <FeatureItem enabled={plan === "premium"}>120 Golden Rules</FeatureItem>
                  <FeatureItem enabled={plan === "premium"}>120 Golden Flashcards</FeatureItem>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                      Payment history
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Paid months, invoices, discounts, and receipts will appear here after Paddle records are stored.
                    </p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-slate-400" />
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    No payment history synced yet
                  </div>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Once Paddle webhook data is stored in your database, this section will show invoices and billing history.
                  </p>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  Manage billing
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Billing actions will be connected to Paddle customer portal.
                </p>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    disabled
                    className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
                  >
                    Manage subscription
                    <span className="text-xs">Soon</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
                  >
                    Update payment method
                    <span className="text-xs">Soon</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
                  >
                    View invoices
                    <span className="text-xs">Soon</span>
                  </button>
                </div>
              </section>

              {recommendedPlan ? (
                <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade option
                  </div>

                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    Upgrade to {recommendedPlan.label}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {recommendedPlan.description}
                  </p>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-500">Plan price</div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      {recommendedPlan.price}
                      <span className="text-sm font-medium text-slate-500">
                        {recommendedPlan.billing}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/checkout?plan=${recommendedPlan.id}&registered=1`}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Upgrade
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </section>
              ) : (
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-emerald-950">
                    Premium active
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    You are already on the highest Lexora Prep plan.
                  </p>
                </section>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <HelpCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      Need billing help?
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Contact support if your payment succeeded but your access has not updated.
                    </p>

                    <Link
                      href="/contact"
                      className="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900"
                    >
                      Contact support
                    </Link>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

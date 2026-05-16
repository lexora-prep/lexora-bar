"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  ReceiptText,
  RefreshCw,
  Star,
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
  upgradeDescription: string
  features: string[]
}

const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    price: "$0",
    billing: "per month",
    description:
      "Basic access. Upgrade when you're ready to unlock full BLL training across all UBE subjects.",
    upgradeDescription:
      "Basic access. Upgrade when you're ready to unlock full BLL training.",
    features: ["Basic account access", "Limited BLL preview", "Study dashboard"],
  },
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    price: "$19.99",
    billing: "/month",
    description:
      "Full Black Letter Law access with focused memorization tools across all UBE subjects.",
    upgradeDescription:
      "Full Black Letter Law access with focused memorization tools across all UBE subjects.",
    features: [
      "Full BLL rule library",
      "Spaced repetition engine",
      "Weak rule targeting",
      "Progress tracking",
    ],
  },
  premium: {
    id: "premium",
    label: "Premium",
    price: "$24.99",
    billing: "/month",
    description:
      "Advanced BLL memorization access with Golden Rules, Golden Flashcards, and stronger review tools.",
    upgradeDescription:
      "Advanced BLL memorization access with Golden Rules, Golden Flashcards, and stronger review tools.",
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

function planStatusLabel(plan: PlanKey) {
  if (plan === "free") return "No active subscription"
  return "Active subscription"
}

function syncPill(label = "Pending sync") {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3CD] px-2.5 py-1 text-[12px] font-medium text-[#D97706]">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

function planPill(plan: PlanKey) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#1A1F3A17] bg-[#F9F9FC] px-3 py-1 text-[12px] font-medium text-[#5A6282]">
      {PLANS[plan].label}
    </span>
  )
}

function accessIcon(enabled: boolean) {
  if (enabled) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#E8F9F2]">
        <Check className="h-3 w-3 text-[#12A96A]" />
      </span>
    )
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F6F7FB]">
      <Lock className="h-3 w-3 text-[#9099B8]" />
    </span>
  )
}

function accessTextClass(enabled: boolean) {
  return enabled ? "text-[#1A1F3A]" : "text-[#9099B8]"
}

export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState<PlanKey>("free")
  const [activeTab, setActiveTab] = useState<"payments" | "activity">("payments")

  const currentPlan = PLANS[plan]
  const isPaid = plan !== "free"
  const isPremium = plan === "premium"

  const upgradePlan: PlanDefinition | null =
    plan === "free" ? PLANS["bll-monthly"] : plan === "bll-monthly" ? PLANS.premium : null

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
    <div className="min-h-[calc(100vh-64px)] bg-[#F6F7FB] text-[#1A1F3A]">
      <div className="mx-auto w-full max-w-[1060px] px-7 pb-20 pt-6">
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] text-[#9099B8]">
            <span>Account</span>
            <span className="text-[#CBD0DF]">›</span>
            <span className="font-medium text-[#5A6282]">Subscription</span>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A1F3A17] bg-white px-3.5 py-2 text-[13px] font-medium text-[#5A6282] shadow-[0_1px_4px_rgba(26,31,58,0.06)] transition hover:border-[#1A1F3A22] hover:text-[#1A1F3A] disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </button>
        </div>

        <div className="mb-8">
          <h1 className="font-serif text-[34px] font-normal leading-tight tracking-[-0.02em] text-[#1A1F3A]">
            Subscription
          </h1>
          <p className="mt-1 text-[14px] text-[#5A6282]">
            Manage your plan, billing details, and payment history.
          </p>
        </div>

        {loading ? (
          <div className="rounded-[18px] border border-[#1A1F3A17] bg-white p-6 text-sm text-[#5A6282] shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#D9770633] bg-[#FEF3CD] px-4 py-3 text-[13px] text-[#D97706]">
              <Clock3 className="h-4 w-4 shrink-0" />
              <span>
                <strong className="font-semibold">Billing sync pending.</strong> Paddle data will appear once your subscription records are connected. Taxes/VAT are calculated separately at checkout based on your location.
              </span>
            </div>

            <div className="grid grid-cols-[1fr_320px] gap-5 max-[900px]:grid-cols-1">
              <div className="flex flex-col gap-4">
                <section className="overflow-hidden rounded-[18px] border border-[#1A1F3A17] bg-white shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="flex items-start justify-between gap-5 px-7 pb-6 pt-7 max-[700px]:flex-col">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#1A1F3A17] bg-[#F6F7FB] px-3 py-1 text-[12px] font-medium text-[#5A6282]">
                        <Star className="h-3 w-3 text-[#9099B8]" />
                        Current plan
                      </div>

                      <div className="font-serif text-[28px] font-normal leading-none tracking-[-0.02em] text-[#1A1F3A]">
                        {currentPlan.label}
                      </div>

                      <p className="mt-3 max-w-[380px] text-[13.5px] leading-6 text-[#5A6282]">
                        {currentPlan.description}
                      </p>
                    </div>

                    <div className="min-w-[118px] rounded-xl bg-[#1A1F3A] px-5 py-4 text-center text-white">
                      <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/45">
                        Price
                      </div>
                      <div className="font-serif text-[34px] leading-none text-white">
                        {currentPlan.price}
                      </div>
                      <div className="mt-1 text-[12px] text-white/45">
                        {currentPlan.billing === "/month" ? "per month" : currentPlan.billing}
                      </div>
                    </div>
                  </div>

                  <div className="mx-7 h-px bg-[#1A1F3A17]" />

                  <div className="grid grid-cols-2 gap-7 px-7 py-5 max-[700px]:grid-cols-1">
                    <div>
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-[#9099B8]">
                        Account
                      </div>

                      <div className="flex items-center justify-between border-b border-[#1A1F3A17] py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Email</span>
                        <span className="max-w-[210px] truncate text-right text-[12.5px] font-medium text-[#1A1F3A]">
                          {email || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-[#1A1F3A17] py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Current plan</span>
                        {planPill(plan)}
                      </div>

                      <div className="flex items-center justify-between py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Status</span>
                        <span className="inline-flex items-center rounded-full border border-[#1A1F3A17] bg-[#F9F9FC] px-3 py-1 text-[12px] font-medium text-[#5A6282]">
                          {planStatusLabel(plan)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-[#9099B8]">
                        Billing details
                      </div>

                      <div className="flex items-center justify-between border-b border-[#1A1F3A17] py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Renewal date</span>
                        {syncPill()}
                      </div>

                      <div className="flex items-center justify-between border-b border-[#1A1F3A17] py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Payment method</span>
                        <span className="font-medium text-[#1A1F3A]">Paddle</span>
                      </div>

                      <div className="flex items-center justify-between py-2 text-[13.5px]">
                        <span className="text-[#5A6282]">Invoices</span>
                        {syncPill()}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[18px] border border-[#1A1F3A17] bg-white shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="flex items-center justify-between border-b border-[#1A1F3A17] px-6 py-4">
                    <div className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#9099B8]">
                      Usage this month
                    </div>
                    <div className="text-[12px] text-[#9099B8]">
                      {isPaid ? "Paid plan access" : "Free plan limits"}
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13.5px] font-medium text-[#1A1F3A]">
                        BLL rules practiced
                      </span>
                      <span className="text-[12px] text-[#5A6282]">
                        {isPaid ? "Unlimited practice" : "3 / 5 preview"}
                      </span>
                    </div>

                    <div className="h-[5px] overflow-hidden rounded-full bg-[#F6F7FB]">
                      <div
                        className="h-full rounded-full bg-[#6B5DE4]"
                        style={{ width: isPaid ? "100%" : "60%" }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11.5px] text-[#9099B8]">
                        Across UBE subjects
                      </span>
                      {!isPaid ? (
                        <Link
                          href="/checkout?plan=bll-monthly&registered=1"
                          className="text-[11.5px] font-medium text-[#6B5DE4] hover:underline"
                        >
                          Unlock full BLL library →
                        </Link>
                      ) : (
                        <span className="text-[11.5px] font-medium text-[#12A96A]">
                          Full access active
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[18px] border border-[#1A1F3A17] bg-white shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="flex items-center justify-between border-b border-[#1A1F3A17] px-6 py-4">
                    <div className="text-[13px] font-medium uppercase tracking-[0.06em] text-[#9099B8]">
                      Plan access
                    </div>
                    <div className="text-[12px] text-[#9099B8]">
                      Features under your current plan
                    </div>
                  </div>

                  <div className="grid grid-cols-2 max-[700px]:grid-cols-1">
                    {[
                      ["Full BLL rule access", isPaid],
                      ["Spaced repetition", isPaid],
                      ["Weak rule targeting", isPaid],
                      ["Study progress tracking", isPaid],
                      ["120 Golden Rules", isPremium],
                      ["120 Golden Flashcards", isPremium],
                    ].map(([label, enabled], index) => (
                      <div
                        key={String(label)}
                        className={`flex items-center gap-2.5 border-b border-[#1A1F3A17] px-6 py-3 text-[13.5px] ${
                          index % 2 === 0 ? "border-r max-[700px]:border-r-0" : ""
                        } ${index >= 4 ? "border-b-0 max-[700px]:border-b" : ""} ${accessTextClass(
                          Boolean(enabled)
                        )}`}
                      >
                        {accessIcon(Boolean(enabled))}
                        {label}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[18px] border border-[#1A1F3A17] bg-white shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="flex gap-1 border-b border-[#1A1F3A17] px-6 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("payments")}
                      className={
                        activeTab === "payments"
                          ? "border-b-2 border-[#1A1F3A] px-3 py-2 text-[13px] font-medium text-[#1A1F3A]"
                          : "border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-[#9099B8] hover:text-[#5A6282]"
                      }
                    >
                      Payment history
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className={
                        activeTab === "activity"
                          ? "border-b-2 border-[#1A1F3A] px-3 py-2 text-[13px] font-medium text-[#1A1F3A]"
                          : "border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-[#9099B8] hover:text-[#5A6282]"
                      }
                    >
                      Account activity
                    </button>
                  </div>

                  {activeTab === "payments" ? (
                    <div className="px-6 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F9F9FC] text-[#9099B8]">
                        <ReceiptText className="h-5 w-5" />
                      </div>
                      <div className="text-[14px] font-medium text-[#5A6282]">
                        No payment history yet
                      </div>
                      <p className="mx-auto mt-1 max-w-[330px] text-[12.5px] leading-5 text-[#9099B8]">
                        Invoices, receipts, and payment records will appear here once Paddle data is synced.
                      </p>
                    </div>
                  ) : (
                    <div className="px-6 py-3">
                      <div className="flex gap-3 border-b border-[#1A1F3A17] py-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F9F2]">
                          <Check className="h-3.5 w-3.5 text-[#12A96A]" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[#1A1F3A]">
                            Account loaded
                          </div>
                          <div className="text-[12px] text-[#9099B8]">
                            Current plan: {currentPlan.label}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 py-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F9F9FC]">
                          <Clock3 className="h-3.5 w-3.5 text-[#9099B8]" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[#1A1F3A]">
                            Paddle billing sync pending
                          </div>
                          <div className="text-[12px] text-[#9099B8]">
                            Waiting for subscription records to be connected.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <aside className="flex flex-col gap-4">
                {upgradePlan ? (
                  <section className="relative overflow-hidden rounded-[18px] border border-transparent bg-[#1A1F3A] p-6 text-white shadow-[0_2px_8px_rgba(26,31,58,0.08),0_12px_32px_rgba(26,31,58,0.07)]">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#6B5DE4]/30 blur-2xl" />

                    <div className="relative">
                      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#6B5DE466] bg-[#6B5DE440] px-3 py-1 text-[11.5px] font-medium text-[#A99EF0]">
                        <Star className="h-3 w-3" />
                        Upgrade option
                      </div>

                      <div className="font-serif text-[22px] font-normal leading-tight text-white">
                        {upgradePlan.label}
                      </div>

                      <p className="mt-2 text-[13px] leading-5 text-white/55">
                        {upgradePlan.upgradeDescription}
                      </p>

                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="font-serif text-[30px] leading-none text-white">
                          {upgradePlan.price}
                        </span>
                        <span className="text-[13px] text-white/40">
                          {upgradePlan.billing}
                        </span>
                      </div>

                      <ul className="mt-5 flex flex-col gap-2">
                        {upgradePlan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-[13px] text-white/70"
                          >
                            <Check className="h-3.5 w-3.5 text-[#A99EF0]" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={`/checkout?plan=${upgradePlan.id}&registered=1`}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[13.5px] font-semibold text-[#1A1F3A] transition hover:bg-[#E8E3FF]"
                      >
                        Upgrade to {upgradePlan.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {plan === "free" ? (
                        <div className="mt-4 text-center">
                          <div className="mb-2 text-[12px] text-white/35">
                            Also available
                          </div>
                          <Link
                            href="/checkout?plan=premium&registered=1"
                            className="flex w-full justify-center rounded-lg border border-white/15 bg-white/[0.07] px-4 py-2 text-[13px] text-white/60 transition hover:bg-white/[0.10]"
                          >
                            Premium · $24.99/mo + taxes
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[18px] border border-[#1A1F3A17] bg-white p-6 shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#E8F9F2] px-3 py-1 text-[12px] font-medium text-[#12A96A]">
                      <Check className="h-3.5 w-3.5" />
                      Highest plan
                    </div>
                    <div className="font-serif text-[22px] text-[#1A1F3A]">
                      Premium active
                    </div>
                    <p className="mt-2 text-[13px] leading-5 text-[#5A6282]">
                      You are already on the highest Lexora Prep subscription plan.
                    </p>
                  </section>
                )}

                <section className="overflow-hidden rounded-[18px] border border-[#1A1F3A17] bg-white shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="border-b border-[#1A1F3A17] px-6 py-4 text-[13px] font-medium uppercase tracking-[0.06em] text-[#9099B8]">
                    Manage billing
                  </div>

                  <div className="px-5 py-2">
                    {[
                      {
                        title: "Manage subscription",
                        subtitle: "Cancel, upgrade, or modify",
                        Icon: CreditCard,
                      },
                      {
                        title: "Update payment method",
                        subtitle: "Change card or billing info",
                        Icon: CreditCard,
                      },
                      {
                        title: "View invoices",
                        subtitle: "Download PDF receipts",
                        Icon: FileText,
                      },
                    ].map((item) => {
                      const ActionIcon = item.Icon

                      return (
                        <div
                          key={item.title}
                          className="flex items-center justify-between border-b border-[#1A1F3A17] py-3 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6F7FB] text-[#5A6282]">
                              <ActionIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-[13.5px] font-medium text-[#1A1F3A]">
                                {item.title}
                              </div>
                              <div className="text-[12px] text-[#9099B8]">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <span className="rounded-full bg-[#FEF3CD] px-2 py-0.5 text-[10.5px] font-medium text-[#D97706]">
                            Soon
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-[18px] border border-[#1A1F3A17] bg-white p-5 shadow-[0_1px_3px_rgba(26,31,58,0.06),0_4px_16px_rgba(26,31,58,0.04)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0EEFF] text-[#6B5DE4]">
                      <HelpCircle className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-[14px] font-medium text-[#1A1F3A]">
                        Need billing help?
                      </div>
                      <p className="mt-1 text-[12.5px] leading-5 text-[#5A6282]">
                        If your payment succeeded but access has not updated, contact support and we will resolve it promptly.
                      </p>

                      <Link
                        href="/contact"
                        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#6B5DE4] hover:underline"
                      >
                        Contact support
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

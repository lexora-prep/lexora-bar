"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Crown,
  FileText,
  GraduationCap,
  HelpCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  XCircle,
  Zap,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  subscription_tier: string | null
  mbe_access: boolean
}

type PublicFlags = {
  mbePremiumEnabled: boolean
  mbePublicVisible: boolean
}

type PlanKey = "free" | "bll-monthly" | "premium"

type PlanDefinition = {
  id: PlanKey
  label: string
  eyebrow: string
  price: string
  billing: string
  description: string
  badge: string
  gradient: string
  textColor: string
  features: string[]
}

const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    eyebrow: "Starter access",
    price: "$0",
    billing: "/mo",
    description:
      "Basic account access for exploring Lexora Prep before upgrading to paid rule training.",
    badge: "Starter",
    gradient: "from-slate-900 via-slate-800 to-slate-700",
    textColor: "text-white",
    features: [
      "Account dashboard",
      "Limited free access",
      "Basic profile setup",
      "Upgrade-ready account",
    ],
  },
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19.99",
    billing: "/mo",
    description:
      "Full Black Letter Law memorization access with spaced repetition and weak-rule review.",
    badge: "Core plan",
    gradient: "from-[#0E1B35] via-[#1E3A72] to-[#5B21B6]",
    textColor: "text-white",
    features: [
      "Full BLL rule access",
      "Spaced repetition",
      "Weak rule targeting",
      "Smart study plan",
      "Performance analytics",
    ],
  },
  premium: {
    id: "premium",
    label: "Premium",
    eyebrow: "Advanced training",
    price: "$24.99",
    billing: "/mo",
    description:
      "Advanced rule memory tools, Golden Rules, premium flashcards, and stronger review workflows.",
    badge: "Best access",
    gradient: "from-[#27115F] via-[#6D28D9] to-[#A855F7]",
    textColor: "text-white",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced rule sets",
      "Priority training tools",
      "Performance analytics",
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

function formatPlanLabel(plan: PlanKey) {
  return PLANS[plan].label
}

function getPlanTone(plan: PlanKey) {
  if (plan === "premium") {
    return {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      dot: "bg-violet-500",
    }
  }

  if (plan === "bll-monthly") {
    return {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
    }
  }

  return {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  }
}

function PlanBadge({ plan }: { plan: PlanKey }) {
  const tone = getPlanTone(plan)

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${tone.bg} ${tone.text} ${tone.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {formatPlanLabel(plan)}
    </span>
  )
}

function StatusPill({
  active,
  label,
}: {
  active: boolean
  label: string
}) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700"
          : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600"
      }
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {label}
    </span>
  )
}

function InfoCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  helper?: string
}) {
  return (
    <div className="rounded-[22px] border border-[#E2E6F0] bg-white p-5 shadow-[0_14px_38px_rgba(14,27,53,0.06)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
        {icon}
      </div>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-2 text-[18px] font-black tracking-[-0.03em] text-[#0E1B35]">
        {value}
      </div>
      {helper ? (
        <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

function AccessRow({
  label,
  description,
  enabled,
}: {
  label: string
  description: string
  enabled: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] px-4 py-3">
      <div>
        <div className="text-sm font-black text-[#0E1B35]">{label}</div>
        <div className="mt-1 text-xs font-medium leading-5 text-[#64748B]">
          {description}
        </div>
      </div>

      <div
        className={
          enabled
            ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
            : "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"
        }
      >
        {enabled ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <LockKeyhole className="h-4 w-4" />
        )}
      </div>
    </div>
  )
}

function EmptyHistory() {
  return (
    <div className="rounded-[22px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#64748B] shadow-sm">
        <ReceiptText className="h-5 w-5" />
      </div>
      <div className="text-sm font-black text-[#0E1B35]">
        No invoice history yet
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#64748B]">
        After Paddle checkout is completed and webhook records are connected,
        invoices, paid months, discounts, and renewal details will appear here.
      </p>
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
  const [mbeAccess, setMbeAccess] = useState(false)
  const [flags, setFlags] = useState<PublicFlags>({
    mbePremiumEnabled: false,
    mbePublicVisible: false,
  })

  const currentPlan = PLANS[plan]
  const isPaid = plan !== "free"
  const isPremium = plan === "premium"
  const isBll = plan === "bll-monthly"

  const billingStatus = isPaid ? "Active subscription" : "No paid subscription"
  const accessStatus = isPaid ? "Paid access active" : "Free access"
  const recommendedPlan = isPremium ? null : isBll ? PLANS.premium : PLANS["bll-monthly"]

  const mbeStatusText = !flags.mbePublicVisible
    ? "Coming soon"
    : flags.mbePremiumEnabled
      ? mbeAccess
        ? "Enabled"
        : "Not active"
      : "Temporarily disabled"

  async function loadSubscription(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      setLoading(!showRefreshing)
      setError("")

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError("Unable to load subscription data.")
        return
      }

      const [profileRes, flagsRes] = await Promise.all([
        fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        }),
        fetch(`/api/public-feature-flags`, {
          cache: "no-store",
        }),
      ])

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => null)
        setError(data?.error || "Failed to load subscription data.")
        return
      }

      const profile: ProfileData = await profileRes.json()
      const publicFlags: PublicFlags = flagsRes.ok
        ? await flagsRes.json()
        : {
            mbePremiumEnabled: false,
            mbePublicVisible: false,
          }

      setEmail(profile.email || "")
      setPlan(normalizePlan(profile.subscription_tier))
      setMbeAccess(!!profile.mbe_access)
      setFlags(publicFlags)
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
    <div className="min-h-[calc(100vh-64px)] bg-[#F7F8FC] text-[#0E1B35]">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
              <WalletCards className="h-3.5 w-3.5" />
              Billing center
            </div>

            <h1 className="text-[34px] font-black leading-tight tracking-[-0.045em] text-[#0E1B35] md:text-[44px]">
              Subscription
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#64748B] md:text-base">
              Manage your Lexora Prep plan, access status, billing details, and
              upgrade options from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadSubscription(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#CDD3E6] bg-white px-4 text-sm font-extrabold text-[#334155] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh status
          </button>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-8 text-sm font-bold text-[#64748B] shadow-[0_20px_60px_rgba(14,27,53,0.08)]">
            Loading subscription...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-sm font-bold text-red-700 shadow-[0_20px_60px_rgba(14,27,53,0.08)]">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <section
              className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${currentPlan.gradient} p-6 text-white shadow-[0_30px_90px_rgba(14,27,53,0.20)] md:p-8`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
                    <Crown className="h-3.5 w-3.5" />
                    {currentPlan.eyebrow}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[38px] font-black leading-none tracking-[-0.06em] md:text-[58px]">
                      {currentPlan.label}
                    </h2>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/85">
                      {currentPlan.badge}
                    </span>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/72 md:text-base">
                    {currentPlan.description}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <StatusPill active={isPaid} label={accessStatus} />
                    <StatusPill active={mbeAccess} label={`MBE: ${mbeStatusText}`} />
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/75">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Paddle billing
                    </span>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/15 bg-white/10 p-5 backdrop-blur md:min-w-[260px]">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
                    Current price
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <div className="text-[44px] font-black leading-none tracking-[-0.08em]">
                      {currentPlan.price}
                    </div>
                    <div className="pb-1 text-base font-black text-white/55">
                      {currentPlan.billing}
                    </div>
                  </div>
                  <div className="mt-4 text-xs font-semibold leading-5 text-white/60">
                    {isPaid
                      ? "Your paid subscription status is controlled by Paddle webhook updates."
                      : "Upgrade to unlock full paid training access."}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={<GraduationCap className="h-5 w-5" />}
                label="Account"
                value={email || "—"}
                helper="Subscription access is attached to this Lexora account."
              />

              <InfoCard
                icon={<BadgeCheck className="h-5 w-5" />}
                label="Current plan"
                value={<PlanBadge plan={plan} />}
                helper={isPaid ? "Paid access is active." : "No paid plan is active yet."}
              />

              <InfoCard
                icon={<CalendarClock className="h-5 w-5" />}
                label="Renewal"
                value="Pending Paddle sync"
                helper="Next billing date will appear after subscription data is stored."
              />

              <InfoCard
                icon={<ReceiptText className="h-5 w-5" />}
                label="Billing status"
                value={billingStatus}
                helper="Invoices and payment history will sync from Paddle."
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_18px_50px_rgba(14,27,53,0.07)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                      Plan access
                    </div>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                      What your account can use
                    </h3>
                  </div>
                  <Zap className="h-5 w-5 text-[#7C3AED]" />
                </div>

                <div className="grid gap-3">
                  <AccessRow
                    label="Black Letter Law rule training"
                    description="Full memorization workflow for core bar exam rule statements."
                    enabled={isPaid}
                  />
                  <AccessRow
                    label="Spaced repetition and weak-rule review"
                    description="Review tools designed to bring weak rules back at the right time."
                    enabled={isPaid}
                  />
                  <AccessRow
                    label="Performance analytics"
                    description="Track study progress, accuracy, weak areas, and training activity."
                    enabled={isPaid}
                  />
                  <AccessRow
                    label="120 Golden Rules"
                    description="Premium high-yield rule set for focused final review."
                    enabled={isPremium}
                  />
                  <AccessRow
                    label="120 Golden Flashcards"
                    description="Premium flashcard set for faster active recall."
                    enabled={isPremium}
                  />
                  <AccessRow
                    label="MBE Premium access"
                    description="MBE access depends on your plan and feature availability."
                    enabled={mbeAccess && flags.mbePublicVisible}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_18px_50px_rgba(14,27,53,0.07)]">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                        Billing actions
                      </div>
                      <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                        Manage payment
                      </h3>
                    </div>
                    <CreditCard className="h-5 w-5 text-[#7C3AED]" />
                  </div>

                  <div className="grid gap-3">
                    <button
                      type="button"
                      disabled
                      className="flex h-12 items-center justify-between rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] px-4 text-sm font-extrabold text-[#94A3B8]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <WalletCards className="h-4 w-4" />
                        Manage billing portal
                      </span>
                      <span className="text-xs">Soon</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="flex h-12 items-center justify-between rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] px-4 text-sm font-extrabold text-[#94A3B8]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        View invoices
                      </span>
                      <span className="text-xs">Soon</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="flex h-12 items-center justify-between rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] px-4 text-sm font-extrabold text-[#94A3B8]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Update payment method
                      </span>
                      <span className="text-xs">Soon</span>
                    </button>
                  </div>

                  <p className="mt-4 rounded-2xl bg-[#F3F0FF] p-4 text-xs font-semibold leading-5 text-[#5B21B6]">
                    Paddle will manage payment method updates, invoices,
                    cancellations, taxes, and receipts once customer portal
                    sessions are connected.
                  </p>
                </div>

                {recommendedPlan ? (
                  <div className="rounded-[28px] border border-[#DDD6FE] bg-[#FBFAFF] p-6 shadow-[0_18px_50px_rgba(124,58,237,0.08)]">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Recommended
                    </div>

                    <h3 className="text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                      Upgrade to {recommendedPlan.label}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">
                      {recommendedPlan.description}
                    </p>

                    <Link
                      href={`/checkout?plan=${recommendedPlan.id}&registered=1`}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0E1B35] px-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(14,27,53,0.20)] transition hover:-translate-y-0.5 hover:bg-[#162B55]"
                    >
                      Upgrade now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_50px_rgba(16,185,129,0.08)]">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      <Crown className="h-3.5 w-3.5" />
                      Highest plan
                    </div>

                    <h3 className="text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                      You are on Premium
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">
                      Your account has the strongest Lexora Prep subscription
                      level available.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_18px_50px_rgba(14,27,53,0.07)]">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                    Payment history
                  </div>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                    Invoices and paid months
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#64748B]">
                    This area should eventually show which months the user paid
                    for, total paid amount, discount use, invoice links, and
                    payment status from Paddle.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] px-4 py-3 text-sm font-black text-[#64748B]">
                  <BarChart3 className="h-4 w-4" />
                  0 paid months synced
                </div>
              </div>

              <EmptyHistory />
            </section>

            <section className="rounded-[24px] border border-[#E2E6F0] bg-white p-5 shadow-[0_12px_38px_rgba(14,27,53,0.05)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#0E1B35]">
                      Need help with billing?
                    </div>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#64748B]">
                      Contact support if a payment was made but your access has
                      not updated yet.
                    </p>
                  </div>
                </div>

                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#CDD3E6] bg-white px-4 text-sm font-extrabold text-[#334155] transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
                >
                  Contact support
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

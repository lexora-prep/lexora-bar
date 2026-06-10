"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

type ActivationState = "checking" | "active" | "pending" | "error"

function normalizePlanLabel(plan: string | null) {
  if (plan === "premium") return "Premium"
  if (plan === "bll-monthly") return "BLL Monthly"
  return "Subscription"
}

function isPaidProfile(profile: any) {
  const tier = String(profile?.subscription_tier || profile?.subscriptionTier || "free")
  const status = String(profile?.billing_status || profile?.billingStatus || "").toLowerCase()

  return (
    (tier === "bll-monthly" || tier === "premium") &&
    ["active", "trialing", "paid", "completed"].includes(status)
  )
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan")
  const planLabel = useMemo(() => normalizePlanLabel(plan), [plan])

  const [state, setState] = useState<ActivationState>("checking")
  const [attempts, setAttempts] = useState(1)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function checkProfile(attempt: number) {
      try {
        setAttempts(attempt)

        const response = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        })

        if (!response.ok) throw new Error("Profile check failed")

        const data = await response.json()
        const profile = data?.profile || data?.user || data

        if (cancelled) return

        if (isPaidProfile(profile)) {
          setState("active")
          return
        }

        if (attempt >= 15) {
          setState("pending")
          return
        }

        timer = setTimeout(() => checkProfile(attempt + 1), 2000)
      } catch (error) {
        console.error("CHECKOUT SUCCESS PROFILE CHECK ERROR:", error)

        if (cancelled) return

        if (attempt >= 15) {
          setState("error")
          return
        }

        timer = setTimeout(() => checkProfile(attempt + 1), 2000)
      }
    }

    void checkProfile(1)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const active = state === "active"

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FC] px-5 text-[#0E1B35]">
      <div className="w-full max-w-xl rounded-[30px] border border-[#E2E6F0] bg-white p-8 text-center shadow-[0_24px_60px_rgba(14,27,53,0.12)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          {active ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin" />
          )}
        </div>

        <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
          Payment received
        </div>

        <h1 className="font-serif text-[38px] font-normal tracking-[-0.04em] text-[#0E1B35]">
          {active ? `${planLabel} is active.` : "Activating your access..."}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#64748B]">
          {active
            ? "Your subscription is active and your Lexora access is ready."
            : state === "pending"
              ? "Your payment was received. Billing confirmation is still syncing. Please refresh your subscription page in a moment."
              : state === "error"
                ? "Your payment was received, but we could not confirm access yet. Please refresh or contact support."
                : `We are confirming your ${planLabel} access through Paddle. Attempt ${attempts}/15.`}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/subscription"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0E1B35] px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(14,27,53,0.22)] transition hover:bg-[#162B55]"
          >
            View subscription
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#D8DEEA] bg-white px-6 text-sm font-extrabold text-[#0E1B35] transition hover:bg-[#F8FAFC]"
          >
            Go to dashboard
          </Link>
        </div>

        {!active && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-semibold text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Access is unlocked after secure Paddle confirmation.
          </div>
        )}
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

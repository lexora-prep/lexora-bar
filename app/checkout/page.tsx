"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type PlanKey = "free" | "bll-monthly" | "premium"

type Plan = {
  key: PlanKey
  name: string
  eyebrow: string
  price: string
  short: string
  registerUrl: string
  checkoutUrl?: string
  features: string[]
}

const plans: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    eyebrow: "Demo access",
    price: "$0",
    short: "Start with limited access and see how Lexora Prep rule recall works.",
    registerUrl: "/register?plan=free",
    features: [
      "Create a Lexora Prep account",
      "Limited rule training access",
      "Basic recall practice",
      "No credit card required",
    ],
  },
  "bll-monthly": {
    key: "bll-monthly",
    name: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19.99/mo",
    short: "Full Black Letter Law rule training with structured recall and analytics.",
    registerUrl: "/register?plan=bll-monthly&next=checkout",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_BLL_MONTHLY_CHECKOUT_URL,
    features: [
      "Full Black Letter Law rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
      "Performance analytics",
    ],
  },
  premium: {
    key: "premium",
    name: "Premium",
    eyebrow: "Advanced training",
    price: "$24.99/mo",
    short: "Advanced training tools for stronger rule memory and focused review.",
    registerUrl: "/register?plan=premium&next=checkout",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_CHECKOUT_URL,
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

function getInitialPlan(): PlanKey {
  if (typeof window === "undefined") return "free"
  const params = new URLSearchParams(window.location.search)
  const plan = params.get("plan")
  if (plan === "premium") return "premium"
  if (plan === "bll-monthly") return "bll-monthly"
  return "free"
}

export default function CheckoutPage() {
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("free")

  useEffect(() => {
    setSelectedPlanKey(getInitialPlan())
  }, [])

  const selectedPlan = useMemo(() => plans[selectedPlanKey], [selectedPlanKey])

  function selectPlan(planKey: PlanKey) {
    setSelectedPlanKey(planKey)
    const url = new URL(window.location.href)
    url.searchParams.set("plan", planKey)
    window.history.replaceState(null, "", url.toString())
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-5 text-[#0E1B35]">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-5 flex h-12 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-base font-black">
            <img
              src="/icon.png"
              alt="Lexora Prep"
              className="h-9 w-9 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
            <span>
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </span>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            Log in
          </Link>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[26px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.07)]">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
              Choose access
            </p>

            <h1 className="font-serif text-[40px] font-semibold leading-[1.02] tracking-[-0.045em]">
              Choose your Lexora Prep plan.
            </h1>

            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#475569]">
              Pick Free, BLL Monthly, or Premium. New users create an account first, then paid plans continue to Paddle checkout.
            </p>

            <div className="mt-6 grid gap-3">
              {(["free", "bll-monthly", "premium"] as PlanKey[]).map((planKey) => {
                const plan = plans[planKey]
                const active = selectedPlanKey === planKey

                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => selectPlan(plan.key)}
                    className={`group rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-[#7C3AED] bg-[#F5F1FF] shadow-[0_14px_35px_rgba(124,58,237,0.12)]"
                        : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                          {plan.eyebrow}
                        </p>
                        <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                          {plan.name}
                        </h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#475569]">
                          {plan.short}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-2xl font-black tracking-[-0.04em]">
                        {plan.price}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="rounded-[26px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.07)]">
            <div className="rounded-[24px] bg-gradient-to-br from-[#0E1B35] via-[#162B55] to-[#5B21B6] p-6 text-white shadow-[0_20px_55px_rgba(14,27,53,0.20)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4B5FD]">
                Selected plan
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.045em]">
                    {selectedPlan.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/72">
                    Lexora Prep access
                  </p>
                </div>
                <p className="text-3xl font-black tracking-[-0.04em]">
                  {selectedPlan.price}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
              <h3 className="text-lg font-black tracking-[-0.02em]">
                Included
              </h3>

              <ul className="mt-4 grid gap-3">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-bold text-[#1E293B]">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-sm text-[#7C3AED]">
                      ✓
                    </span>
                    <span className="leading-6">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#E2E8F0] bg-white p-4">
              <p className="text-sm leading-6 text-[#475569]">
                Lexora Prep is a digital educational service. Paid access begins after registration and Paddle checkout. Free access does not require payment.
              </p>
            </div>

            <Link
              href={selectedPlan.registerUrl}
              className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:bg-[#162B55]"
            >
              {selectedPlan.key === "free" ? "Continue with free access →" : "Create account and continue →"}
            </Link>

            <p className="mt-4 text-center text-xs leading-6 text-[#64748B]">
              By continuing, you agree to Lexora Prep&apos;s{" "}
              <Link href="/terms" className="font-bold text-[#7C3AED]">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" className="font-bold text-[#7C3AED]">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/refund" className="font-bold text-[#7C3AED]">
                Refund Policy
              </Link>
              .
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}

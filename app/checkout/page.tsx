"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type PlanKey = "bll-monthly" | "premium"

type Plan = {
  key: PlanKey
  label: string
  price: string
  description: string
  checkoutUrl?: string
  features: string[]
}

const plans: Record<PlanKey, Plan> = {
  "bll-monthly": {
    key: "bll-monthly",
    label: "BLL Monthly",
    price: "$19.99/mo",
    description:
      "Black Letter Law rule training with structured recall practice, spaced repetition, weak rule targeting, smart study planning, and performance analytics.",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_BLL_MONTHLY_CHECKOUT_URL,
    features: [
      "Black Letter Law rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
      "Performance analytics",
    ],
  },
  premium: {
    key: "premium",
    label: "Premium",
    price: "$24.99/mo",
    description:
      "Advanced Lexora Prep access with Golden Rules, Golden Flashcards, advanced rule sets, performance analytics, and priority training tools.",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_CHECKOUT_URL,
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced rule sets",
      "Priority training tools",
    ],
  },
}

function normalizePlan(value: string | null): PlanKey {
  if (value === "premium") return "premium"
  return "bll-monthly"
}

export default function CheckoutPage() {
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("bll-monthly")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSelectedPlanKey(normalizePlan(params.get("plan")))
  }, [])

  const selectedPlan = useMemo(() => plans[selectedPlanKey], [selectedPlanKey])
  const checkoutReady = Boolean(selectedPlan.checkoutUrl)

  function changePlan(planKey: PlanKey) {
    setSelectedPlanKey(planKey)
    const url = new URL(window.location.href)
    url.searchParams.set("plan", planKey)
    window.history.replaceState(null, "", url.toString())
  }

  function continueToPaddle() {
    if (!selectedPlan.checkoutUrl) return
    window.location.href = selectedPlan.checkoutUrl
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-8 text-[#0E1B35]">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-base font-black text-[#0E1B35]"
          >
            <img
              src="/lexora-icon-transparent.png"
              alt="Lexora Prep"
              className="h-9 w-9 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
            <span>
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </span>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            Log in
          </Link>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_60px_rgba(14,27,53,0.07)] md:p-8">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">
              Secure checkout
            </p>

            <h1 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-[#0E1B35] md:text-5xl">
              Choose your plan.
            </h1>

            <p className="mt-4 text-[15px] leading-7 text-[#475569]">
              Select a Lexora Prep subscription and continue to Paddle checkout. Paddle processes payments, taxes, invoices, cancellations, and refunds as Merchant of Record.
            </p>

            <div className="mt-6 grid gap-3">
              {(["bll-monthly", "premium"] as PlanKey[]).map((planKey) => {
                const plan = plans[planKey]
                const active = selectedPlanKey === planKey

                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => changePlan(plan.key)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-[#7C3AED] bg-[#F3F0FF] shadow-[0_14px_35px_rgba(124,58,237,0.12)]"
                        : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-[#0E1B35]">
                          {plan.label}
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-[#475569]">
                          {plan.description}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-xl font-black text-[#0E1B35]">
                        {plan.price}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="rounded-[28px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_60px_rgba(14,27,53,0.07)] md:p-8">
            <div className="rounded-[24px] bg-gradient-to-br from-[#0E1B35] via-[#162B55] to-[#5B21B6] p-6 text-white shadow-[0_20px_55px_rgba(14,27,53,0.2)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C4B5FD]">
                Selected plan
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.035em]">
                    {selectedPlan.label}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/70">
                    Lexora Prep subscription
                  </p>
                </div>
                <p className="text-2xl font-black">{selectedPlan.price}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
              <h3 className="text-base font-black text-[#0E1B35]">
                Included
              </h3>

              <ul className="mt-4 space-y-2.5">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-bold text-[#1E293B]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-xs text-[#7C3AED]">
                      ✓
                    </span>
                    <span className="leading-6">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-[20px] border border-[#E2E8F0] bg-white p-4 text-sm leading-6 text-[#475569]">
              By continuing, I understand that Lexora Prep is a digital educational service and that access to digital content begins immediately after purchase. Where permitted by applicable law, using or accessing the platform may affect refund or withdrawal rights.
            </div>

            <button
              type="button"
              onClick={continueToPaddle}
              disabled={!checkoutReady}
              className={`mt-5 w-full rounded-2xl px-5 py-3.5 text-sm font-black shadow-xl transition ${
                checkoutReady
                  ? "bg-[#0E1B35] text-white hover:bg-[#162B55]"
                  : "cursor-not-allowed bg-[#CBD5E1] text-[#64748B]"
              }`}
            >
              {checkoutReady ? "Continue to secure checkout →" : "Checkout is not available yet"}
            </button>

            {!checkoutReady && (
              <p className="mt-3 text-center text-xs leading-6 text-[#64748B]">
                Please contact support if you need help with checkout.
              </p>
            )}

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

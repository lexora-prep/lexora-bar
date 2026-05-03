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
      "Full Black Letter Law rule training access with structured recall practice, spaced repetition, weak rule targeting, smart study planning, and performance analytics.",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_BLL_MONTHLY_CHECKOUT_URL,
    features: [
      "Full Black Letter Law rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
      "Performance analytics included",
    ],
  },
  premium: {
    key: "premium",
    label: "Premium",
    price: "$24.99/mo",
    description:
      "Advanced Lexora Prep access with priority rule sets, Golden Rules, Golden Flashcards, performance analytics, and priority training tools.",
    checkoutUrl: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_CHECKOUT_URL,
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced rule sets",
      "Priority training tools",
      "Performance analytics included",
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
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#0E1B35]">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-lg font-black text-[#0E1B35]"
          >
            <img
              src="/lexora-icon-transparent.png"
              alt="Lexora Prep"
              className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
            <span>
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-2xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-black text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
            >
              Log in
            </Link>
            <Link
              href="/"
              className="rounded-2xl bg-[#0E1B35] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#162B55]"
            >
              Back home
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-[#D8E0EF] bg-white p-8 shadow-[0_24px_80px_rgba(14,27,53,0.08)] md:p-10">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#7C3AED]">
              Secure checkout
            </p>

            <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-[#0E1B35] md:text-6xl">
              Start your Lexora Prep plan.
            </h1>

            <p className="mt-5 text-base leading-8 text-[#475569] md:text-lg">
              Choose your plan and continue to Paddle checkout. Payments, invoices,
              taxes, cancellations, and refund processing are handled by Paddle as
              Merchant of Record.
            </p>

            <div className="mt-8 rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
              <h2 className="text-lg font-black text-[#0E1B35]">
                Payment processing
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#475569]">
                Lexora Prep LLC uses Paddle for subscription checkout and payment
                processing. You will review your order before completing payment.
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              <button
                type="button"
                onClick={() => changePlan("bll-monthly")}
                className={`rounded-[24px] border p-5 text-left transition ${
                  selectedPlanKey === "bll-monthly"
                    ? "border-[#7C3AED] bg-[#F3F0FF] shadow-[0_18px_45px_rgba(124,58,237,0.12)]"
                    : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black text-[#0E1B35]">
                      BLL Monthly
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#475569]">
                      Rule training, spaced repetition, weak areas, smart plan, and analytics.
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-2xl font-black text-[#0E1B35]">
                    $19.99/mo
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => changePlan("premium")}
                className={`rounded-[24px] border p-5 text-left transition ${
                  selectedPlanKey === "premium"
                    ? "border-[#7C3AED] bg-[#F3F0FF] shadow-[0_18px_45px_rgba(124,58,237,0.12)]"
                    : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black text-[#0E1B35]">Premium</p>
                    <p className="mt-2 text-sm leading-7 text-[#475569]">
                      Golden Rules, Golden Flashcards, advanced tools, priority training, and analytics.
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-2xl font-black text-[#0E1B35]">
                    $24.99/mo
                  </p>
                </div>
              </button>
            </div>
          </div>

          <aside className="rounded-[32px] border border-[#D8E0EF] bg-white p-8 shadow-[0_24px_80px_rgba(14,27,53,0.08)] md:p-10">
            <div className="rounded-[28px] bg-gradient-to-br from-[#0E1B35] via-[#162B55] to-[#5B21B6] p-7 text-white shadow-[0_24px_70px_rgba(14,27,53,0.22)]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C4B5FD]">
                Selected plan
              </p>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.04em]">
                    {selectedPlan.label}
                  </h2>
                  <p className="mt-2 text-white/70">Lexora Prep subscription</p>
                </div>
                <p className="text-3xl font-black">{selectedPlan.price}</p>
              </div>

              <p className="mt-6 text-sm leading-7 text-white/78">
                {selectedPlan.description}
              </p>
            </div>

            <div className="mt-7 rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-6">
              <h3 className="text-lg font-black text-[#0E1B35]">
                Included
              </h3>

              <ul className="mt-5 space-y-3">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-bold text-[#1E293B]">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#7C3AED]">
                      ✓
                    </span>
                    <span className="leading-6">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={continueToPaddle}
              disabled={!checkoutReady}
              className={`mt-7 w-full rounded-2xl px-6 py-4 text-base font-black shadow-xl transition ${
                checkoutReady
                  ? "bg-[#0E1B35] text-white hover:bg-[#162B55]"
                  : "cursor-not-allowed bg-[#CBD5E1] text-[#64748B]"
              }`}
            >
              {checkoutReady ? "Continue to secure checkout →" : "Checkout link not connected yet"}
            </button>

            {!checkoutReady && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                Add the real Paddle checkout link in Vercel environment variables:
                <br />
                <strong>
                  {selectedPlanKey === "premium"
                    ? "NEXT_PUBLIC_PADDLE_PREMIUM_CHECKOUT_URL"
                    : "NEXT_PUBLIC_PADDLE_BLL_MONTHLY_CHECKOUT_URL"}
                </strong>
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-6 text-[#64748B]">
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

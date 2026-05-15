"use client"

import Link from "next/link"
import Script from "next/script"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

type PlanKey = "bll-monthly" | "premium"

type Plan = {
  id: PlanKey
  label: string
  eyebrow: string
  price: string
  billing: string
  description: string
  features: string[]
  buttonText: string
}

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: "sandbox" | "production") => void
      }
      Initialize?: (options: { token: string }) => void
      Checkout?: {
        open: (options: {
          items: Array<{
            priceId: string
            quantity: number
          }>
          customData?: Record<string, string>
        }) => void
      }
    }
  }
}

const PLANS: Record<PlanKey, Plan> = {
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19.99",
    billing: "/mo",
    description:
      "Full Black Letter Law rule training access for focused bar preparation.",
    features: [
      "Full BLL rule access",
      "Spaced repetition and flashcards",
      "Weak rule targeting",
      "Smart study plan and analytics",
    ],
    buttonText: "Continue to secure payment",
  },
  premium: {
    id: "premium",
    label: "Premium",
    eyebrow: "Advanced training",
    price: "$24.99",
    billing: "/mo",
    description:
      "Advanced rule memory tools, premium rule sets, and priority training features.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Priority training tools",
    ],
    buttonText: "Continue to secure payment",
  },
}

function normalizePaidPlan(value: string | null): PlanKey {
  if (value === "premium") return "premium"
  return "bll-monthly"
}

function getPaddleEnvironment() {
  const value = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT

  if (value === "production") return "production"

  return "sandbox"
}

function getPriceId(planId: PlanKey) {
  if (planId === "premium") {
    return process.env.NEXT_PUBLIC_PADDLE_PREMIUM_MONTHLY_PRICE_ID || ""
  }

  return process.env.NEXT_PUBLIC_PADDLE_BLL_MONTHLY_PRICE_ID || ""
}

function CheckoutContent() {
  const searchParams = useSearchParams()

  const rawPlan = searchParams.get("plan")
  const registered = searchParams.get("registered") === "1"
  const selectedPlanId = normalizePaidPlan(rawPlan)
  const selectedPlan = useMemo(() => PLANS[selectedPlanId], [selectedPlanId])

  const freePlanRequested = rawPlan === "free"

  const [paddleReady, setPaddleReady] = useState(false)
  const [openingCheckout, setOpeningCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  function initializePaddle() {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    const environment = getPaddleEnvironment()

    if (!clientToken) {
      setCheckoutError(
        "Paddle client token is missing. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to .env.local."
      )
      return
    }

    if (!window.Paddle) {
      setCheckoutError("Paddle.js did not load. Refresh the page and try again.")
      return
    }

    try {
      if (environment === "sandbox") {
        window.Paddle.Environment?.set?.("sandbox")
      }

      window.Paddle.Initialize?.({
        token: clientToken,
      })

      setPaddleReady(true)
      setCheckoutError("")
    } catch (error) {
      console.error("PADDLE INITIALIZE ERROR:", error)
      setCheckoutError("Unable to initialize Paddle checkout.")
    }
  }

  function handlePaymentClick() {
    setCheckoutError("")

    const priceId = getPriceId(selectedPlanId)

    if (!priceId) {
      setCheckoutError(
        selectedPlanId === "premium"
          ? "Premium Paddle price ID is missing. Add NEXT_PUBLIC_PADDLE_PREMIUM_MONTHLY_PRICE_ID to .env.local."
          : "BLL Monthly Paddle price ID is missing. Add NEXT_PUBLIC_PADDLE_BLL_MONTHLY_PRICE_ID to .env.local."
      )
      return
    }

    if (!window.Paddle?.Checkout?.open) {
      setCheckoutError("Paddle checkout is not ready yet. Wait a second and try again.")
      return
    }

    try {
      setOpeningCheckout(true)

      window.Paddle.Checkout.open({
        items: [
          {
            priceId,
            quantity: 1,
          },
        ],
        customData: {
          plan: selectedPlanId,
          source: "lexora_checkout",
        },
      })
    } catch (error) {
      console.error("PADDLE CHECKOUT OPEN ERROR:", error)
      setCheckoutError("Unable to open Paddle checkout.")
    } finally {
      setOpeningCheckout(false)
    }
  }

  if (freePlanRequested) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FC] px-5 text-[#0E1B35]">
        <div className="w-full max-w-xl rounded-[30px] border border-[#E2E6F0] bg-white p-8 text-center shadow-[0_24px_60px_rgba(14,27,53,0.12)]">
          <img
            src="/icon.png"
            alt="Lexora Prep logo"
            className="mx-auto mb-5 h-12 w-12 object-contain"
          />

          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
            Registration required
          </div>

          <h1 className="font-serif text-[38px] font-normal tracking-[-0.04em] text-[#0E1B35]">
            Free access starts with an account.
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#64748B]">
            Free users must register first. After account creation, the free plan
            opens the dashboard without Paddle payment.
          </p>

          <Link
            href="/register?plan=free"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-[#0E1B35] px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(14,27,53,0.22)] transition hover:bg-[#162B55]"
          >
            Go to free registration
          </Link>
        </div>
      </main>
    )
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={initializePaddle}
        onError={() => {
          setCheckoutError("Paddle.js failed to load. Check your network or ad blocker.")
        }}
      />

      <main
        className="min-h-screen overflow-hidden bg-[#F7F8FC] text-[#0E1B35] selection:bg-transparent"
        onCopy={(event) => {
          const target = event.target as HTMLElement | null
          const tagName = target?.tagName?.toLowerCase()

          if (
            tagName !== "input" &&
            tagName !== "textarea" &&
            tagName !== "select"
          ) {
            event.preventDefault()
          }
        }}
      >
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#E2E6F0] bg-[#F7F8FC]/95 px-5 backdrop-blur-xl md:px-12">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Lexora Prep logo"
              className="h-9 w-9 object-contain"
            />
            <div className="text-[17px] font-extrabold tracking-[-0.03em] text-[#0E1B35]">
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </div>
          </Link>

          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-[12px] border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-bold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to main page
          </Link>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-66px)] w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_430px] lg:items-center lg:py-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
              <Sparkles className="h-4 w-4" />
              Final payment step
            </div>

            <h1 className="font-serif text-[44px] font-normal leading-[1.04] tracking-[-0.04em] text-[#0E1B35] md:text-[62px]">
              {registered ? "Account created." : "Registration comes first."}{" "}
              <span className="italic text-[#5B21B6]">
                Complete paid access.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[#475569]">
              This page is only the payment step for paid plans after registration.
              Plan selection happens on the homepage and inside the registration
              cart. It is not a second pricing page.
            </p>

            {!registered ? (
              <div className="mt-6 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] p-4 text-sm font-semibold leading-6 text-[#5B21B6]">
                New users should create an account first. Use the registration
                page so the selected plan is attached to the user profile before
                payment.
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#E2E6F0] bg-white/90 p-5 shadow-[0_12px_34px_rgba(14,27,53,0.06)]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-sm font-black text-[#0E1B35]">
                  Registration first
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748B]">
                  Every user, including free users, must create an account before
                  entering the platform.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#E2E6F0] bg-white/90 p-5 shadow-[0_12px_34px_rgba(14,27,53,0.06)]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="text-sm font-black text-[#0E1B35]">
                  Paddle checkout
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748B]">
                  Paid users continue to a secure Paddle subscription checkout.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#E2E6F0] bg-white/90 p-5 shadow-[0_12px_34px_rgba(14,27,53,0.06)]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="text-sm font-black text-[#0E1B35]">
                  Protected use
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748B]">
                  Lexora Prep is supplemental and does not guarantee bar exam
                  passage.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[30px] border border-[#E2E6F0] bg-white p-6 shadow-[0_28px_80px_rgba(14,27,53,0.13)] md:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
                  Selected paid plan
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                  {selectedPlan.label}
                </div>
              </div>

              <Link
                href={`/register?plan=${selectedPlan.id}`}
                className="rounded-full border border-[#E2E6F0] bg-[#F7F8FC] px-3 py-1.5 text-xs font-black text-[#64748B] transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
              >
                Change plan
              </Link>
            </div>

            <div className="rounded-[26px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#6D28D9] p-5 text-white shadow-[0_18px_45px_rgba(14,27,53,0.20)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                {selectedPlan.eyebrow}
              </div>

              <div className="mt-4 flex items-end gap-1">
                <div className="text-[50px] font-black leading-none tracking-[-0.08em]">
                  {selectedPlan.price}
                </div>
                <div className="pb-1 text-lg font-black text-white/65">
                  {selectedPlan.billing}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/75">
                {selectedPlan.description}
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              {selectedPlan.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-3 text-sm font-bold leading-6 text-[#334155]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {checkoutError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                {checkoutError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePaymentClick}
              disabled={!paddleReady || openingCheckout}
              className="mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(14,27,53,0.24)] transition hover:-translate-y-0.5 hover:bg-[#162B55] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {openingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Opening checkout...
                </>
              ) : paddleReady ? (
                selectedPlan.buttonText
              ) : (
                "Loading secure checkout..."
              )}
            </button>

            <p className="mt-5 text-center text-xs font-semibold leading-5 text-[#94A3B8]">
              Payment, taxes, invoices, cancellations, and refund processing are
              handled by Paddle as Merchant of Record.
            </p>
          </aside>
        </section>
      </main>
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F8FC] text-[#0E1B35]">
          <div className="text-sm font-bold text-[#64748B]">
            Loading checkout...
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

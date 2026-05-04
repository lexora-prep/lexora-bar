"use client"

import Link from "next/link"
import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

type PlanKey = "free" | "bll-monthly" | "premium"

type Plan = {
  id: PlanKey
  label: string
  eyebrow: string
  price: string
  billing: string
  description: string
  features: string[]
  nextStep: string
  buttonText: string
  tone: "free" | "core" | "premium"
}

const PLANS: Record<PlanKey, Plan> = {
  free: {
    id: "free",
    label: "Free",
    eyebrow: "Demo access",
    price: "$0",
    billing: "",
    description: "Limited access for trying Lexora Prep before upgrading.",
    features: [
      "Limited sample BLL rule access",
      "Basic rule recall preview",
      "No payment required",
      "Upgrade anytime from your account",
    ],
    nextStep: "Free users do not need Paddle checkout.",
    buttonText: "Go to dashboard",
    tone: "free",
  },
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19.99",
    billing: "/mo",
    description: "Full Black Letter Law rule training access for focused bar preparation.",
    features: [
      "Full BLL rule access",
      "Spaced repetition and flashcards",
      "Weak rule targeting",
      "Smart study plan and analytics",
    ],
    nextStep: "Complete payment through Paddle to activate paid access.",
    buttonText: "Continue to secure payment",
    tone: "core",
  },
  premium: {
    id: "premium",
    label: "Premium",
    eyebrow: "Advanced training",
    price: "$24.99",
    billing: "/mo",
    description: "Advanced rule memory tools, premium rule sets, and priority training features.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Priority training tools",
    ],
    nextStep: "Complete payment through Paddle to activate premium access.",
    buttonText: "Continue to secure payment",
    tone: "premium",
  },
}

function normalizePlan(value: string | null): PlanKey {
  if (value === "premium") return "premium"
  if (value === "bll-monthly" || value === "monthly") return "bll-monthly"
  if (value === "free") return "free"
  return "bll-monthly"
}

function CheckoutContent() {
  const searchParams = useSearchParams()

  const selectedPlanId = normalizePlan(searchParams.get("plan"))
  const registered = searchParams.get("registered") === "1"

  const selectedPlan = useMemo(() => PLANS[selectedPlanId], [selectedPlanId])

  const isFree = selectedPlan.id === "free"

  function handlePaymentClick() {
    if (isFree) {
      window.location.href = "/dashboard"
      return
    }

    /*
      Paddle integration point.

      When Paddle products/prices are ready, replace this placeholder with
      your Paddle checkout call or your own API route, for example:

      window.location.href = `/api/billing/checkout?plan=${selectedPlan.id}`

      Do not put secret Paddle keys in this client file.
    */
    window.alert(
      "Paddle checkout is not connected yet. Next step: connect this button to your Paddle checkout link or billing API route."
    )
  }

  return (
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
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute right-[-130px] top-[-170px] h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[-130px] h-[440px] w-[440px] rounded-full bg-[#0E1B35]/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(124,58,237,0.045),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(14,27,53,0.04),transparent_55%)]" />
      </div>

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
            Final step
          </div>

          <h1 className="font-serif text-[44px] font-normal leading-[1.04] tracking-[-0.04em] text-[#0E1B35] md:text-[62px]">
            {registered ? "Account created." : "Checkout step."}{" "}
            <span className="italic text-[#5B21B6]">
              Complete your access.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[#475569]">
            Your selected plan is saved below. Free users can enter the platform
            directly. Paid users continue to secure Paddle checkout before paid
            access is activated.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[#E2E6F0] bg-white/90 p-5 shadow-[0_12px_34px_rgba(14,27,53,0.06)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-sm font-black text-[#0E1B35]">
                Account first
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Registration happens before payment so the selected plan stays
                tied to the account.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E2E6F0] bg-white/90 p-5 shadow-[0_12px_34px_rgba(14,27,53,0.06)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#7C3AED]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="text-sm font-black text-[#0E1B35]">
                Paddle payment
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Taxes, invoices, cancellations, and payment processing are
                handled through Paddle.
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
                Lexora Prep is a supplemental educational tool and does not
                guarantee bar exam passage.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-[30px] border border-[#E2E6F0] bg-white p-6 shadow-[0_28px_80px_rgba(14,27,53,0.13)] md:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
                Selected plan
              </div>
              <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0E1B35]">
                {selectedPlan.label}
              </div>
            </div>

            <Link
              href={`/register?plan=${selectedPlan.id}`}
              className="rounded-full border border-[#E2E6F0] bg-[#F7F8FC] px-3 py-1.5 text-xs font-black text-[#64748B] transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
            >
              Change
            </Link>
          </div>

          <div
            className={
              selectedPlan.tone === "premium"
                ? "rounded-[26px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#F59E0B] p-5 text-white shadow-[0_18px_45px_rgba(14,27,53,0.20)]"
                : selectedPlan.tone === "core"
                  ? "rounded-[26px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#6D28D9] p-5 text-white shadow-[0_18px_45px_rgba(14,27,53,0.20)]"
                  : "rounded-[26px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#475569] p-5 text-white shadow-[0_18px_45px_rgba(14,27,53,0.20)]"
            }
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              {selectedPlan.eyebrow}
            </div>

            <div className="mt-4 flex items-end gap-1">
              <div className="text-[50px] font-black leading-none tracking-[-0.08em]">
                {selectedPlan.price}
              </div>
              {selectedPlan.billing ? (
                <div className="pb-1 text-lg font-black text-white/65">
                  {selectedPlan.billing}
                </div>
              ) : null}
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

          <div className="mt-6 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] p-4 text-sm leading-6 text-[#5B21B6]">
            {selectedPlan.nextStep}
          </div>

          <button
            type="button"
            onClick={handlePaymentClick}
            className="mt-5 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(14,27,53,0.24)] transition hover:-translate-y-0.5 hover:bg-[#162B55]"
          >
            {selectedPlan.buttonText}
          </button>

          <p className="mt-5 text-center text-xs font-semibold leading-5 text-[#94A3B8]">
            By continuing, you agree to Lexora Prep&apos;s{" "}
            <Link href="/terms" className="font-black text-[#7C3AED]">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="font-black text-[#7C3AED]">
              Privacy Policy
            </Link>
            , and{" "}
            <Link href="/refund" className="font-black text-[#7C3AED]">
              Refund Policy
            </Link>
            .
          </p>
        </aside>
      </section>
    </main>
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

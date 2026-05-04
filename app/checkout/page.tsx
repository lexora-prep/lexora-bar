import Link from "next/link"

type PlanKey = "free" | "monthly" | "premium"

const plans: Record<
  PlanKey,
  {
    label: string
    eyebrow: string
    price: string
    suffix?: string
    description: string
    features: string[]
    href: string
    button: string
    popular?: boolean
  }
> = {
  free: {
    label: "Free",
    eyebrow: "Demo access",
    price: "$0",
    description: "Try Lexora Prep with limited rule recall access.",
    features: [
      "Limited BLL rule access",
      "Basic recall practice",
      "Create account free",
      "No credit card required",
    ],
    href: "/register?plan=free",
    button: "Start free →",
  },
  monthly: {
    label: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19",
    suffix: ".99/mo",
    description: "Full Black Letter Law rule training access.",
    features: [
      "Full BLL rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
    ],
    href: "/register?plan=bll-monthly",
    button: "Start training →",
    popular: true,
  },
  premium: {
    label: "Premium",
    eyebrow: "Advanced training",
    price: "$24",
    suffix: ".99/mo",
    description: "Advanced rule memory tools and priority training.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Priority training tools",
    ],
    href: "/register?plan=premium",
    button: "Start premium →",
  },
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0E1B35]">
      <header className="border-b border-[#E2E8F0] bg-[#F7F8FC]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
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
            className="rounded-2xl border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-black shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7C3AED]">
            Choose access
          </p>

          <h1 className="font-serif text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[46px]">
            Choose your Lexora Prep plan.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#475569]">
            Start free or choose a paid plan. New users create an account first,
            then paid plans continue to Paddle checkout.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {(Object.keys(plans) as PlanKey[]).map((key) => {
            const plan = plans[key]

            return (
              <div
                key={key}
                className={`relative rounded-[30px] bg-white p-7 transition ${
                  plan.popular
                    ? "border-2 border-[#0E1B35] shadow-[0_28px_80px_rgba(14,27,53,0.14)]"
                    : "border border-[#D8E0EF] shadow-[0_18px_55px_rgba(14,27,53,0.05)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute left-1/2 top-0 flex h-12 w-[220px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#CBD5E1] bg-gradient-to-r from-[#0E1B35] to-[#7C3AED] text-sm font-black text-white shadow-[0_18px_40px_rgba(124,58,237,0.28)]">
                    Most popular
                  </div>
                )}

                <div className={plan.popular ? "pt-6" : ""}>
                  <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#0E1B35]">
                    {plan.label}
                  </p>

                  <div className="mt-5 flex items-end">
                    <span className="text-[58px] font-black leading-none tracking-[-0.08em]">
                      {plan.price}
                    </span>
                    {plan.suffix && (
                      <span className="mb-2 ml-1 text-[23px] font-black tracking-[-0.04em] text-[#94A3B8]">
                        {plan.suffix}
                      </span>
                    )}
                  </div>

                  <p className="mt-5 min-h-[54px] text-[17px] leading-7 text-[#475569]">
                    {plan.description}
                  </p>

                  <div className="my-7 h-px bg-[#E2E8F0]" />

                  <div className="space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#DDD6FE] bg-[#F5F3FF] text-sm font-black text-[#7C3AED]">
                          ✓
                        </span>
                        <span className="text-[15px] font-semibold leading-6 text-[#0E1B35]">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={plan.href}
                    className={`mt-9 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black shadow-xl transition ${
                      plan.popular
                        ? "bg-[#0E1B35] text-white hover:bg-[#162B55]"
                        : "border border-[#CBD5E1] bg-white text-[#0E1B35] hover:border-[#7C3AED] hover:text-[#7C3AED]"
                    }`}
                  >
                    {plan.button}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs font-semibold leading-6 text-[#64748B]">
          Lexora Prep is a digital educational service. Free access does not require
          payment. Paid access begins after registration and Paddle checkout. By
          continuing, you agree to Lexora Prep&apos;s{" "}
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
      </section>
    </main>
  )
}

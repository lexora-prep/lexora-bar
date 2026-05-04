import Link from "next/link"

type PlanKey = "free" | "monthly" | "premium"

type SearchParams = {
  plan?: string
}

const plans: Record<
  PlanKey,
  {
    label: string
    eyebrow: string
    price: string
    priceSuffix?: string
    summary: string
    features: string[]
    button: string
    registerHref: string
  }
> = {
  free: {
    label: "Free",
    eyebrow: "Demo access",
    price: "$0",
    summary: "Limited access to test the Lexora Prep rule recall flow.",
    features: [
      "Create a Lexora Prep account",
      "Limited rule training access",
      "Basic recall practice",
      "No credit card required",
    ],
    button: "Continue with free access →",
    registerHref: "/register?plan=free",
  },
  monthly: {
    label: "BLL Monthly",
    eyebrow: "Core memorization",
    price: "$19.99",
    priceSuffix: "/mo",
    summary: "Full Black Letter Law rule training and analytics.",
    features: [
      "Full Black Letter Law rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
      "Performance analytics",
    ],
    button: "Create account and continue →",
    registerHref: "/register?plan=bll-monthly",
  },
  premium: {
    label: "Premium",
    eyebrow: "Advanced training",
    price: "$24.99",
    priceSuffix: "/mo",
    summary: "Advanced rule memory tools and priority training features.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced rule sets",
      "Priority training tools",
      "Performance analytics",
    ],
    button: "Create account and continue →",
    registerHref: "/register?plan=premium",
  },
}

function normalizePlan(plan?: string): PlanKey {
  if (plan === "premium") return "premium"
  if (plan === "monthly" || plan === "bll-monthly") return "monthly"
  return "free"
}

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const selectedKey = normalizePlan(searchParams?.plan)
  const selectedPlan = plans[selectedKey]

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

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-12">
        <div className="rounded-[30px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.05)] md:p-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7C3AED]">
            Choose access
          </p>

          <h1 className="max-w-xl font-serif text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[42px]">
            Choose your Lexora Prep plan.
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#475569]">
            Pick Free, BLL Monthly, or Premium. New users create an account first.
            Paid plans continue to Paddle checkout after registration.
          </p>

          <div className="mt-8 space-y-3">
            {(Object.keys(plans) as PlanKey[]).map((key) => {
              const plan = plans[key]
              const active = key === selectedKey

              return (
                <Link
                  key={key}
                  href={`/checkout?plan=${key === "monthly" ? "bll-monthly" : key}`}
                  className={`group block rounded-[22px] px-5 py-4 transition ${
                    active
                      ? "bg-[#F4EEFF] ring-2 ring-[#7C3AED]"
                      : "bg-white ring-1 ring-[#D8E0EF] hover:bg-[#FAF8FF] hover:ring-[#BFA7FF]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
                        {plan.eyebrow}
                      </p>
                      <h2 className="text-[21px] font-black tracking-[-0.04em]">
                        {plan.label}
                      </h2>
                    </div>

                    <div className="shrink-0 text-right text-[25px] font-black tracking-[-0.05em]">
                      {plan.price}
                      {plan.priceSuffix && (
                        <span className="text-[17px] tracking-[-0.03em]">
                          {plan.priceSuffix}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.05)] md:p-8">
          <div className="rounded-[26px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E5D] to-[#6D28D9] p-6 text-white shadow-[0_20px_45px_rgba(30,27,75,0.18)]">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#C4B5FD]">
              Selected plan
            </p>

            <div className="flex items-end justify-between gap-5">
              <div>
                <h2 className="text-[29px] font-black tracking-[-0.05em]">
                  {selectedPlan.label}
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/75">
                  Lexora Prep access
                </p>
              </div>

              <div className="shrink-0 text-right text-[34px] font-black tracking-[-0.06em]">
                {selectedPlan.price}
                {selectedPlan.priceSuffix && (
                  <span className="text-[20px] tracking-[-0.03em]">
                    {selectedPlan.priceSuffix}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-black tracking-[-0.04em]">
              Included
            </h3>

            <div className="mt-5 grid gap-4">
              {selectedPlan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-sm font-black text-[#7C3AED]">
                    ✓
                  </span>
                  <span className="text-[15px] font-black tracking-[-0.02em] text-[#0E1B35]">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-[14px] leading-7 text-[#475569]">
            Lexora Prep is a digital educational service. Free access does not
            require payment. Paid access begins after registration and Paddle
            checkout. Where permitted by applicable law, using or accessing the
            platform may affect refund or withdrawal rights.
          </p>

          <Link
            href={selectedPlan.registerHref}
            className="mt-7 flex w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 py-4 text-sm font-black text-white shadow-xl transition hover:bg-[#162B55]"
          >
            {selectedPlan.button}
          </Link>

          <p className="mt-5 text-center text-xs font-semibold leading-6 text-[#64748B]">
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
        </div>
      </section>
    </main>
  )
}

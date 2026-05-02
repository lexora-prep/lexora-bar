import Link from "next/link"

export const metadata = {
  title: "Refund Policy | Lexora Prep",
  description: "Refund Policy for Lexora Prep LLC.",
}

const sections = [
  {
    title: "1. Refund Window",
    body: [
      "Lexora Prep provides a refund window of 14 calendar days from the transaction date.",
      "A customer may request a refund within 14 calendar days of purchase by contacting support or using the refund process made available by Paddle."
    ],
  },
  {
    title: "2. Payment Processor",
    body: [
      "Payments and refunds for Lexora Prep are processed through Paddle. Paddle acts as the merchant of record and authorized reseller for transactions made through Paddle Checkout.",
      "Refunds are handled in accordance with Paddle’s refund process and applicable law."
    ],
  },
  {
    title: "3. Subscription Cancellation",
    body: [
      "You may cancel a subscription at any time. Cancellation stops future renewal charges and takes effect at the end of the current billing period unless otherwise required by applicable law or Paddle’s buyer terms.",
      "Cancelling a subscription does not prevent you from requesting a refund within the 14 calendar day refund window."
    ],
  },
  {
    title: "4. How to Request a Refund",
    body: [
      "To request a refund, contact support@lexoraprep.com within 14 calendar days of the transaction date.",
      "Please include the email address used for purchase, the transaction date, and the name of the plan purchased."
    ],
  },
  {
    title: "5. Mandatory Consumer Rights",
    body: [
      "Nothing in this Refund Policy limits any mandatory consumer protection rights, statutory withdrawal rights, or refund rights that apply in your country of purchase.",
      "Where applicable law or Paddle’s buyer terms provide additional rights, those rights continue to apply."
    ],
  },
  {
    title: "6. Contact",
    body: [
      "For refund questions, contact Lexora Prep LLC at support@lexoraprep.com."
    ],
  },
]

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-12 text-[#0E1B35] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-[#7C3AED]">
          ← Back to Lexora Prep
        </Link>

        <article className="rounded-[28px] border border-[#E2E6F0] bg-white p-7 shadow-[0_20px_70px_rgba(14,27,53,0.08)] sm:p-12">
          <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#7C3AED]">
            Legal
          </div>

          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-[#0E1B35] sm:text-5xl">
            Refund Policy
          </h1>

          <p className="mt-4 text-sm font-medium text-[#64748B]">
            Last updated: May 3, 2026
          </p>

          <p className="mt-8 text-[16px] leading-8 text-[#334155]">
            This Refund Policy explains the refund window and refund process for purchases of Lexora Prep products and subscriptions.
          </p>

          <div className="mt-10 space-y-9">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#0E1B35]">
                  {section.title}
                </h2>

                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[15.5px] leading-8 text-[#1E293B]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] p-5 text-[14px] font-semibold leading-7 text-[#5B21B6]">
            Refund window: 14 calendar days from the transaction date.
          </div>
        </article>
      </div>
    </main>
  )
}

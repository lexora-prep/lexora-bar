import Link from "next/link"

export const metadata = {
  title: "Refund Policy | Lexora Prep",
  description: "Refund Policy for Lexora Prep.",
}

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

const sections: LegalSection[] = [{'title': '1. Seven Day Refund Window', 'body': ['You may request a full refund within 7 calendar days of your initial purchase if you meet the usage requirement below.']}, {'title': '2. Usage Requirement', 'body': ['To qualify for a full refund, you must have accessed less than 25% of the paid materials available under your plan. If 25% or more of paid materials have been used, Lexora Prep may deny the refund request.']}, {'title': '3. Non Refundable Situations', 'body': ['Refunds are generally not available if the request is late, 25% or more of materials were used, the account violated the Terms, or the user forgot to cancel before renewal.']}, {'title': '4. Subscription Cancellation', 'body': ['You may cancel your subscription to stop future billing. Cancellation does not automatically create a refund unless the refund request satisfies this Refund Policy.']}, {'title': '5. Payment Processor', 'body': ['Refunds are processed through Paddle or another authorized payment processor.']}, {'title': '6. How to Request a Refund', 'body': ['Contact support@lexoraprep.com within the applicable refund window. Include the email used for purchase, the date of purchase, and the reason for the request.']}]

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-16 text-[#0E1B35] select-none">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#E2E6F0] bg-white px-8 py-10 shadow-[0_24px_60px_rgba(14,27,53,0.10)] md:px-14 md:py-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-bold text-[#7C3AED]">
            Lexora Prep
          </Link>
          <Link href="/" className="rounded-full border border-[#CDD3E6] px-4 py-2 text-sm font-semibold text-[#475569] transition hover:border-[#0E1B35] hover:text-[#0E1B35]">
            Back home
          </Link>
        </div>

        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7C3AED]">
          Legal
        </div>

        <h1 className="font-serif text-4xl font-normal tracking-[-0.04em] text-[#0E1B35] md:text-5xl">
          Refund Policy
        </h1>

        <p className="mt-4 text-sm font-medium text-[#94A3B8]">
          Last updated: April 29, 2026
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[#0E1B35]">
                {section.title}
              </h2>
              {section.body.map((paragraph, pIndex) => (
                <p key={pIndex} className="mt-3 text-[15px] leading-8 text-[#1E293B]">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-8 text-[#1E293B]">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] px-5 py-4 text-sm font-semibold leading-7 text-[#5B21B6]">
          For support, contact support@lexoraprep.com.
        </div>
      </div>
    </main>
  )
}

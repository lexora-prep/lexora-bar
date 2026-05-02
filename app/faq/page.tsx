import Link from "next/link"

export const metadata = {
  title: "FAQ | Lexora Prep",
  description: "Frequently asked questions about Lexora Prep.",
}

const faqs = [
  {
    q: "What is Lexora Prep?",
    a: "Lexora Prep is a Black Letter Law memorization and rule recall training platform for bar exam candidates."
  },
  {
    q: "Is Lexora Prep a full bar prep course?",
    a: "No. Lexora Prep is a supplemental educational tool focused on Black Letter Law memorization and rule recall. It is not a full commercial bar preparation course."
  },
  {
    q: "Who operates Lexora Prep?",
    a: "Lexora Prep is operated by Lexora Prep LLC."
  },
  {
    q: "Does Lexora Prep guarantee bar exam success?",
    a: "No. Lexora Prep LLC does not guarantee that you will pass any bar exam, receive a particular score, improve your score, or be admitted to practice law."
  },
  {
    q: "How are payments processed?",
    a: "Payments are processed through Paddle. Paddle acts as the merchant of record and authorized reseller for transactions made through Paddle Checkout."
  },
  {
    q: "What is the refund window?",
    a: "The refund window is 14 calendar days from the transaction date."
  },
  {
    q: "How do I request a refund?",
    a: "Contact support@lexoraprep.com within 14 calendar days of the transaction date and include the email address used for purchase, the transaction date, and the plan purchased."
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. You may cancel your subscription at any time. Cancellation stops future renewal charges and takes effect at the end of the current billing period unless otherwise required by applicable law or Paddle’s buyer terms."
  }
]

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-12 text-[#0E1B35] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-[#7C3AED]">
          ← Back to Lexora Prep
        </Link>

        <article className="rounded-[28px] border border-[#E2E6F0] bg-white p-7 shadow-[0_20px_70px_rgba(14,27,53,0.08)] sm:p-12">
          <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#7C3AED]">
            Help Center
          </div>

          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-[#0E1B35] sm:text-5xl">
            Frequently Asked Questions
          </h1>

          <p className="mt-4 text-sm font-medium text-[#64748B]">
            Last updated: May 3, 2026
          </p>

          <div className="mt-10 space-y-5">
            {faqs.map((item) => (
              <section key={item.q} className="rounded-2xl border border-[#E2E6F0] bg-[#F8FAFC] p-5">
                <h2 className="text-[18px] font-extrabold text-[#0E1B35]">{item.q}</h2>
                <p className="mt-2 text-[15.5px] leading-8 text-[#334155]">{item.a}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] p-5 text-[14px] font-semibold leading-7 text-[#5B21B6]">
            For support, contact support@lexoraprep.com.
          </div>
        </article>
      </div>
    </main>
  )
}

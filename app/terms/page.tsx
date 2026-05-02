import Link from "next/link"

export const metadata = {
  title: "Terms and Conditions | Lexora Prep",
  description: "Terms and Conditions for Lexora Prep LLC.",
}

const sections = [
  {
    title: "1. Company Information",
    body: [
      "These Terms and Conditions govern your access to and use of Lexora Prep, including the website, platform, software, study tools, rule statements, flashcards, analytics, and related services.",
      "Lexora Prep is operated by Lexora Prep LLC, a limited liability company registered in the United States.",
      "By creating an account, purchasing a subscription, accessing the platform, or using Lexora Prep, you agree to these Terms and Conditions."
    ],
  },
  {
    title: "2. Educational Purpose Only",
    body: [
      "Lexora Prep is an educational technology platform designed to support Black Letter Law memorization and rule recall training for bar exam candidates.",
      "Lexora Prep LLC is not a law firm, legal advisor, law school, bar review company, official bar examination authority, or government agency.",
      "The platform does not provide legal advice and does not create an attorney client relationship."
    ],
  },
  {
    title: "3. Supplemental Study Tool",
    body: [
      "Lexora Prep is intended only as a supplemental study aid. It should not be used as your only source of preparation for any bar examination.",
      "Users are responsible for using appropriate official materials, licensed bar preparation materials, primary law, and other study resources as needed."
    ],
  },
  {
    title: "4. No Guarantee of Results",
    body: [
      "Lexora Prep LLC does not guarantee that you will pass any bar exam, receive a particular score, improve your score, be admitted to practice law, or achieve any academic, professional, or licensing outcome.",
      "Your results depend on many factors outside Lexora Prep LLC’s control, including your study habits, prior knowledge, exam conditions, jurisdictional requirements, and use of other preparation materials."
    ],
  },
  {
    title: "5. User Responsibility",
    body: [
      "You are solely responsible for your own preparation, study decisions, use of the platform, interpretation of educational materials, and reliance on any content made available through Lexora Prep.",
      "You are responsible for verifying important legal rules with official sources, licensed bar preparation materials, or applicable primary law when necessary."
    ],
  },
  {
    title: "6. Account Use and Security",
    body: [
      "You must provide accurate account information and keep your login credentials secure.",
      "Each account is for one individual user only. You may not share your password, sell access, transfer your account, or allow another person to use your account.",
      "You are responsible for activity that occurs under your account."
    ],
  },
  {
    title: "7. Prohibited Conduct",
    body: [
      "You may not copy, scrape, reproduce, publish, sell, redistribute, or commercially exploit Lexora Prep content without written permission from Lexora Prep LLC.",
      "You may not share paid access, rule banks, flashcards, screenshots, premium materials, or platform content with third parties.",
      "You may not use bots, crawlers, automation tools, unauthorized scripts, or technical workarounds to access the platform.",
      "You may not attempt to bypass payment systems, access controls, subscription limits, account restrictions, or security features.",
      "You may not use the platform for unlawful, abusive, fraudulent, harmful, or misleading purposes."
    ],
  },
  {
    title: "8. Intellectual Property",
    body: [
      "All Lexora Prep materials, including rule statements, flashcards, study tools, design elements, software, platform structure, text, logos, and other content, are owned by Lexora Prep LLC or its licensors and are protected by applicable intellectual property laws.",
      "Subject to these Terms, Lexora Prep LLC grants you a limited, revocable, non exclusive, non transferable license to access and use the platform for personal study purposes only.",
      "No ownership rights are transferred to you."
    ],
  },
  {
    title: "9. Subscriptions and Payments",
    body: [
      "Paid subscriptions and purchases for Lexora Prep are processed through Paddle. Paddle acts as the merchant of record and authorized reseller for transactions made through Paddle Checkout.",
      "Payment terms, payment methods, taxes, invoices, subscription billing, renewals, cancellations, and payment related notices may be handled by Paddle in accordance with Paddle’s applicable buyer terms and policies.",
      "Lexora Prep LLC does not store full credit card numbers on its own servers."
    ],
  },
  {
    title: "10. Subscription Cancellation",
    body: [
      "You may cancel a subscription at any time. Cancellation stops future renewal charges and takes effect at the end of the current billing period unless otherwise required by applicable law or Paddle’s buyer terms.",
      "Access may continue until the end of the paid subscription period after cancellation."
    ],
  },
  {
    title: "11. Refunds",
    body: [
      "Refunds are governed by the Lexora Prep Refund Policy and processed through Paddle.",
      "Lexora Prep provides a refund window of 14 calendar days from the transaction date.",
      "Where mandatory consumer law gives you additional rights, those rights are not limited by these Terms."
    ],
  },
  {
    title: "12. Content Accuracy",
    body: [
      "Lexora Prep aims to provide accurate and useful educational summaries of Black Letter Law, but legal rules may vary by jurisdiction, change over time, or require more detailed analysis than a memorization tool can provide.",
      "Lexora Prep LLC does not warrant that all content is complete, current, error free, or suitable for every jurisdiction."
    ],
  },
  {
    title: "13. Beta, Preview, and Coming Soon Features",
    body: [
      "Some features may be labeled beta, preview, experimental, or coming soon. These features may change, be delayed, be limited, or be removed at any time."
    ],
  },
  {
    title: "14. Suspension or Termination",
    body: [
      "Lexora Prep LLC may suspend or terminate your account if you violate these Terms, misuse the platform, engage in fraudulent conduct, create security risks, or use the platform in a way that may harm Lexora Prep LLC, users, or third parties."
    ],
  },
  {
    title: "15. Disclaimers",
    body: [
      "Lexora Prep is provided on an as is and as available basis. To the fullest extent permitted by law, Lexora Prep LLC disclaims all warranties, express or implied, including warranties of accuracy, fitness for a particular purpose, non infringement, and uninterrupted availability.",
      "Nothing in these Terms limits rights that cannot be limited under applicable law."
    ],
  },
  {
    title: "16. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Lexora Prep LLC and its affiliates will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages, including lost profits, lost data, lost business opportunities, or exam related outcomes.",
      "To the fullest extent permitted by law, Lexora Prep LLC’s total liability for any claim relating to the platform will not exceed the amount you paid for Lexora Prep during the one month period before the claim arose."
    ],
  },
  {
    title: "17. Contact",
    body: [
      "For questions about these Terms, contact Lexora Prep LLC at support@lexoraprep.com."
    ],
  },
]

export default function TermsPage() {
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
            Terms and Conditions
          </h1>

          <p className="mt-4 text-sm font-medium text-[#64748B]">
            Last updated: May 3, 2026
          </p>

          <p className="mt-8 text-[16px] leading-8 text-[#334155]">
            These Terms and Conditions apply to Lexora Prep LLC and the Lexora Prep platform.
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
            Lexora Prep LLC is a supplemental educational platform. It does not provide legal advice and does not guarantee bar exam success.
          </div>
        </article>
      </div>
    </main>
  )
}

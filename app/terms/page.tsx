import Link from "next/link"

export const metadata = {
  title: "Terms and Conditions | Lexora Prep",
  description: "Terms and Conditions for Lexora Prep.",
}

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

const sections: LegalSection[] = [{'title': '1. Educational Purpose Only', 'body': ['Lexora Prep is an educational technology platform designed to support Black Letter Law memorization and rule training. It is not a law firm, legal advisor, law school, licensed bar preparation company, or official bar examination authority.']}, {'title': '2. Supplemental Study Tool', 'body': ['Lexora Prep is intended only as a supplemental study aid. It should not be used as your only source of preparation for any bar examination.']}, {'title': '3. No Guarantee of Results', 'body': ['Lexora Prep does not guarantee that you will pass any bar exam, receive a particular score, improve your score, be admitted to practice law, or achieve any academic, professional, or licensing outcome.']}, {'title': '4. User Responsibility', 'body': ['You are solely responsible for your own preparation, study decisions, use of the platform, and reliance on any educational content.']}, {'title': '5. Account Use and Security', 'body': ['You must provide accurate account information and keep your login credentials secure. Each account is for one individual user only. You may not share your password, sell access, or allow another person to use your account.']}, {'title': '6. Prohibited Conduct', 'body': ['You may not misuse Lexora Prep or its materials.'], 'items': ['Copying, scraping, downloading, reproducing, publishing, selling, or redistributing Lexora Prep content without permission.', 'Sharing your account, password, paid access, screenshots, rule banks, flashcards, or premium materials with others.', 'Using bots, crawlers, automation tools, or unauthorized scripts to access the platform.', 'Attempting to bypass payment, access controls, subscription limits, or security features.', 'Using the platform for unlawful, abusive, fraudulent, or harmful purposes.']}, {'title': '7. Intellectual Property', 'body': ['All Lexora Prep materials are owned by Lexora Prep or its licensors and are protected by applicable laws. You receive a limited, revocable, non-transferable license to use the platform for personal study only.']}, {'title': '8. Subscriptions and Payments', 'body': ['Paid subscriptions are billed according to the plan selected at checkout. Payments are processed through Paddle or another authorized payment processor. Lexora Prep does not store full credit card numbers on its own servers.']}, {'title': '9. Cancellation', 'body': ['You may cancel your subscription at any time. Cancellation stops future renewal charges but does not automatically create a refund unless the refund requirements in the Refund Policy are satisfied.']}, {'title': '10. Refunds', 'body': ['Refunds are governed by the Refund Policy. A full refund may be available within 7 days of purchase only if less than 25% of paid materials have been accessed.']}, {'title': '11. Content Accuracy', 'body': ['Legal rules may vary by jurisdiction, change over time, or require more detailed analysis than a memorization tool can provide. We do not warrant that all content is complete, current, or error free.']}, {'title': '12. Beta and Coming Soon Features', 'body': ['Some features may be labeled beta, preview, or coming soon. These features may change, be delayed, or be removed.']}, {'title': '13. Suspension or Termination', 'body': ['We may suspend or terminate your account if you violate these Terms, misuse the platform, or engage in conduct that may harm Lexora Prep, users, or third parties.']}, {'title': '14. Disclaimers', 'body': ['Lexora Prep is provided on an as is and as available basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied.']}, {'title': '15. Limitation of Liability', 'body': ['To the fullest extent permitted by law, Lexora Prep and its affiliates will not be liable for indirect, incidental, consequential, or exemplary damages. Our total liability will not exceed the amount you paid during the one month period before the claim arose.']}, {'title': '16. Contact', 'body': ['For questions, contact support@lexoraprep.com.']}]

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
          Terms and Conditions
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

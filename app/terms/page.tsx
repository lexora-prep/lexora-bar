
import Link from "next/link"

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

type LegalPageProps = {
  eyebrow: string
  title: string
  description: string
  sections: LegalSection[]
}

function LegalPage({ eyebrow, title, description, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-12 text-[#0E1B35]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 text-[15px] font-bold text-[#0E1B35]">
            <img
              src="/lexora-icon-transparent.png"
              alt="Lexora Prep"
              className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#E2E6F0]"
            />
            <span>Lexora <span className="text-[#7C3AED]">Prep</span></span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#CDD3E6] bg-white px-4 py-2 text-[13px] font-semibold text-[#475569] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            Back to Home
          </Link>
        </div>

        <article
          className="rounded-[28px] border border-[#E2E6F0] bg-white p-7 shadow-[0_24px_60px_rgba(14,27,53,0.10)] md:p-12"
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
        >
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7C3AED]">
            {eyebrow}
          </div>

          <h1 className="mb-3 text-[36px] font-extrabold tracking-[-0.04em] text-[#0E1B35] md:text-[48px]">
            {title}
          </h1>

          <p className="mb-9 max-w-2xl text-[15px] leading-8 text-[#475569]">
            {description}
          </p>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={index} className="border-t border-[#E2E6F0] pt-7">
                <h2 className="mb-3 text-[20px] font-bold text-[#0E1B35]">
                  {section.title}
                </h2>

                <div className="space-y-3">
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="text-[15px] leading-8 text-[#1E293B]">
                      {paragraph}
                    </p>
                  ))}

                  {section.items && section.items.length > 0 && (
                    <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-8 text-[#1E293B]">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[18px] border border-[#DDD6FE] bg-[#F3F0FF] px-5 py-4 text-[14px] font-semibold leading-7 text-[#5B21B6]">
            For questions, contact support@lexoraprep.com.
          </div>
        </article>
      </div>
    </main>
  )
}

export default function Page() {
  const sections: LegalSection[] = [{'title': '1. Educational Purpose Only', 'body': ['Lexora Prep is an educational technology platform designed to support Black Letter Law memorization and rule training. It is not a law firm, legal advisor, law school, licensed bar preparation company, or official bar examination authority.']}, {'title': '2. Supplemental Study Tool', 'body': ['Lexora Prep is intended only as a supplemental study aid. It should not be used as your only source of preparation for any bar examination.']}, {'title': '3. No Guarantee of Results', 'body': ['Lexora Prep does not guarantee that you will pass any bar exam, receive a particular score, improve your score, be admitted to practice law, or achieve any academic, professional, or licensing outcome.']}, {'title': '4. User Responsibility', 'body': ['You are solely responsible for your own preparation, study decisions, use of the platform, and reliance on any educational content.']}, {'title': '5. Account Use and Security', 'body': ['Each account is for one individual user only. You may not share your password, sell access, redistribute paid materials, or allow another person to use your account.']}, {'title': '6. Prohibited Conduct', 'body': ['You agree not to misuse Lexora Prep or interfere with the operation, security, or commercial integrity of the platform.'], 'items': ['Copying, scraping, downloading, reproducing, publishing, selling, or redistributing Lexora Prep content without permission.', 'Sharing paid access, screenshots, rule banks, flashcards, or premium materials with others.', 'Using bots, crawlers, automation tools, or unauthorized scripts to access the platform.', 'Attempting to bypass payment, subscription limits, access controls, or security features.', 'Using the platform for unlawful, abusive, fraudulent, or harmful purposes.']}, {'title': '7. Intellectual Property', 'body': ['All Lexora Prep materials are owned by Lexora Prep or its licensors and are protected by applicable intellectual property laws. You receive a limited, revocable, non transferable license to use the platform for personal study only.']}, {'title': '8. Subscriptions and Payments', 'body': ['Paid subscriptions are billed according to the plan selected at checkout. Payments are processed through Paddle. Lexora Prep does not store full credit card numbers on its own servers.']}, {'title': '9. Cancellation and Refunds', 'body': ['You may cancel your subscription at any time. Cancellation stops future renewal charges but does not automatically create a refund unless the refund requirements in the Refund Policy are satisfied.']}, {'title': '10. Content Accuracy', 'body': ['Legal rules may vary by jurisdiction, change over time, or require more detailed analysis than a memorization tool can provide. We do not warrant that all content is complete, current, or error free.']}, {'title': '11. Limitation of Liability', 'body': ['To the fullest extent permitted by law, Lexora Prep and its affiliates will not be liable for indirect, incidental, consequential, or exemplary damages. Our total liability will not exceed the amount you paid during the one month period before the claim arose.']}]

  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms and Conditions"
      description="These Terms and Conditions govern access to and use of Lexora Prep, including the website, platform, study tools, rule banks, flashcards, analytics, and related services."
      sections={sections}
    />
  )
}

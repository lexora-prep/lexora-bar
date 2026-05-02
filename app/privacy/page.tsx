
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
  const sections: LegalSection[] = [{'title': '1. Information We Collect', 'body': ['We may collect information you provide directly, including your name, email address, account credentials, subscription status, support messages, feedback, and other information you choose to submit.']}, {'title': '2. Study and Platform Data', 'body': ['We may collect study related data, including subjects reviewed, rules accessed, flashcard progress, completion status, weak areas, study plan settings, and platform usage data.']}, {'title': '3. Payment Information', 'body': ['Payments are processed through Paddle. Lexora Prep does not store full credit card numbers or payment card information on its own servers.']}, {'title': '4. How We Use Information', 'body': ['We use information to create and manage accounts, provide platform features, process billing through Paddle, respond to support requests, improve the platform, prevent fraud, and comply with legal obligations.']}, {'title': '5. We Do Not Sell Personal Data', 'body': ['Lexora Prep does not sell your personal data or provide it to third parties for their independent advertising purposes.']}, {'title': '6. Cookies', 'body': ['We may use cookies and similar technologies to keep users logged in, remember preferences, support security, and analyze usage. See the Cookie Policy for more information.']}, {'title': '7. Security', 'body': ['We use reasonable technical and organizational safeguards to protect user information. No internet based service can guarantee complete security.']}, {'title': '8. User Choices', 'body': ['You may request access, correction, deletion, or account closure by contacting support@lexoraprep.com.']}]

  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This Privacy Policy explains how Lexora Prep collects, uses, stores, and protects information when you use our website, platform, and related services."
      sections={sections}
    />
  )
}

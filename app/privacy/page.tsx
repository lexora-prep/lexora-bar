import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | Lexora Prep",
  description: "Privacy Policy for Lexora Prep.",
}

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

const sections: LegalSection[] = [{'title': '1. Information We Collect', 'body': ['We may collect information you provide directly, including your name, email address, account credentials, subscription status, support messages, feedback, and other information you choose to submit.']}, {'title': '2. Study and Platform Data', 'body': ['We may collect study related data, including subjects reviewed, rules accessed, flashcard progress, completion status, weak areas, study plan settings, and platform usage data.']}, {'title': '3. Payment Information', 'body': ['Payments are processed through Paddle or another authorized payment processor. Lexora Prep does not store full credit card numbers or payment card information on its own servers.']}, {'title': '4. How We Use Information', 'body': ['We use information to create and manage accounts, provide platform features, process billing, respond to support requests, improve the platform, prevent fraud, and comply with legal obligations.']}, {'title': '5. We Do Not Sell Personal Data', 'body': ['Lexora Prep does not sell your personal data or provide it to third parties for their independent advertising purposes.']}, {'title': '6. Cookies and Similar Technologies', 'body': ['We may use cookies and similar technologies to keep users logged in, remember preferences, support security, and analyze usage. See our Cookie Policy for more information.']}, {'title': '7. Data Security', 'body': ['We use reasonable technical and organizational safeguards to protect user information. No internet based service can guarantee complete security.']}, {'title': '8. User Choices', 'body': ['You may request access, correction, deletion, or account closure by contacting support.']}, {'title': '9. Contact', 'body': ['For privacy questions, contact support@lexoraprep.com.']}]

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
          Privacy Policy
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

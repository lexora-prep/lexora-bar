import Link from "next/link"

export const metadata = {
  title: "Cookie Policy | Lexora Prep",
  description: "Cookie Policy for Lexora Prep.",
}

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

const sections: LegalSection[] = [{'title': '1. What Are Cookies?', 'body': ['Cookies are small text files placed on your device when you visit a website.']}, {'title': '2. Strictly Necessary Cookies', 'body': ['Required for login, account security, session management, checkout, and basic functionality. These cannot be turned off.']}, {'title': '3. Preference Cookies', 'body': ['Remember your display settings, saved preferences, and cookie consent choices.']}, {'title': '4. Analytics Cookies', 'body': ['Help us understand how visitors use Lexora Prep and which features are used most.']}, {'title': '5. Marketing Cookies', 'body': ['May help measure advertising performance. Not enabled without your consent where legally required.']}, {'title': '6. Payment Cookies', 'body': ['Paddle or another authorized payment processor may use its own cookies for checkout, fraud prevention, and subscription management. Lexora Prep does not control all cookies set by third party checkout providers.']}, {'title': '7. Consent and Preferences', 'body': ['You can accept all cookies, reject non-essential cookies, or manage your preferences. Update choices anytime through Cookie Preferences where available.']}, {'title': '8. Contact', 'body': ['For questions, contact support@lexoraprep.com.']}]

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
          Cookie Policy
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

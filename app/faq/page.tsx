import Link from "next/link"

export const metadata = {
  title: "Frequently Asked Questions | Lexora Prep",
  description: "Frequently Asked Questions for Lexora Prep.",
}

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

const sections: LegalSection[] = [{'title': 'What is Lexora Prep?', 'body': ['Lexora Prep is a Black Letter Law memorization and rule training platform for bar exam candidates. It helps users read, recall, and practice legal rule statements through structured repetition, flashcards, weak-rule targeting, and study planning.']}, {'title': 'Is Lexora Prep a full bar prep course?', 'body': ['No. Lexora Prep is not a full commercial bar preparation course and should not be used as your only study resource. It is a supplemental study tool focused on Black Letter Law rule memorization and recall training.']}, {'title': 'Who is Lexora Prep designed for?', 'body': ['Lexora Prep is designed for bar exam candidates who want to strengthen their Black Letter Law rule memory, particularly for the MEE essay portion, where recalling precise rule statements is critical.']}, {'title': 'What is included in the Premium plan?', 'body': ['The Premium plan includes everything in the standard BLL plan, plus advanced rule sets, Golden Rules, Golden Flashcards, and priority support if offered in your subscription tier.']}, {'title': 'How does Lexora Prep help with the MEE?', 'body': ['MEE essay performance depends heavily on recognizing the issue and stating the correct legal rule precisely. Lexora Prep trains users to recall and recite Black Letter Law rule statements through structured practice.']}, {'title': 'Does Lexora Prep guarantee bar exam success?', 'body': ['No. Lexora Prep does not guarantee that you will pass the bar exam, receive a particular score, improve your score, or be admitted to practice law.']}, {'title': 'Are the rules accurate?', 'body': ['Lexora Prep aims to provide accurate and useful educational summaries of Black Letter Law. Legal rules can vary by jurisdiction and may change over time. Users should verify important rules with official sources, licensed bar preparation materials, or applicable primary law when necessary.']}, {'title': 'Can I share my account?', 'body': ['No. Each account is for one individual user only. Password sharing, shared access, resale, copying, or redistribution of materials is not allowed.']}, {'title': 'How are payments processed?', 'body': ['Payments are processed through Paddle or another authorized payment processor. Lexora Prep does not store full credit card numbers on its own servers.']}, {'title': 'How do refunds work?', 'body': ['A full refund may be available within 7 days of purchase only if less than 25% of paid materials have been accessed. Refunds are not automatic and are handled according to the Refund Policy.']}]

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
          Help Center
        </div>

        <h1 className="font-serif text-4xl font-normal tracking-[-0.04em] text-[#0E1B35] md:text-5xl">
          Frequently Asked Questions
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

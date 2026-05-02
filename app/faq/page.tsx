
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
  const sections: LegalSection[] = [{'title': 'What is Lexora Prep?', 'body': ['Lexora Prep is a Black Letter Law memorization and rule training platform for bar exam candidates. It helps users read, recall, and practice legal rule statements through structured repetition, flashcards, weak rule targeting, and study planning.']}, {'title': 'Is Lexora Prep a full bar prep course?', 'body': ['No. Lexora Prep is not a full commercial bar preparation course and should not be used as your only study resource. It is a supplemental study tool focused on Black Letter Law rule memorization and recall training.']}, {'title': 'Who is Lexora Prep designed for?', 'body': ['Lexora Prep is designed for bar exam candidates who want to strengthen their Black Letter Law rule memory, particularly for the MEE essay portion, where recalling precise rule statements is critical.']}, {'title': 'What is included in the Premium plan?', 'body': ['The Premium plan includes everything in BLL Monthly, plus premium rule sets, Golden Rules, Golden Flashcards, and priority support where available.']}, {'title': 'How are payments processed?', 'body': ['Payments are processed through Paddle. Lexora Prep does not store full credit card numbers on its own servers.']}, {'title': 'Does Lexora Prep guarantee bar exam success?', 'body': ['No. Lexora Prep does not guarantee that you will pass the bar exam, receive a particular score, improve your score, or be admitted to practice law.']}, {'title': 'Can I share my account?', 'body': ['No. Each account is for one individual user only. Password sharing, shared access, resale, copying, or redistribution of materials is not allowed.']}]

  return (
    <LegalPage
      eyebrow="Help Center"
      title="Frequently Asked Questions"
      description="Answers to common questions about Lexora Prep, subscriptions, rule training, and platform use."
      sections={sections}
    />
  )
}

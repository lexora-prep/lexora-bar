
"use client"

import Link from "next/link"

type Section = {
  title: string
  body: string[]
  items?: string[]
}

type LegalPageProps = {
  eyebrow: string
  title: string
  description: string
  sections: Section[]
}

export default function LegalPageTemplate({
  eyebrow,
  title,
  description,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0E1B35]">
      <section className="border-b border-[#E2E6F0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white ring-1 ring-[#E2E6F0] shadow-sm">
              <img
                src="/lexora-icon-transparent.png"
                alt="Lexora Prep"
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.02em]">
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#CDD3E6] px-4 py-2 text-[13px] font-semibold text-[#1E293B] transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            Back to home
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-7 shadow-[0_24px_60px_rgba(14,27,53,0.10)] md:p-12">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7C3AED]">
            {eyebrow}
          </div>

          <h1 className="mb-3 font-serif text-[38px] font-normal leading-tight tracking-[-0.03em] text-[#0E1B35] md:text-[52px]">
            {title}
          </h1>

          <p className="mb-10 max-w-2xl text-[15px] leading-8 text-[#475569]">
            {description}
          </p>

          <div className="space-y-9">
            {sections.map((section, index) => (
              <section key={index} className="border-t border-[#E2E6F0] pt-8">
                <h2 className="mb-3 text-[20px] font-bold tracking-[-0.02em] text-[#0E1B35]">
                  {section.title}
                </h2>

                <div className="space-y-4">
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-[15px] leading-8 text-[#1E293B]"
                    >
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

          <div className="mt-10 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] px-5 py-4 text-[14px] leading-7 text-[#5B21B6]">
            Lexora Prep is a supplemental educational tool. It is not a law firm, legal advisor, law school, official bar examination authority, or guarantee of bar exam success.
          </div>
        </div>
      </section>
    </main>
  )
}

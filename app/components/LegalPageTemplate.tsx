import Link from "next/link"

type LegalSection = {
  title: string
  body: string[]
  items?: string[]
}

type LegalPageTemplateProps = {
  eyebrow: string
  title: string
  description: string
  sections: LegalSection[]
}

export default function LegalPageTemplate({
  eyebrow,
  title,
  description,
  sections,
}: LegalPageTemplateProps) {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-8 text-[#0E1B35]">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center rounded-full border border-[#D8E0EF] bg-white px-4 py-2.5 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
        >
          ← Back to Lexora Prep
        </Link>

        <section className="rounded-[26px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_60px_rgba(14,27,53,0.07)] md:p-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">
            {eyebrow}
          </p>

          <h1 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-[#0E1B35] md:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#475569]">
            {description}
          </p>

          <div className="mt-8 space-y-5">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-[20px] border border-[#E2E8F0] bg-[#FBFCFF] p-5"
              >
                <h2 className="text-lg font-black tracking-[-0.02em] text-[#0E1B35]">
                  {index + 1}. {section.title}
                </h2>

                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-[14px] leading-7 text-[#1E293B]"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.items && section.items.length > 0 && (
                    <ul className="list-disc space-y-2 pl-5 text-[14px] leading-7 text-[#1E293B]">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

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
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#0E1B35]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center rounded-full border border-[#D8E0EF] bg-white px-5 py-3 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
        >
          ← Back to Lexora Prep
        </Link>

        <section className="rounded-[32px] border border-[#D8E0EF] bg-white p-8 shadow-[0_24px_80px_rgba(14,27,53,0.08)] md:p-12">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#7C3AED]">
            {eyebrow}
          </p>

          <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-[#0E1B35] md:text-6xl">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#475569] md:text-lg">
            {description}
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-6"
              >
                <h2 className="text-xl font-black tracking-[-0.02em] text-[#0E1B35]">
                  {index + 1}. {section.title}
                </h2>

                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-[15px] leading-8 text-[#1E293B]"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.items && section.items.length > 0 && (
                    <ul className="list-disc space-y-2 pl-6 text-[15px] leading-8 text-[#1E293B]">
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

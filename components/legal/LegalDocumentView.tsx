import type { ReactNode } from "react"

type FlexibleLegalSection = {
  heading?: string
  title?: string
  body?: string | string[]
  content?: string | string[]
  bullets?: string[]
  items?: string[]
}

type FlexibleLegalDocument = {
  title: string
  eyebrow?: string
  updated?: string
  lastUpdated?: string
  intro?: string | string[]
  sections?: FlexibleLegalSection[]
  note?: string
}

type LegalDocumentViewProps = {
  document: FlexibleLegalDocument
  modal?: boolean
  actions?: ReactNode
  returnHref?: string
}

function normalizeParagraphs(value?: string | string[]) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getSectionTitle(section: FlexibleLegalSection) {
  return section.heading || section.title || "Section"
}

function getSectionBody(section: FlexibleLegalSection) {
  return normalizeParagraphs(section.body || section.content)
}

function getSectionBullets(section: FlexibleLegalSection) {
  return section.bullets || section.items || []
}

export function LegalDocumentView({
  document,
  modal = false,
  actions,
  returnHref,
}: LegalDocumentViewProps) {
  const introParagraphs = normalizeParagraphs(document.intro)
  const updatedText = document.updated || document.lastUpdated

  return (
    <article
      className={
        modal
          ? "mx-auto w-full max-w-[860px] bg-white text-[#0E1B35]"
          : "mx-auto w-full max-w-[920px] rounded-[28px] border border-[#E2E6F0] bg-white px-6 py-8 text-[#0E1B35] shadow-[0_24px_70px_rgba(14,27,53,0.08)] md:px-10 md:py-10"
      }
    >
      <header className="border-b border-[#E2E6F0] pb-7">
        {document.eyebrow ? (
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">
            {document.eyebrow}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-serif text-[36px] font-normal leading-[1.06] tracking-[-0.045em] text-[#0E1B35] md:text-[48px]">
              {document.title}
            </h1>

            {updatedText ? (
              <p className="mt-3 text-sm font-semibold text-[#94A3B8]">
                Last updated: {updatedText}
              </p>
            ) : null}
          </div>

          <div className="shrink-0">
            {actions ? (
              actions
            ) : returnHref ? (
              <a
                href={returnHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CDD3E6] bg-white px-4 text-sm font-bold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
              >
                Back
              </a>
            ) : null}
          </div>
        </div>

        {introParagraphs.length ? (
          <div className="mt-6 max-w-[760px] space-y-4">
            {introParagraphs.map((paragraph, index) => (
              <p
                key={`intro-${index}`}
                className="text-[15px] leading-8 text-[#475569]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="divide-y divide-[#E2E6F0]">
        {(document.sections || []).map((section, index) => {
          const sectionTitle = getSectionTitle(section)
          const bodyParagraphs = getSectionBody(section)
          const bullets = getSectionBullets(section)

          return (
            <section
              key={`${sectionTitle}-${index}`}
              className="grid gap-4 py-7 md:grid-cols-[72px_minmax(0,1fr)] md:gap-8"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#A78BFA]">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div>
                <h2 className="text-[20px] font-black tracking-[-0.025em] text-[#0E1B35]">
                  {sectionTitle}
                </h2>

                {bodyParagraphs.length ? (
                  <div className="mt-4 space-y-4">
                    {bodyParagraphs.map((paragraph, paragraphIndex) => (
                      <p
                        key={`${sectionTitle}-body-${paragraphIndex}`}
                        className="text-[14.5px] leading-8 text-[#475569]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}

                {bullets.length ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5">
                    {bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${sectionTitle}-bullet-${bulletIndex}`}
                        className="text-[14.5px] leading-8 text-[#475569]"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>

      {document.note ? (
        <div className="mt-8 rounded-[20px] border border-[#DDD6FE] bg-[#F3F0FF] px-5 py-4 text-sm font-semibold leading-7 text-[#5B21B6]">
          {document.note}
        </div>
      ) : null}
    </article>
  )
}

export default LegalDocumentView
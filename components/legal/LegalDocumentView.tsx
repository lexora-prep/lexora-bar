import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"

type FlexibleLegalDocumentSection = {
  title?: string
  heading?: string
  body?: string[]
  bullets?: string[]
}

export type FlexibleLegalDocument = {
  key?: string
  eyebrow: string
  title: string
  updated?: string
  updatedAt?: string
  intro?: string[]
  sections: FlexibleLegalDocumentSection[]
  note?: string
}

type LegalDocumentViewProps = {
  document: FlexibleLegalDocument
  returnHref?: string
  pdfHref?: string
  pdfLabel?: string
  modal?: boolean
}

function getSectionTitle(section: FlexibleLegalDocumentSection) {
  return section.title || section.heading || "Section"
}

export function LegalDocumentView({
  document,
  returnHref = "/",
  pdfHref,
  pdfLabel = "Download PDF",
  modal = false,
}: LegalDocumentViewProps) {
  const updated = document.updated || document.updatedAt || "May 4, 2026"
  const intro = document.intro || []

  return (
    <article
      className={
        modal
          ? "mx-auto w-full max-w-[900px] text-[#0E1B35]"
          : "mx-auto w-full max-w-[980px] text-[#0E1B35]"
      }
    >
      {!modal ? (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={returnHref}
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-extrabold text-[#1E293B] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0E1B35] hover:text-[#0E1B35] hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          {pdfHref ? (
            <a
              href={pdfHref}
              className="group inline-flex w-fit items-center gap-2 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-2 text-sm font-extrabold text-[#6D28D9] shadow-[0_10px_26px_rgba(124,58,237,0.10)] transition hover:-translate-y-0.5 hover:border-[#A78BFA] hover:bg-white hover:shadow-[0_16px_34px_rgba(124,58,237,0.18)]"
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#7C3AED] shadow-sm transition group-hover:shadow-[0_0_22px_rgba(124,58,237,0.35)]">
                <Download className="h-4 w-4" />
              </span>
              {pdfLabel}
            </a>
          ) : null}
        </div>
      ) : null}

      <div
        className={
          modal
            ? "border-0 bg-transparent"
            : "rounded-[32px] border border-[#E2E6F0] bg-white px-6 py-8 shadow-[0_24px_70px_rgba(14,27,53,0.10)] md:px-10 md:py-11"
        }
      >
        <header className="border-b border-[#E2E6F0] pb-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
            <FileText className="h-3.5 w-3.5" />
            {document.eyebrow}
          </div>

          <h1 className="max-w-[760px] font-serif text-[42px] font-normal leading-[1.03] tracking-[-0.045em] text-[#0E1B35] md:text-[58px]">
            {document.title}
          </h1>

          <p className="mt-4 text-sm font-bold text-[#94A3B8]">
            Last updated: {updated}
          </p>

          {intro.length > 0 ? (
            <div className="mt-7 max-w-[780px] space-y-4">
              {intro.map((paragraph, index) => (
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
          {document.sections.map((section, index) => (
            <section
              key={`${getSectionTitle(section)}-${index}`}
              className="grid gap-5 py-8 md:grid-cols-[72px_minmax(0,1fr)] md:gap-8"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#A78BFA]">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div>
                <h2 className="mb-4 text-[20px] font-black leading-snug tracking-[-0.025em] text-[#0E1B35]">
                  {getSectionTitle(section)}
                </h2>

                {section.body && section.body.length > 0 ? (
                  <div className="space-y-4">
                    {section.body.map((paragraph, paragraphIndex) => (
                      <p
                        key={`${getSectionTitle(section)}-paragraph-${paragraphIndex}`}
                        className="text-[14.5px] leading-8 text-[#475569]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}

                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${getSectionTitle(section)}-bullet-${bulletIndex}`}
                        className="flex gap-3 text-[14.5px] leading-7 text-[#475569]"
                      >
                        <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {document.note ? (
          <div className="mt-8 rounded-[24px] border border-[#DDD6FE] bg-[#F3F0FF] p-5 text-sm font-bold leading-7 text-[#5B21B6]">
            {document.note}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default LegalDocumentView
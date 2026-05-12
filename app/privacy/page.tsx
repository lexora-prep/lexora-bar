import { LegalDocumentView } from "@/components/legal/LegalDocumentView"
import { getLegalDocument } from "@/lib/legal/legal-content"

type PrivacyPageProps = {
  searchParams?: Promise<{
    returnTo?: string
  }>
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams
  const returnHref = params?.returnTo || "/"

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-10 md:px-8 md:py-14">
      <LegalDocumentView
        document={getLegalDocument("privacy")}
        returnHref={returnHref}
        pdfHref="/api/legal-documents/privacy/pdf"
        pdfLabel="Download PDF"
      />
    </main>
  )
}
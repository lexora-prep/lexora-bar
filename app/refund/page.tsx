import { LegalDocumentView } from "@/components/legal/LegalDocumentView"
import { getLegalDocument } from "@/lib/legal/legal-content"

type RefundPageProps = {
  searchParams?: Promise<{
    returnTo?: string
  }>
}

export default async function RefundPage({ searchParams }: RefundPageProps) {
  const params = await searchParams
  const returnHref = params?.returnTo || "/"

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-10 md:px-8 md:py-14">
      <LegalDocumentView
        document={getLegalDocument("refund")}
        returnHref={returnHref}
        pdfHref="/api/legal-documents/refund/pdf"
        pdfLabel="Download PDF"
      />
    </main>
  )
}
import { LegalDocumentView } from "@/components/legal/LegalDocumentView"
import { getLegalDocument } from "@/lib/legal/legal-content"

export default function RefundPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string }
}) {
  const returnHref = searchParams?.returnTo || "/"

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-10 md:px-8 md:py-14">
      <LegalDocumentView document={getLegalDocument("refund")} returnHref={returnHref} />
    </main>
  )
}
import { LegalDocumentView } from "@/components/legal/LegalDocumentView"

type FAQPageProps = {
  searchParams?: Promise<{
    returnTo?: string
  }>
}

const faqDocument = {
  key: "faq",
  eyebrow: "Help Center",
  title: "Frequently Asked Questions",
  updated: "May 4, 2026",
  intro: [
    "This FAQ explains what Lexora Prep is, how it works, what is included in each plan, and what users should understand before using the platform.",
  ],
  sections: [
    {
      title: "What is Lexora Prep?",
      body: [
        "Lexora Prep is a Black Letter Law memorization and rule training platform for bar exam candidates. It helps users read, recall, and practice legal rule statements through structured repetition, flashcards, weak-rule targeting, and study planning.",
      ],
    },
    {
      title: "Is Lexora Prep a full bar prep course?",
      body: [
        "No. Lexora Prep is not a full commercial bar preparation course and should not be used as your only study resource. It is a supplemental study tool focused on Black Letter Law rule memorization and recall training.",
      ],
    },
    {
      title: "Who is Lexora Prep designed for?",
      body: [
        "Lexora Prep is designed for bar exam candidates who want to strengthen their Black Letter Law rule memory, particularly for the MEE essay portion, where recalling precise rule statements is critical.",
      ],
    },
    {
      title: "What is included in the Free plan?",
      body: [
        "The Free plan provides limited demo access so users can preview Lexora Prep before choosing a paid plan. No credit card is required for free demo access.",
      ],
    },
    {
      title: "What is included in the BLL Monthly plan?",
      body: [
        "The BLL Monthly plan includes full Black Letter Law rule access, spaced repetition, flashcards, smart study planning, weak rule targeting, and performance analytics.",
      ],
    },
    {
      title: "What is included in the Premium plan?",
      body: [
        "The Premium plan includes everything in BLL Monthly, plus 120 Golden Rules, 120 Golden Flashcards, advanced rule sets, priority training tools, and priority support.",
      ],
    },
    {
      title: "How does Lexora Prep help with the MEE?",
      body: [
        "MEE essay performance depends heavily on recognizing the issue and stating the correct legal rule precisely. Lexora Prep trains users to recall and recite Black Letter Law rule statements through structured practice.",
      ],
    },
    {
      title: "Does Lexora Prep include MBE practice?",
      body: [
        "Lexora Prep is primarily focused on Black Letter Law memorization and rule recall. Any MBE-style practice features are supplemental and are not intended to replace a full bar preparation course or official licensed materials.",
      ],
    },
    {
      title: "Does Lexora Prep use generative AI?",
      body: [
        "Lexora Prep is not marketed as a generative AI product. The platform is centered on structured legal rule memorization, recall practice, flashcards, weak-area tracking, study planning, and performance analytics.",
      ],
    },
    {
      title: "Does Lexora Prep guarantee bar exam success?",
      body: [
        "No. Lexora Prep does not guarantee that you will pass the bar exam, receive a particular score, improve your score, or be admitted to practice law.",
      ],
    },
    {
      title: "Are the rules accurate?",
      body: [
        "Lexora Prep aims to provide accurate and useful educational summaries of Black Letter Law. Legal rules can vary by jurisdiction and may change over time. Users should verify important rules with official sources, licensed bar preparation materials, or applicable primary law when necessary.",
      ],
    },
    {
      title: "What happens if I find an error?",
      body: [
        "If you believe you found an error, contact support. If the report helps improve the platform, Lexora Prep may, at its discretion, provide a discount, voucher, account credit, or other goodwill adjustment. Such credits are not guaranteed.",
      ],
    },
    {
      title: "Can I share my account?",
      body: [
        "No. Each account is for one individual user only. Password sharing, shared access, resale, copying, scraping, publishing, or redistribution of Lexora Prep materials is not allowed.",
      ],
    },
    {
      title: "How are payments processed?",
      body: [
        "Payments are processed through Paddle. Lexora Prep does not store full credit card numbers on its own servers.",
      ],
    },
    {
      title: "How do refunds work?",
      body: [
        "Refunds are governed by the Refund Policy. A full refund may be available within the stated refund window only if the applicable usage requirements are satisfied.",
      ],
    },
    {
      title: "Can I cancel my subscription?",
      body: [
        "Yes. Users may cancel their subscription to stop future renewal charges. Cancellation does not automatically create a refund unless the refund requirements are satisfied.",
      ],
    },
    {
      title: "How can I contact Lexora Prep?",
      body: ["For support, contact support@lexoraprep.com."],
    },
  ],
  note:
    "Lexora Prep is a supplemental educational tool. It is not a substitute for full bar preparation and does not guarantee exam success.",
}

export default async function FAQPage({ searchParams }: FAQPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const returnHref = resolvedSearchParams?.returnTo || "/"

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-10 md:px-8 md:py-14">
      <LegalDocumentView
        document={faqDocument}
        returnHref={returnHref}
        pdfHref="/api/legal-documents/faq/pdf"
        pdfLabel="Download PDF"
      />
    </main>
  )
}
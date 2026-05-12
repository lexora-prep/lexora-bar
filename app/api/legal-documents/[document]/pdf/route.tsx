import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer"
import {
  getLegalDocument,
  type LegalDocument,
  type LegalDocumentKey,
} from "@/lib/legal/legal-content"

export const runtime = "nodejs"

type PdfSection = {
  title: string
  body?: string[]
  bullets?: string[]
}

type PdfDocument = Omit<LegalDocument, "key" | "sections"> & {
  key: LegalDocumentKey | "faq"
  sections: PdfSection[]
}

const FAQ_DOCUMENT: PdfDocument = {
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
        "If you believe you found an error, contact support. If the report helps us improve the platform, Lexora Prep may, at its discretion, provide a discount, voucher, or account credit. Such credits are not guaranteed.",
      ],
    },
    {
      title: "Can I share my account?",
      body: [
        "No. Each account is for one individual user only. Password sharing, shared access, resale, copying, or redistribution of Lexora Prep materials is not allowed.",
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
      title: "How can I contact Lexora Prep?",
      body: ["For support, contact support@lexoraprep.com."],
    },
  ],
  note:
    "Lexora Prep is a supplemental educational tool. It is not a substitute for full bar preparation and does not guarantee exam success.",
}

function getPdfDocument(key: string): PdfDocument | null {
  if (key === "faq") {
    return FAQ_DOCUMENT
  }

  if (
    key !== "terms" &&
    key !== "privacy" &&
    key !== "refund" &&
    key !== "cookies"
  ) {
    return null
  }

  const document = getLegalDocument(key as LegalDocumentKey)

  return {
    ...document,
    sections: document.sections.map((section) => ({
      title: section.title,
      body: section.body,
      bullets: section.bullets,
    })),
  }
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: "#F7F8FC",
    color: "#0E1B35",
    fontFamily: "Helvetica",
  },
  shell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 34,
    borderWidth: 1,
    borderColor: "#E2E6F0",
  },
  eyebrow: {
    fontSize: 9,
    color: "#7C3AED",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  title: {
    fontSize: 34,
    lineHeight: 1.08,
    color: "#0E1B35",
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  updated: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
  },
  introText: {
    fontSize: 12.5,
    lineHeight: 1.8,
    color: "#334155",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E6F0",
    marginTop: 22,
    marginBottom: 22,
  },
  section: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E6F0",
  },
  sectionNumber: {
    width: 48,
    fontSize: 10,
    color: "#A78BFA",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 1.35,
    color: "#0E1B35",
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 11.5,
    lineHeight: 1.75,
    color: "#334155",
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  bulletDot: {
    width: 4,
    fontSize: 11,
    color: "#7C3AED",
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 1.65,
    color: "#334155",
  },
  note: {
    marginTop: 26,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#F3F0FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  noteText: {
    fontSize: 11.5,
    lineHeight: 1.65,
    color: "#5B21B6",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 18,
    fontSize: 9,
    color: "#94A3B8",
    textAlign: "center",
  },
})

function PdfLegalDocument({ document }: { document: PdfDocument }) {
  return (
    <Document
      title={`Lexora Prep - ${document.title}`}
      author="Lexora Prep LLC"
      subject={document.title}
      creator="Lexora Prep"
      producer="Lexora Prep"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <Text style={styles.eyebrow}>{document.eyebrow}</Text>
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.updated}>Last updated: {document.updated}</Text>

          {document.intro.map((paragraph, index) => (
            <Text key={`intro-${index}`} style={styles.introText}>
              {paragraph}
            </Text>
          ))}

          <View style={styles.divider} />

          {document.sections.map((section, index) => (
            <View key={`${section.title}-${index}`} style={styles.section}>
              <Text style={styles.sectionNumber}>
                {String(index + 1).padStart(2, "0")}
              </Text>

              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.body?.map((paragraph, paragraphIndex) => (
                  <Text
                    key={`${section.title}-p-${paragraphIndex}`}
                    style={styles.paragraph}
                  >
                    {paragraph}
                  </Text>
                ))}

                {section.bullets?.map((bullet, bulletIndex) => (
                  <View
                    key={`${section.title}-b-${bulletIndex}`}
                    style={styles.bulletRow}
                  >
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {document.note ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>{document.note}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Copyright © 2026 Lexora Prep LLC. All Rights Reserved.
        </Text>
      </Page>
    </Document>
  )
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ document: string }> }
) {
  const params = await context.params
  const legalDocument = getPdfDocument(params.document)

  if (!legalDocument) {
    return new Response("Legal document not found.", { status: 404 })
  }

  const pdfBlob = await pdf(
    <PdfLegalDocument document={legalDocument} />
  ).toBlob()

  const arrayBuffer = await pdfBlob.arrayBuffer()
  const fileName = `${safeFileName(legalDocument.title)}-lexora-prep.pdf`

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
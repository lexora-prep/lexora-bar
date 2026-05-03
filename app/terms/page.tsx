import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "Legal Business Name and Operator",
    body: [
      "Lexora Prep is operated by Lexora Prep LLC, a Wyoming limited liability company. These Terms and Conditions govern access to and use of the Lexora Prep website, platform, software, dashboards, study tools, rule banks, analytics features, subscription services, and related services.",
      "By creating an account, accessing Lexora Prep, purchasing a subscription, starting a trial, or using any part of the platform, you agree to these Terms and Conditions."
    ]
  },
  {
    title: "Educational Purpose Only",
    body: [
      "Lexora Prep is an educational technology platform designed to support Black Letter Law memorization, rule recall, and structured study practice. Lexora Prep is not a law firm, legal advisor, law school, licensed bar preparation company, or official bar examination authority.",
      "The platform does not provide legal advice, legal representation, legal opinions, professional licensing advice, or any guarantee of bar examination success."
    ]
  },
  {
    title: "Supplemental Study Tool",
    body: [
      "Lexora Prep is intended as a supplemental study aid. It should not be used as a user's only source of preparation for any bar examination, law school examination, licensing examination, or professional assessment.",
      "Users remain responsible for selecting their study materials, verifying legal rules, and preparing independently for any examination."
    ]
  },
  {
    title: "No Guarantee of Results",
    body: [
      "Lexora Prep does not guarantee that any user will pass any bar exam, receive a particular score, improve a score, be admitted to practice law, or achieve any academic, professional, or licensing outcome.",
      "Performance analytics, recall scores, keyword matching, weak area indicators, and study plans are educational estimates only. They are not official predictions of bar exam performance."
    ]
  },
  {
    title: "Immediate Digital Access",
    body: [
      "Lexora Prep is a digital educational service. After purchase, users may receive immediate access to rule statements, study tools, analytics, training materials, and other digital content.",
      "By purchasing and accessing Lexora Prep, users request immediate access to the digital service. Where permitted by applicable law, accessing or using digital content may affect refund or withdrawal rights."
    ]
  },
  {
    title: "Subscriptions and Payment Processing",
    body: [
      "Paid subscriptions and related transactions are processed by Paddle as Merchant of Record. Paddle may handle checkout, payment processing, tax calculation, invoices, payment confirmation, cancellation workflows, and refund processing.",
      "Users must provide accurate billing and account information during checkout and must keep payment information current where applicable."
    ]
  },
  {
    title: "Refunds",
    body: [
      "Refunds are governed by the Lexora Prep Refund Policy. Lexora Prep offers a 14 day refund window. Users may request a refund within 14 days of the relevant purchase or renewal transaction.",
      "Refund requests are processed by Paddle as Merchant of Record and reviewed in accordance with Paddle's refund policy, applicable law, and the Lexora Prep Refund Policy."
    ]
  },
  {
    title: "Account Activity and Abuse Prevention",
    body: [
      "Lexora Prep may monitor platform usage to protect the service, prevent abuse, maintain account security, and enforce these Terms. This may include records of login activity, rule access, recall attempts, account activity, and subscription activity.",
      "Lexora Prep may provide relevant account activity information where necessary to review suspected misuse, refund abuse, unauthorized copying, scraping, credential sharing, or improper use of the platform."
    ]
  },
  {
    title: "Intellectual Property",
    body: [
      "All Lexora Prep content, design, software, rule organization, platform structure, dashboards, study flows, analytics displays, text, graphics, logos, and related materials are owned by Lexora Prep LLC or licensed to Lexora Prep LLC unless otherwise stated.",
      "Users may not copy, scrape, reproduce, distribute, resell, reverse engineer, or create competing products from Lexora Prep content or platform materials without written permission."
    ]
  },
  {
    title: "Permitted Use",
    body: [
      "Users may use Lexora Prep for personal educational study and lawful academic preparation only.",
      "Users may not use the platform for unlawful activity, unauthorized data extraction, abusive automation, credential sharing, resale, commercial redistribution, or any activity that interferes with platform security or operation."
    ]
  },
  {
    title: "Third Party Names and Examination References",
    body: [
      "References to bar exams, legal subjects, testing concepts, or third party names are used for descriptive educational purposes only.",
      "Lexora Prep LLC is not affiliated with the National Conference of Bar Examiners, NCBE, any state board of bar examiners, or any official bar examination authority."
    ]
  },
  {
    title: "Platform Availability",
    body: [
      "Lexora Prep aims to provide reliable access but does not guarantee uninterrupted, error free, or continuous availability.",
      "Access may be limited or interrupted due to maintenance, updates, hosting issues, security measures, third party service failures, or events outside Lexora Prep's control."
    ]
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Lexora Prep LLC is not liable for indirect, incidental, special, consequential, punitive, academic, professional, licensing, or exam related losses arising from use of the platform.",
      "Nothing in these Terms limits rights that cannot be limited under applicable law."
    ]
  },
  {
    title: "Changes to These Terms",
    body: [
      "Lexora Prep LLC may update these Terms and Conditions from time to time. Updated terms will be posted on this page with a revised effective date.",
      "Continued use of Lexora Prep after updated terms are posted means the user accepts the updated terms."
    ]
  },
  {
    title: "Contact",
    body: [
      "Questions about these Terms and Conditions may be submitted through the Lexora Prep contact page or by contacting Lexora Prep LLC through the contact information made available on the website."
    ]
  }
]

export default function TermsPage() {
  return (
    <LegalPageTemplate
      eyebrow="Legal"
      title="Terms and Conditions"
      description="Last updated: May 3, 2026. These Terms and Conditions apply to Lexora Prep, operated by Lexora Prep LLC."
      sections={sections}
    />
  )
}

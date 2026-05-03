import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "Overview",
    body: [
      "This Privacy Policy explains how Lexora Prep LLC collects, uses, stores, and protects information when users access Lexora Prep.",
      "Lexora Prep is an educational technology platform for Black Letter Law rule memorization, recall practice, analytics, and related study tools."
    ]
  },
  {
    title: "Information We Collect",
    body: [
      "Lexora Prep may collect account information, email address, authentication data, subscription status, study activity, rule recall attempts, analytics data, settings, and technical information related to use of the platform.",
      "Payment information is processed by Paddle. Lexora Prep does not store complete card numbers."
    ]
  },
  {
    title: "How We Use Information",
    body: [
      "Information is used to provide the platform, manage accounts, operate study tools, show analytics, improve product performance, process subscriptions, prevent abuse, provide support, and comply with legal obligations.",
      "Study activity may be used to generate progress indicators, weak area reports, recall scores, and personalized study recommendations."
    ]
  },
  {
    title: "Payment Processing",
    body: [
      "Payments are processed by Paddle as Merchant of Record. Paddle may collect and process payment, billing, tax, fraud prevention, and transaction information under its own legal terms and privacy notices."
    ]
  },
  {
    title: "Cookies and Analytics",
    body: [
      "Lexora Prep may use cookies and similar technologies to operate the website, maintain sessions, remember preferences, improve performance, and understand usage patterns.",
      "More information is available in the Cookie Policy."
    ]
  },
  {
    title: "Data Sharing",
    body: [
      "Lexora Prep may share information with service providers that support hosting, authentication, database storage, analytics, payment processing, support, security, and compliance.",
      "Lexora Prep does not sell user personal information to advertisers."
    ]
  },
  {
    title: "Data Security",
    body: [
      "Lexora Prep uses reasonable technical and organizational measures to protect user information. No online service can guarantee absolute security.",
      "Users are responsible for keeping account credentials secure."
    ]
  },
  {
    title: "User Rights",
    body: [
      "Depending on location, users may have rights to access, correct, delete, export, or restrict certain personal information.",
      "Requests may be submitted through the Lexora Prep contact page."
    ]
  },
  {
    title: "Contact",
    body: [
      "Questions about this Privacy Policy may be submitted through the Lexora Prep contact page."
    ]
  }
]

export default function PrivacyPage() {
  return (
    <LegalPageTemplate
      eyebrow="Privacy"
      title="Privacy Policy"
      description="Last updated: May 3, 2026. This Privacy Policy explains how Lexora Prep LLC handles personal information."
      sections={sections}
    />
  )
}

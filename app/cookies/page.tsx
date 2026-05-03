import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "Overview",
    body: [
      "This Cookie Policy explains how Lexora Prep uses cookies and similar technologies on the website and platform.",
      "Cookies help the website function, support login sessions, remember preferences, improve performance, and understand how users interact with Lexora Prep."
    ]
  },
  {
    title: "Types of Cookies",
    body: [
      "Lexora Prep may use essential cookies, preference cookies, analytics cookies, and security related cookies."
    ],
    items: [
      "Essential cookies support core website and account functionality.",
      "Preference cookies remember user choices and settings.",
      "Analytics cookies help understand usage and improve the platform.",
      "Security cookies help protect accounts and detect abuse."
    ]
  },
  {
    title: "Third Party Services",
    body: [
      "Third party services used for hosting, authentication, analytics, payment processing, or support may set or read cookies as part of their services.",
      "Payments are processed by Paddle as Merchant of Record, and Paddle may use cookies or similar technologies during checkout."
    ]
  },
  {
    title: "Managing Cookies",
    body: [
      "Users can manage cookies through browser settings. Blocking some cookies may affect website functionality, login, checkout, or platform performance."
    ]
  },
  {
    title: "Contact",
    body: [
      "Questions about this Cookie Policy may be submitted through the Lexora Prep contact page."
    ]
  }
]

export default function CookiesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Cookies"
      title="Cookie Policy"
      description="Last updated: May 3, 2026. This Cookie Policy explains how Lexora Prep uses cookies and similar technologies."
      sections={sections}
    />
  )
}

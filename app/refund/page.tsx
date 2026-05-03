import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "Refund Window",
    body: [
      "Lexora Prep offers a 14 day refund window. Users may request a refund within 14 days of the relevant purchase or renewal transaction.",
      "The 14 day refund window is calculated from the date of the transaction."
    ]
  },
  {
    title: "Digital Educational Content",
    body: [
      "Lexora Prep is a digital educational service. After purchase, users receive access to rule statements, study tools, analytics, and other digital content.",
      "By purchasing and accessing Lexora Prep, users request immediate access to the digital service. Where permitted by applicable law, accessing or using digital content may affect refund or withdrawal rights."
    ]
  },
  {
    title: "Refund Review",
    body: [
      "Refund requests are processed by Paddle as Merchant of Record and reviewed in accordance with Paddle's refund policy, applicable law, and this Refund Policy.",
      "Lexora Prep may provide relevant account activity information where necessary to review suspected misuse, refund abuse, unauthorized copying, scraping, credential sharing, or improper use of the platform."
    ]
  },
  {
    title: "How to Request a Refund",
    body: [
      "Refund requests may be submitted through Paddle's buyer support process or through the Lexora Prep contact page so the request can be routed appropriately.",
      "A refund request should include the email address used for purchase, the transaction date, and the subscription or order reference if available."
    ]
  },
  {
    title: "Subscription Cancellation",
    body: [
      "Users may cancel a subscription to stop future renewals. Cancellation stops future billing but does not automatically refund past charges unless a refund request is made within the 14 day refund window and approved through the applicable refund process.",
      "After cancellation, access may continue until the end of the paid billing period unless otherwise handled through Paddle or required by applicable law."
    ]
  },
  {
    title: "Refund Processing",
    body: [
      "Approved refunds are processed back to the original payment method through Paddle. Processing times may vary depending on the payment method, card issuer, bank, and country.",
      "Lexora Prep does not control bank processing times after a refund has been issued through Paddle."
    ]
  },
  {
    title: "Consumer Rights",
    body: [
      "Nothing in this Refund Policy limits any mandatory consumer rights that apply under the laws of a user's country or region.",
      "Where applicable law provides rights that cannot be waived or limited, those rights remain available to the user."
    ]
  },
  {
    title: "Contact",
    body: [
      "Questions about refunds may be submitted through the Lexora Prep contact page."
    ]
  }
]

export default function RefundPage() {
  return (
    <LegalPageTemplate
      eyebrow="Billing"
      title="Refund Policy"
      description="Last updated: May 3, 2026. This Refund Policy explains the 14 day refund window for Lexora Prep purchases and renewals."
      sections={sections}
    />
  )
}

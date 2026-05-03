import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "Refund Window",
    body: [
      "Lexora Prep offers a 14 day refund window. A user may request a refund within 14 days of the relevant purchase or renewal transaction.",
      "The 14 day refund window is calculated from the date of the transaction."
    ]
  },
  {
    title: "How to Request a Refund",
    body: [
      "Payments for Lexora Prep are processed by Paddle as Merchant of Record. Refund requests may be submitted through Paddle's buyer support process or through the Lexora Prep contact page so the request can be routed appropriately.",
      "A refund request should include the email address used for purchase, the transaction date, and the subscription or order reference if available."
    ]
  },
  {
    title: "Subscription Cancellation",
    body: [
      "A user may cancel a subscription to stop future renewals. Cancellation stops future billing but does not automatically create a refund for past charges unless a refund request is made within the 14 day refund window.",
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

import LegalPageTemplate from "../components/LegalPageTemplate"

const sections = [
  {
    title: "What is Lexora Prep?",
    body: [
      "Lexora Prep is a Black Letter Law rule training platform for bar exam candidates. It helps users practice rule recall, memorize legal rules, identify weak areas, and track study progress."
    ]
  },
  {
    title: "Is Lexora Prep a full bar preparation course?",
    body: [
      "No. Lexora Prep is a supplemental educational tool focused on Black Letter Law memorization and rule recall. It is not a full bar preparation course, law school, law firm, or official bar examination authority."
    ]
  },
  {
    title: "Does Lexora Prep guarantee bar exam success?",
    body: [
      "No. Lexora Prep does not guarantee passing results, score improvement, admission to practice, or any academic, professional, or licensing outcome."
    ]
  },
  {
    title: "How are payments processed?",
    body: [
      "Payments are processed by Paddle as Merchant of Record. Paddle may handle checkout, taxes, invoices, payment confirmation, subscription billing, cancellations, and refunds."
    ]
  },
  {
    title: "What is the refund window?",
    body: [
      "Lexora Prep offers a 14 day refund window. A user may request a refund within 14 days of the relevant purchase or renewal transaction."
    ]
  },
  {
    title: "How can users contact Lexora Prep?",
    body: [
      "Users can contact Lexora Prep through the contact page available on the website."
    ]
  }
]

export default function FAQPage() {
  return (
    <LegalPageTemplate
      eyebrow="Help"
      title="Frequently Asked Questions"
      description="Common questions about Lexora Prep, subscriptions, refunds, and platform use."
      sections={sections}
    />
  )
}

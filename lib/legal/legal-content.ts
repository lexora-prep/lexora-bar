export type LegalDocumentKey = "terms" | "privacy" | "refund" | "cookies"

export type LegalDocumentSection = {
  number?: string
  title: string
  body?: string[]
  bullets?: string[]
}

export type LegalDocument = {
  key: LegalDocumentKey
  eyebrow: string
  title: string
  updated: string
  intro: string[]
  sections: LegalDocumentSection[]
  note?: string
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: "terms",
    eyebrow: "Legal",
    title: "Terms and Conditions",
    updated: "May 4, 2026",
    intro: [
      "These Terms and Conditions govern your access to and use of Lexora Prep, including the website, platform, software, study tools, rules, flashcards, analytics, and related services.",
      "By creating an account, purchasing a subscription, or using Lexora Prep, you agree to these Terms.",
    ],
    sections: [
      {
        number: "1",
        title: "Educational Purpose Only",
        body: [
          "Lexora Prep is an educational technology platform designed to support Black Letter Law memorization and rule training.",
          "Lexora Prep is not a law firm, legal advisor, law school, licensed bar preparation company, or official bar examination authority.",
        ],
      },
      {
        number: "2",
        title: "Supplemental Study Tool",
        body: [
          "Lexora Prep is intended only as a supplemental study aid. It should not be used as your only source of preparation for any bar examination.",
          "Users are responsible for completing their own full bar preparation with appropriate materials, instruction, practice, and review.",
        ],
      },
      {
        number: "3",
        title: "No Guarantee of Results",
        body: [
          "Lexora Prep does not guarantee that you will pass any bar exam, receive a particular score, improve your score, be admitted to practice law, or achieve any academic, professional, or licensing outcome.",
          "Your results depend on many factors, including your study habits, prior knowledge, writing ability, exam conditions, and the rules of the relevant jurisdiction.",
        ],
      },
      {
        number: "4",
        title: "User Responsibility",
        body: [
          "You are solely responsible for your own preparation, study decisions, use of the platform, and reliance on any educational content.",
          "You should verify important legal rules with official sources, licensed bar preparation materials, applicable primary law, or other reliable resources when necessary.",
        ],
      },
      {
        number: "5",
        title: "Account Use and Security",
        body: [
          "You must provide accurate account information and keep your login credentials secure.",
          "Each account is for one individual user only. You may not share your password, sell access, or allow another person to use your account.",
        ],
      },
      {
        number: "6",
        title: "Prohibited Conduct",
        bullets: [
          "Copying, scraping, downloading, reproducing, publishing, selling, or redistributing Lexora Prep content without permission.",
          "Sharing your account, password, paid access, screenshots, rule banks, flashcards, or premium materials with others.",
          "Using bots, crawlers, automation tools, or unauthorized scripts to access the platform.",
          "Attempting to bypass payment, access controls, subscription limits, or security features.",
          "Using the platform for unlawful, abusive, fraudulent, deceptive, or harmful purposes.",
        ],
      },
      {
        number: "7",
        title: "Intellectual Property",
        body: [
          "All Lexora Prep materials are owned by Lexora Prep or its licensors and are protected by applicable intellectual property laws.",
          "You receive a limited, revocable, non-transferable license to use the platform for personal study only.",
        ],
      },
      {
        number: "8",
        title: "Subscriptions and Payments",
        body: [
          "Paid subscriptions are billed according to the plan selected at checkout.",
          "Payments may be processed through a third-party payment processor. Lexora Prep does not store full credit card numbers on its own servers.",
        ],
      },
      {
        number: "9",
        title: "Cancellation",
        body: [
          "You may cancel your subscription according to the cancellation tools or instructions available through the payment processor or platform.",
          "Cancellation stops future renewal charges but does not automatically create a refund unless the refund requirements in the Refund Policy are satisfied.",
        ],
      },
      {
        number: "10",
        title: "Refunds",
        body: [
          "Refunds are governed by the Refund Policy.",
          "A refund may be available only when the conditions stated in the Refund Policy are satisfied.",
        ],
      },
      {
        number: "11",
        title: "Content Accuracy",
        body: [
          "Lexora Prep aims to provide accurate and useful educational summaries of Black Letter Law.",
          "Legal rules may vary by jurisdiction, change over time, or require more detailed analysis than a memorization tool can provide. We do not warrant that all content is complete, current, or error free.",
        ],
      },
      {
        number: "12",
        title: "Platform Features",
        body: [
          "Lexora Prep may update, improve, modify, limit, suspend, or remove platform features over time to maintain service quality, security, performance, legal compliance, and product stability.",
        ],
      },
      {
        number: "13",
        title: "Suspension or Termination",
        body: [
          "We may suspend or terminate your account if you violate these Terms, misuse the platform, interfere with security, attempt to bypass restrictions, or engage in conduct that may harm Lexora Prep, users, or third parties.",
        ],
      },
      {
        number: "14",
        title: "Disclaimers",
        body: [
          "Lexora Prep is provided on an as is and as available basis.",
          "To the fullest extent permitted by law, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, availability, and non-infringement.",
        ],
      },
      {
        number: "15",
        title: "Limitation of Liability",
        body: [
          "To the fullest extent permitted by law, Lexora Prep and its affiliates will not be liable for indirect, incidental, consequential, special, punitive, or exemplary damages.",
          "Our total liability will not exceed the amount you paid to Lexora Prep during the one month period before the claim arose.",
        ],
      },
      {
        number: "16",
        title: "Contact",
        body: ["For questions about these Terms, contact support@lexoraprep.com."],
      },
    ],
    note: "Lexora Prep is a supplemental rule training tool. It is not a substitute for full bar preparation and does not guarantee exam success.",
  },

  privacy: {
    key: "privacy",
    eyebrow: "Legal",
    title: "Privacy Policy",
    updated: "May 4, 2026",
    intro: [
      "This Privacy Policy explains how Lexora Prep collects, uses, stores, and protects information when you use our website, platform, and related services.",
      "By using Lexora Prep, you acknowledge the practices described in this Privacy Policy.",
    ],
    sections: [
      {
        number: "1",
        title: "Information We Collect",
        body: [
          "We may collect information you provide directly, including your name, email address, account credentials, subscription status, support messages, feedback, and other information you choose to submit.",
        ],
      },
      {
        number: "2",
        title: "Study and Platform Data",
        body: [
          "We may collect study-related data, including subjects reviewed, rules accessed, flashcard progress, completion status, weak areas, study plan settings, selected plan, registration mode, and platform usage data.",
        ],
      },
      {
        number: "3",
        title: "Legal Acceptance Records",
        body: [
          "When you register or agree to platform policies, we may record your legal acceptance history, including the policy versions accepted, acceptance timestamp, selected plan, registration mode, browser or device user agent, and IP address where available.",
          "These records help us maintain proof of consent, comply with legal obligations, prevent abuse, and manage disputes.",
        ],
      },
      {
        number: "4",
        title: "Payment Information",
        body: [
          "Payments may be processed through a third-party payment processor. Lexora Prep does not store full credit card numbers or full payment card information on its own servers.",
          "Payment processors may collect and process payment, tax, billing, fraud prevention, and subscription information according to their own policies.",
        ],
      },
      {
        number: "5",
        title: "How We Use Information",
        bullets: [
          "To create and manage user accounts.",
          "To provide platform features, rule training, flashcards, analytics, and study planning.",
          "To process billing and subscription status through third-party payment processors.",
          "To respond to support requests and user communications.",
          "To improve security, performance, reliability, and product quality.",
          "To prevent fraud, misuse, scraping, unauthorized access, or policy violations.",
          "To comply with legal obligations and maintain legal acceptance records.",
        ],
      },
      {
        number: "6",
        title: "We Do Not Sell Personal Data",
        body: [
          "Lexora Prep does not sell your personal data or provide it to third parties for their independent advertising purposes.",
        ],
      },
      {
        number: "7",
        title: "Cookies and Similar Technologies",
        body: [
          "We may use cookies and similar technologies to keep users logged in, remember preferences, support security, prevent abuse, process checkout, and analyze usage.",
          "More information is available in the Cookie Policy.",
        ],
      },
      {
        number: "8",
        title: "Data Security",
        body: [
          "We use reasonable technical and organizational safeguards to protect user information.",
          "No internet-based service can guarantee complete security, and users are responsible for keeping their login credentials confidential.",
        ],
      },
      {
        number: "9",
        title: "Data Retention",
        body: [
          "We retain information for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and support legitimate business needs.",
          "Legal acceptance records may be retained for compliance, evidence, and dispute-prevention purposes.",
        ],
      },
      {
        number: "10",
        title: "User Choices",
        body: [
          "You may request access, correction, deletion, or account closure by contacting support.",
          "Some information may need to be retained where required for legal, security, billing, dispute-resolution, or legitimate business purposes.",
        ],
      },
      {
        number: "11",
        title: "Contact",
        body: ["For privacy questions, contact support@lexoraprep.com."],
      },
    ],
    note: "Lexora Prep does not store full card details. Payment processing is handled by third-party payment processors.",
  },

  refund: {
    key: "refund",
    eyebrow: "Legal",
    title: "Refund Policy",
    updated: "May 4, 2026",
    intro: [
      "This Refund Policy explains when users may request a refund for Lexora Prep paid subscriptions or premium access.",
      "By purchasing a paid plan, you agree to this Refund Policy.",
    ],
    sections: [
      {
        number: "1",
        title: "Fourteen-Day Refund Window",
        body: [
          "You may request a refund within 14 calendar days of your initial purchase if you satisfy the eligibility requirements below.",
        ],
      },
      {
        number: "2",
        title: "Usage Requirement",
        body: [
          "To qualify for a refund, your account must not have substantially accessed, used, copied, or benefited from paid materials beyond a limited review of the platform.",
          "Lexora Prep may deny a refund request if paid materials were meaningfully accessed, used, downloaded, copied, scraped, shared, or otherwise consumed.",
        ],
      },
      {
        number: "3",
        title: "Non-Refundable Situations",
        bullets: [
          "The refund request is submitted after the applicable refund window.",
          "Paid materials were substantially accessed or used.",
          "The account violated the Terms and Conditions.",
          "The user forgot to cancel before renewal.",
          "The user shared, copied, scraped, resold, or misused platform content.",
          "The refund request is abusive, fraudulent, repetitive, or inconsistent with fair use of the platform.",
        ],
      },
      {
        number: "4",
        title: "Subscription Cancellation",
        body: [
          "You may cancel your subscription to stop future billing.",
          "Cancellation does not automatically create a refund unless the refund request satisfies this Refund Policy.",
        ],
      },
      {
        number: "5",
        title: "Payment Processor",
        body: [
          "Refunds may be processed through the applicable third-party payment processor.",
          "Processing times may depend on the payment processor, bank, card issuer, or payment method.",
        ],
      },
      {
        number: "6",
        title: "How to Request a Refund",
        body: [
          "Contact support@lexoraprep.com within the applicable refund window.",
          "Include the email used for purchase, purchase date, selected plan, and reason for the request.",
        ],
      },
      {
        number: "7",
        title: "Discretionary Credits",
        body: [
          "If you report a platform issue or content error that helps improve Lexora Prep, we may, at our discretion, offer a discount, voucher, extension, or account credit.",
          "Such credits are not guaranteed and do not create an entitlement to future credits.",
        ],
      },
    ],
    note: "Refunds are not automatic. Eligibility depends on timing, account activity, usage, and compliance with Lexora Prep policies.",
  },

  cookies: {
    key: "cookies",
    eyebrow: "Legal",
    title: "Cookie Policy",
    updated: "May 4, 2026",
    intro: [
      "This Cookie Policy explains how Lexora Prep uses cookies and similar technologies on our website and platform.",
      "Cookies help the platform operate securely, remember preferences, support login, and improve the user experience.",
    ],
    sections: [
      {
        number: "1",
        title: "What Are Cookies?",
        body: [
          "Cookies are small text files placed on your device when you visit a website.",
          "Similar technologies may include local storage, pixels, tags, scripts, and device identifiers.",
        ],
      },
      {
        number: "2",
        title: "Strictly Necessary Cookies",
        body: [
          "Strictly necessary cookies are required for login, account security, session management, checkout, fraud prevention, and basic platform functionality.",
          "These cookies cannot be turned off because the platform cannot operate properly without them.",
        ],
      },
      {
        number: "3",
        title: "Preference Cookies",
        body: [
          "Preference cookies remember display settings, saved preferences, cookie choices, and similar user-selected options.",
        ],
      },
      {
        number: "4",
        title: "Analytics Cookies",
        body: [
          "Analytics cookies help us understand how visitors use Lexora Prep, which pages are visited, which features are used, and where performance or usability can be improved.",
        ],
      },
      {
        number: "5",
        title: "Marketing Cookies",
        body: [
          "Marketing cookies may help measure advertising performance, referral activity, or campaign effectiveness.",
          "Where legally required, marketing cookies are not enabled without consent.",
        ],
      },
      {
        number: "6",
        title: "Payment Processor Cookies",
        body: [
          "Third-party payment processors may use their own cookies for checkout, tax calculation, fraud prevention, payment processing, invoices, and subscription management.",
          "Lexora Prep does not control all cookies set by third-party payment processors during checkout.",
        ],
      },
      {
        number: "7",
        title: "Consent and Preferences",
        body: [
          "You can accept all cookies, reject non-essential cookies, or manage your preferences where cookie controls are available.",
          "You may also control cookies through your browser settings.",
        ],
      },
      {
        number: "8",
        title: "Contact",
        body: ["For cookie-related questions, contact support@lexoraprep.com."],
      },
    ],
    note: "You can update cookie choices through Cookie Preferences where available, or through your browser settings.",
  },
}

export function getLegalDocument(key: LegalDocumentKey): LegalDocument {
  return LEGAL_DOCUMENTS[key]
}
const data = [

  // ---------------- CONSTITUTIONAL LAW ----------------
  {
    subject: "Constitutional Law",
    topic: "Commerce Clause",
    questionText: "Congress enacted a federal law requiring all internet platforms operating in the United States to store user data on servers located within the United States. Which is the strongest constitutional basis supporting the law?",
    A: "The Taxing Power",
    B: "The Commerce Clause",
    C: "The Spending Power",
    D: "The Necessary and Proper Clause alone",
    correct: "B",
    explanation: "Congress may regulate activities that substantially affect interstate commerce."
  },

  {
    subject: "Constitutional Law",
    topic: "First Amendment",
    questionText: "A city enacted an ordinance prohibiting political demonstrations within 500 feet of a courthouse entrance. How should the court rule?",
    A: "The ordinance is unconstitutional because it restricts political speech",
    B: "The ordinance is constitutional because the government may regulate speech near courts",
    C: "The ordinance is unconstitutional because it is content-based",
    D: "The ordinance is constitutional if it is a reasonable time, place, and manner restriction",
    correct: "D",
    explanation: "Content-neutral restrictions may be valid time, place, and manner regulations."
  },


  // ---------------- CONTRACTS ----------------
  {
    subject: "Contracts",
    topic: "Offer and Revocation",
    questionText: "A homeowner offered to sell her house and promised the offer would remain open for 10 days but the buyer gave no consideration. The seller revoked after five days. Is the revocation effective?",
    A: "Yes because the offer was not supported by consideration",
    B: "Yes because real estate contracts must always be revocable",
    C: "No because the offer promised to remain open",
    D: "No because the buyer relied on the offer",
    correct: "A",
    explanation: "An offer is revocable unless consideration creates an option contract."
  },

  {
    subject: "Contracts",
    topic: "UCC Modification",
    questionText: "A seller agreed to deliver chairs for $20 each but later demanded $25 due to increased costs. The buyer agreed. Is the modification enforceable?",
    A: "Yes because both parties agreed",
    B: "Yes because UCC modifications do not require consideration if made in good faith",
    C: "No because modifications always require consideration",
    D: "No because price changes are prohibited",
    correct: "B",
    explanation: "Under UCC 2-209 modifications require good faith but not consideration."
  },


  // ---------------- CIVIL PROCEDURE ----------------
  {
    subject: "Civil Procedure",
    topic: "Diversity Jurisdiction",
    questionText: "A plaintiff from State A sued a corporation from State C/D in federal court seeking $100,000. The defendant claims damages cannot exceed $60,000. How should the court rule?",
    A: "Grant the motion if the defendant shows damages are less than $75,000",
    B: "Grant the motion if the court believes damages are less than $75,000",
    C: "Deny the motion unless it appears to a legal certainty the claim is less than $75,000",
    D: "Deny because diversity always exists when parties are from different states",
    correct: "C",
    explanation: "Amount in controversy is satisfied unless it appears to a legal certainty the claim is below $75,000."
  },

  {
    subject: "Civil Procedure",
    topic: "Personal Jurisdiction",
    questionText: "A defendant negotiated a contract by email and repeatedly shipped goods into the forum state. Is personal jurisdiction proper?",
    A: "Yes because the defendant purposefully established contacts with the forum",
    B: "Yes because contracts automatically create jurisdiction",
    C: "No because the defendant never entered the state",
    D: "No because federal courts automatically lack jurisdiction",
    correct: "A",
    explanation: "Purposeful availment creates minimum contacts."
  },

  {
    subject: "Civil Procedure",
    topic: "Amended Pleadings",
    questionText: "After an answer is filed the plaintiff moves to amend the complaint to add a related claim. What standard applies?",
    A: "Amendments are never allowed after an answer",
    B: "Amendments should be freely granted when justice so requires",
    C: "Amendments require the opposing party’s consent only",
    D: "Amendments require proof the plaintiff will win",
    correct: "B",
    explanation: "FRCP 15 allows amendments freely when justice requires."
  },

  {
    subject: "Civil Procedure",
    topic: "Appeals",
    questionText: "After final judgment the losing party wants to challenge the decision. What is the proper procedure?",
    A: "File a motion for summary judgment",
    B: "File a motion to dismiss",
    C: "File an appeal to the court of appeals",
    D: "File a new lawsuit",
    correct: "C",
    explanation: "Final federal judgments are reviewed by the circuit courts of appeals."
  },

  {
    subject: "Civil Procedure",
    topic: "Discovery",
    questionText: "A party refuses to produce requested discovery documents without explanation. What may the opposing party do?",
    A: "Immediately obtain default judgment",
    B: "Move to compel discovery",
    C: "File a new lawsuit",
    D: "Appeal to the Supreme Court",
    correct: "B",
    explanation: "The proper remedy is a motion to compel discovery."
  },

  {
    subject: "Civil Procedure",
    topic: "Venue Transfer",
    questionText: "The defendant argues the case should be heard in another federal district where most witnesses are located. What is the proper procedure?",
    A: "Removal",
    B: "Transfer of venue",
    C: "Dismissal for lack of jurisdiction",
    D: "Summary judgment",
    correct: "B",
    explanation: "28 USC 1404 allows transfer for convenience."
  },

  {
    subject: "Civil Procedure",
    topic: "Default Judgment",
    questionText: "A defendant fails to respond to a complaint. What must occur before default judgment?",
    A: "Entry of default by the clerk",
    B: "A jury trial",
    C: "Summary judgment",
    D: "An appeal",
    correct: "A",
    explanation: "Entry of default precedes default judgment."
  },

  {
    subject: "Civil Procedure",
    topic: "Claim Preclusion",
    questionText: "After losing a case the plaintiff sues again based on the same accident but a different legal theory. What doctrine bars the claim?",
    A: "Collateral estoppel",
    B: "Claim preclusion",
    C: "Personal jurisdiction",
    D: "Supplemental jurisdiction",
    correct: "B",
    explanation: "Claim preclusion bars claims arising from the same transaction."
  },

  {
    subject: "Civil Procedure",
    topic: "Jury Trial",
    questionText: "A defendant argues a civil damages case should be decided by a judge. What should the court do?",
    A: "Grant because judges decide damages",
    B: "Grant because juries decide only criminal cases",
    C: "Deny because the Seventh Amendment preserves jury trial in civil damages cases",
    D: "Deny only if both parties agree",
    correct: "C",
    explanation: "The Seventh Amendment preserves jury trials in civil cases involving legal remedies."
  },

  {
    subject: "Civil Procedure",
    topic: "Service of Process",
    questionText: "A plaintiff mailed the complaint without requesting a waiver of service. Is service valid?",
    A: "Yes because mail service is always valid",
    B: "Yes because the defendant received notice",
    C: "No because mail without waiver is insufficient",
    D: "No because service must always be personal",
    correct: "C",
    explanation: "FRCP 4 requires waiver procedure or formal service."
  }

];
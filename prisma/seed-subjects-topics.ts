import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "node:path"

const dbPath = path.join(process.cwd(), "prisma", "dev.db")

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const subjects = [
    {
      name: "Contracts",
      topics: [
        "Formation",
        "Consideration",
        "Promissory Estoppel",
        "Statute of Frauds",
        "Parol Evidence Rule",
        "Interpretation",
        "Conditions",
        "Breach",
        "Remedies",
        "Third-Party Beneficiaries",
        "Assignment and Delegation"
      ]
    },

    {
      name: "Torts",
      topics: [
        "Intentional Torts",
        "Defenses to Intentional Torts",
        "Negligence",
        "Strict Liability",
        "Products Liability",
        "Defamation",
        "Privacy Torts",
        "Economic Torts"
      ]
    },

    {
      name: "Evidence",
      topics: [
        "Relevance",
        "Character Evidence",
        "Impeachment",
        "Hearsay",
        "Hearsay Exceptions",
        "Privileges",
        "Expert Testimony",
        "Authentication",
        "Best Evidence Rule",
        "Judicial Notice"
      ]
    },

    {
      name: "Civil Procedure",
      topics: [
        "Personal Jurisdiction",
        "Subject Matter Jurisdiction",
        "Venue",
        "Erie Doctrine",
        "Pleadings",
        "Joinder",
        "Discovery",
        "Summary Judgment",
        "Trial",
        "Appeal",
        "Claim Preclusion",
        "Issue Preclusion"
      ]
    },

    {
      name: "Criminal Law",
      topics: [
        "Elements of Crimes",
        "Inchoate Crimes",
        "Accomplice Liability",
        "Defenses",
        "Homicide",
        "Theft Crimes"
      ]
    },

    {
      name: "Property",
      topics: [
        "Present Estates",
        "Future Interests",
        "Concurrent Ownership",
        "Landlord Tenant",
        "Real Estate Contracts",
        "Mortgages",
        "Easements",
        "Covenants",
        "Zoning",
        "Recording Acts"
      ]
    },

    {
      name: "Constitutional Law",
      topics: [
        "Judicial Review",
        "Federalism",
        "Dormant Commerce Clause",
        "State Action",
        "Equal Protection",
        "Due Process",
        "First Amendment",
        "Takings",
        "Privileges and Immunities"
      ]
    }
  ]

  for (const subjectData of subjects) {
    let subject = await prisma.subjects.findFirst({
      where: { name: subjectData.name }
    })

    if (!subject) {
      subject = await prisma.subjects.create({
        data: { name: subjectData.name }
      })
    }

    for (const topicName of subjectData.topics) {
      const existingTopic = await prisma.topics.findFirst({
        where: {
          name: topicName,
          subject_id: subject.id
        }
      })

      if (!existingTopic) {
        await prisma.topics.create({
          data: {
            name: topicName,
            subject_id: subject.id
          }
        })
      }
    }
  }

  console.log("Subjects and topics seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
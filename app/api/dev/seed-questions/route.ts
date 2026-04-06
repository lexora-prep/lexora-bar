import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const SUBJECTS = [
  "Contracts",
  "Torts",
  "Real Property",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Constitutional Law",
]

const TOPICS_BY_SUBJECT: Record<string, string[]> = {
  Contracts: [
    "Offer and Acceptance",
    "Consideration",
    "Defenses",
    "Remedies",
    "UCC Article 2",
  ],
  Torts: [
    "Negligence",
    "Intentional Torts",
    "Strict Liability",
    "Products Liability",
    "Defamation",
  ],
  "Real Property": [
    "Estates and Future Interests",
    "Landlord Tenant",
    "Sales and Mortgages",
    "Recording Acts",
    "Easements and Covenants",
  ],
  Evidence: [
    "Relevance",
    "Hearsay",
    "Hearsay Exceptions",
    "Impeachment",
    "Privileges",
  ],
  "Civil Procedure": [
    "Personal Jurisdiction",
    "Subject Matter Jurisdiction",
    "Venue",
    "Discovery",
    "Preclusion",
  ],
  "Criminal Law and Procedure": [
    "Homicide",
    "Theft Crimes",
    "Inchoate Crimes",
    "4th Amendment",
    "5th and 6th Amendment",
  ],
  "Constitutional Law": [
    "Judicial Review",
    "Federalism",
    "Separation of Powers",
    "Equal Protection",
    "First Amendment",
  ],
}

function makeQuestionText(subject: string, topic: string, n: number) {
  return `${subject} ${topic} practice question ${n}. Which of the following is the best answer?`
}

function makeExplanation(subject: string, topic: string) {
  return `This is a seeded ${subject} / ${topic} explanation for development testing.`
}

export async function GET() {
  try {
    let createdSubjects = 0
    let createdTopics = 0
    let createdQuestions = 0

    for (const [subjectIndex, subjectName] of SUBJECTS.entries()) {
      let subject = await prisma.subjects.findFirst({
        where: { name: subjectName },
      })

      if (!subject) {
        subject = await prisma.subjects.create({
          data: {
            name: subjectName,
            order_index: subjectIndex + 1,
          },
        })
        createdSubjects++
      }

      const topics = TOPICS_BY_SUBJECT[subjectName] ?? []

      for (const [topicIndex, topicName] of topics.entries()) {
        let topic = await prisma.topics.findFirst({
          where: {
            subject_id: subject.id,
            name: topicName,
          },
        })

        if (!topic) {
          topic = await prisma.topics.create({
            data: {
              subject_id: subject.id,
              name: topicName,
              order_index: topicIndex + 1,
            },
          })
          createdTopics++
        }

        const existingCount = await prisma.mBEQuestion.count({
          where: {
            subject_id: subject.id,
            topic_id: topic.id,
          },
        })

        if (existingCount === 0) {
          for (let i = 1; i <= 5; i++) {
            await prisma.mBEQuestion.create({
              data: {
                title: `${subjectName} ${topicName} Q${i}`,
                subject_id: subject.id,
                topic_id: topic.id,
                question_text: makeQuestionText(subjectName, topicName, i),
                answer_a: "Answer choice A",
                answer_b: "Answer choice B",
                answer_c: "Answer choice C",
                answer_d: "Answer choice D",
                correct_answer: "A",
                explanation: makeExplanation(subjectName, topicName),
                rule_text: `${subjectName} ${topicName} black letter law seed text.`,
              },
            })

            createdQuestions++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      createdSubjects,
      createdTopics,
      createdQuestions,
    })
  } catch (error) {
    console.error("SEED QUESTIONS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed questions",
      },
      { status: 500 }
    )
  }
}
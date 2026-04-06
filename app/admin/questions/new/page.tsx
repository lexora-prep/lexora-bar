"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const MBE_SUBJECTS = [
  "Civil Procedure",
  "Constitutional Law",
  "Contracts",
  "Criminal Law and Procedure",
  "Evidence",
  "Real Property",
  "Torts",
]

const SUBJECT_TOPIC_MAP: Record<string, string[]> = {
  "Civil Procedure": [
    "Personal Jurisdiction",
    "Subject Matter Jurisdiction",
    "Venue",
    "Erie Doctrine",
    "Pleadings",
    "Joinder",
    "Discovery",
    "Summary Judgment",
    "Judgment as a Matter of Law",
    "Claim Preclusion",
    "Issue Preclusion",
  ],
  "Constitutional Law": [
    "Judicial Review",
    "Congressional Powers",
    "Executive Powers",
    "Federalism",
    "Dormant Commerce Clause",
    "Equal Protection",
    "Due Process",
    "First Amendment",
    "State Action",
  ],
  "Contracts": [
    "Formation",
    "Defenses to Formation",
    "Interpretation",
    "Parol Evidence",
    "Conditions",
    "Performance",
    "Breach",
    "Remedies",
    "Third Party Rights",
    "UCC Sale of Goods",
  ],
  "Criminal Law and Procedure": [
    "Homicide",
    "Inchoate Crimes",
    "Parties Liability",
    "Property Crimes",
    "Defenses",
    "Search and Seizure",
    "Confessions",
    "Right to Counsel",
    "Trial Rights",
  ],
  "Evidence": [
    "Relevance",
    "Character Evidence",
    "Impeachment",
    "Hearsay",
    "Privileges",
    "Writings and Recordings",
    "Expert Testimony",
    "Judicial Notice",
  ],
  "Real Property": [
    "Present Estates",
    "Future Interests",
    "Concurrent Estates",
    "Landlord Tenant",
    "Easements",
    "Covenants and Servitudes",
    "Adverse Possession",
    "Land Sale Contracts",
    "Mortgages",
    "Recording Acts",
  ],
  "Torts": [
    "Negligence",
    "Duty",
    "Breach",
    "Causation",
    "Damages",
    "Strict Liability",
    "Products Liability",
    "Intentional Torts",
    "Defamation",
    "Privacy Torts",
  ],
}

export default function NewQuestionPage() {
  const router = useRouter()

  const [subject, setSubject] = useState(MBE_SUBJECTS[0])
  const [topic, setTopic] = useState("")
  const [question, setQuestion] = useState("")
  const [answerA, setAnswerA] = useState("")
  const [answerB, setAnswerB] = useState("")
  const [answerC, setAnswerC] = useState("")
  const [answerD, setAnswerD] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("A")
  const [explanation, setExplanation] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const topics = useMemo(() => SUBJECT_TOPIC_MAP[subject] || [], [subject])

  useEffect(() => {
    if (!topics.includes(topic)) {
      setTopic(topics[0] || "")
    }
  }, [subject, topics, topic])

  async function submitQuestion() {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/admin/add-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          topic,
          questionText: question,
          answerA,
          answerB,
          answerC,
          answerD,
          correctAnswer,
          explanation,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        setError(data?.error || "Failed to add question.")
        return
      }

      setSuccess("Question added successfully.")
      setQuestion("")
      setAnswerA("")
      setAnswerB("")
      setAnswerC("")
      setAnswerD("")
      setCorrectAnswer("A")
      setExplanation("")

      router.push("/admin/questions")
      router.refresh()
    } catch (err) {
      console.error("NEW QUESTION SUBMIT ERROR:", err)
      setError("Something went wrong while adding the question.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-lg border border-[#E4E0D8] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-[28px] leading-none text-[#0F0F0F]">
              Create MBE Question
            </div>
            <div className="mt-2 text-[13px] text-[#6B6B6B]">
              Add a new multiple choice question to the MBE bank. This form is restricted to real MBE subjects only.
            </div>
          </div>

          <div className="rounded-md border border-[#E4E0D8] bg-[#F7F3EC] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">
            Admin · Question Authoring
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#E4E0D8] bg-white">
        <div className="border-b border-[#EDE9E1] px-6 py-4">
          <div className="text-[12px] font-medium text-[#0F0F0F]">Question Details</div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              >
                {MBE_SUBJECTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              >
                {topics.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Question Text
            </label>
            <textarea
              placeholder="Write the full MBE-style question stem here."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#E4E0D8] bg-white">
        <div className="border-b border-[#EDE9E1] px-6 py-4">
          <div className="text-[12px] font-medium text-[#0F0F0F]">Answer Choices</div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer A
            </label>
            <input
              value={answerA}
              onChange={(e) => setAnswerA(e.target.value)}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#0F0F0F]"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer B
            </label>
            <input
              value={answerB}
              onChange={(e) => setAnswerB(e.target.value)}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#0F0F0F]"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer C
            </label>
            <input
              value={answerC}
              onChange={(e) => setAnswerC(e.target.value)}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#0F0F0F]"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer D
            </label>
            <input
              value={answerD}
              onChange={(e) => setAnswerD(e.target.value)}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#0F0F0F]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Correct Answer
            </label>
            <div className="grid grid-cols-4 gap-3">
              {["A", "B", "C", "D"].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setCorrectAnswer(choice)}
                  className={`rounded-md border px-4 py-3 text-[14px] font-medium transition ${
                    correctAnswer === choice
                      ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
                      : "border-[#E4E0D8] bg-white text-[#3A3A3A] hover:bg-[#F7F3EC]"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#E4E0D8] bg-white">
        <div className="border-b border-[#EDE9E1] px-6 py-4">
          <div className="text-[12px] font-medium text-[#0F0F0F]">Explanation</div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <textarea
            placeholder="Explain why the correct answer is right and why the others are wrong."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
          />

          {error && (
            <div className="rounded-md border border-[#F2D6D6] bg-[#FDECEC] px-4 py-3 text-[13px] text-[#B44C4C]">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-[#D7E9D8] bg-[#EDF7EE] px-4 py-3 text-[13px] text-[#2A6041]">
              {success}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={submitQuestion}
              disabled={loading}
              className="rounded-md border border-[#0F0F0F] bg-[#0F0F0F] px-5 py-3 text-[13px] font-medium text-white transition hover:bg-[#2A2A2A] disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add Question"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
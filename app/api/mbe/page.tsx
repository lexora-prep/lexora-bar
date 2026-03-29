"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function MBEPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [questions, setQuestions] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState("")
  const [showExplanation, setShowExplanation] = useState(false)

  const [subjects, setSubjects] = useState<any[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [startingSession, setStartingSession] = useState(false)
  const [submittingAnswer, setSubmittingAnswer] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setAuthLoading(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
      } catch (err) {
        console.error("LOAD USER ERROR:", err)
      } finally {
        setAuthLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    if (!userId) return
    loadSubjects()
  }, [userId])

  async function loadSubjects() {
    try {
      setLoadingSubjects(true)

      const res = await fetch("/api/mbe/subjects-topics")
      const data = await res.json()

      if (data.success) {
        setSubjects(data.subjects ?? [])
      } else {
        setSubjects([])
      }
    } catch (err) {
      console.error("LOAD SUBJECTS ERROR:", err)
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  async function startSession() {
    if (!userId) {
      router.push("/login")
      return
    }

    try {
      setStartingSession(true)

      const res = await fetch("/api/mbe/start-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          subjects: ["Contracts", "Torts", "Evidence"],
          questionCount: 5
        })
      })

      const data = await res.json()

      if (data.success) {
        setQuestions(data.questions ?? [])
        setIndex(0)
        setSelected("")
        setShowExplanation(false)
      } else {
        alert(data?.error || "Failed to start practice session.")
      }
    } catch (err) {
      console.error("START SESSION ERROR:", err)
      alert("Failed to start practice session.")
    } finally {
      setStartingSession(false)
    }
  }

  async function answer(choice: string) {
    if (!userId) {
      router.push("/login")
      return
    }

    if (showExplanation || submittingAnswer) return

    const q = questions[index]
    if (!q) return

    try {
      setSubmittingAnswer(true)
      setSelected(choice)

      const correct = choice === q.correctAnswer

      await fetch("/api/mbe/submit-attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          questionId: q.id,
          selectedAnswer: choice,
          isCorrect: correct,
          timeSpentSec: 10
        })
      })

      setShowExplanation(true)
    } catch (err) {
      console.error("SUBMIT ANSWER ERROR:", err)
      alert("Failed to submit answer.")
    } finally {
      setSubmittingAnswer(false)
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      setQuestions([])
      setIndex(0)
      setSelected("")
      setShowExplanation(false)
      return
    }

    setSelected("")
    setShowExplanation(false)
    setIndex(index + 1)
  }

  if (authLoading) {
    return <div className="p-10">Loading MBE...</div>
  }

  if (questions.length === 0) {
    return (
      <div className="p-10">
        <h1 className="text-2xl mb-6">
          MBE Practice
        </h1>

        <button
          onClick={startSession}
          disabled={startingSession || !userId}
          className="bg-blue-600 text-white px-6 py-3 rounded disabled:opacity-50"
        >
          {startingSession ? "Starting..." : "Start Practice"}
        </button>

        <div className="mt-10">
          <h2 className="text-xl mb-4">
            Subjects & Topics
          </h2>

          {loadingSubjects ? (
            <div className="text-gray-500">Loading subjects...</div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {subjects.map((subject: any) => (
                <div key={subject.id} className="border p-4 rounded">
                  <div className="font-semibold mb-2">
                    {subject.name}
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    {subject.questionCount} questions
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {subject.topics.map((topic: any) => {
                      return (
                        <div
                          key={topic.id}
                          className="text-sm border px-3 py-1 rounded"
                        >
                          {topic.name} ({topic.solvedCount} / {topic.questionCount})
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const q = questions[index]

  return (
    <div className="p-10 max-w-3xl">
      <h2 className="mb-4">
        Question {index + 1} of {questions.length}
      </h2>

      <div className="mb-6">
        {q.questionText}
      </div>

      <div className="space-y-3">
        {["A", "B", "C", "D"].map((letter) => {
          const text = q["answer" + letter]
          const isSelected = selected === letter
          const isCorrect = q.correctAnswer === letter

          return (
            <button
              key={letter}
              onClick={() => answer(letter)}
              disabled={showExplanation || submittingAnswer}
              className={`block w-full border p-3 rounded text-left transition ${
                showExplanation
                  ? isCorrect
                    ? "bg-green-50 border-green-500"
                    : isSelected
                    ? "bg-red-50 border-red-500"
                    : "bg-white border-gray-300"
                  : "hover:bg-gray-50"
              }`}
            >
              {letter}. {text}
            </button>
          )
        })}
      </div>

      {showExplanation && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <div className="font-semibold">
            Correct Answer: {q.correctAnswer}
          </div>

          <div className="mt-2">
            {q.explanation}
          </div>

          <button
            onClick={next}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            {index + 1 >= questions.length ? "Finish Session" : "Next Question"}
          </button>
        </div>
      )}
    </div>
  )
}
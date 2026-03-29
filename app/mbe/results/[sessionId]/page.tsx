"use client"

import { useEffect, useMemo, useState } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function MBEResultsPage({ params }: any) {
  const resolvedParams = React.use(params)
  const sessionId = resolvedParams.sessionId

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)

  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const [savedRules, setSavedRules] = useState<Record<number, boolean>>({})

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setLoading(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
      } catch (err) {
        console.error("LOAD USER ERROR:", err)
        setLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    async function loadResults() {
      if (!userId) return

      try {
        const res = await fetch(`/api/mbe/session/${sessionId}/results?userId=${userId}`)
        const data = await res.json()

        setQuestions(data.questions || [])
        setAnswers(data.answers || {})
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [sessionId, userId])

  async function saveRule() {
    if (!userId) {
      alert("Please log in again.")
      router.push("/login")
      return
    }

    const question = questions[currentIndex]

    if (!question?.ruleText) {
      alert("No rule available for this question.")
      return
    }

    try {
      const res = await fetch("/api/rules/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          subject: question.subject,
          topic: question.topic,
          ruleText: question.ruleText,
          sourceQuestionId: question.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error || "Failed to save rule.")
        return
      }

      setSavedRules((prev) => ({
        ...prev,
        [question.id]: true,
      }))
    } catch (err) {
      console.error("SAVE RULE ERROR:", err)
      alert("Failed to save rule.")
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading results...</div>
  }

  if (!questions.length) {
    return <div style={{ padding: 40 }}>No results found.</div>
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correctAnswer).length
  const score = Math.round((correctCount / questions.length) * 100)

  const question = questions[currentIndex]
  const userAnswer = answers[question.id]
  const correctAnswer = question.correctAnswer

  function renderAnswerAnalysis(letter: string) {
    const text = question["answer" + letter]

    const isCorrect = letter === correctAnswer
    const isUser = letter === userAnswer

    return (
      <div
        key={letter}
        className={`border rounded-lg p-4 mb-3
        ${
          isCorrect
            ? "border-green-500 bg-green-50"
            : isUser
            ? "border-red-500 bg-red-50"
            : "border-gray-300"
        }`}
      >
        <div className="font-semibold mb-1">
          {letter}. {text}
        </div>

        {isCorrect && (
          <div className="text-green-700 text-sm font-semibold">
            Correct answer
          </div>
        )}

        {isUser && !isCorrect && (
          <div className="text-red-700 text-sm font-semibold">
            Your answer
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 p-10 max-w-4xl">
        <div className="mb-6">
          <div className="text-2xl font-bold">
            Session Results
          </div>

          <div className="text-gray-500">
            Score: {correctCount} / {questions.length} ({score}%)
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-3">
          Question {currentIndex + 1} of {questions.length}
        </div>

        <div className="text-lg font-semibold mb-6">
          {question.questionText}
        </div>

        <div className="space-y-3">
          {["A", "B", "C", "D"].map((letter) => renderAnswerAnalysis(letter))}
        </div>

        <div className="mt-8 border rounded-xl p-6 bg-gray-50">
          <div className="mb-4 space-y-1">
            <div className="text-sm text-gray-600">
              Correct Answer:
              <span className="ml-2 font-semibold text-green-600">
                {correctAnswer}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              Your Answer:
              <span
                className={`ml-2 font-semibold ${
                  userAnswer === correctAnswer
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {userAnswer ?? "No answer"}
              </span>
            </div>
          </div>

          <div className="font-semibold mb-2">
            Explanation
          </div>

          <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
            {question.explanation || "Explanation not available."}
          </div>

          {question.ruleText && !savedRules[question.id] && (
            <button
              onClick={saveRule}
              className="mt-5 px-4 py-2 bg-slate-700 text-white rounded-lg"
            >
              Save Rule to Training
            </button>
          )}

          {savedRules[question.id] && (
            <div className="mt-5 text-green-600 font-semibold">
              Rule Saved ✓
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
            className="px-5 py-2 rounded border"
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))}
            className="px-5 py-2 rounded border"
          >
            Next
          </button>
        </div>
      </div>

      <div className="w-72 border-l p-6 space-y-6 bg-gray-50">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="text-sm text-gray-500 mb-3">
            Questions
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => {
              const correct = answers[q.id] === q.correctAnswer

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-10 rounded text-sm
                  ${
                    i === currentIndex
                      ? "bg-slate-700 text-white"
                      : correct
                      ? "bg-green-200"
                      : "bg-red-200"
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
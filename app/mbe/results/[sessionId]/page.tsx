"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Flag, Star, AlertTriangle } from "lucide-react"
import { useUnsavedChanges } from "@/app/_providers/UnsavedChangesProvider"

type PageProps = {
  params: {
    sessionId: string
  }
}

export default function MBESessionPage({ params }: PageProps) {
  const sessionId = params.sessionId
  const router = useRouter()
  const { setDirty, clearDirty } = useUnsavedChanges()

  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [timeRemaining, setTimeRemaining] = useState(0)
  const [totalTimeLimit, setTotalTimeLimit] = useState(0)
  const [paused, setPaused] = useState(false)

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [examSubmitted, setExamSubmitted] = useState(false)

  const [examStarted, setExamStarted] = useState(false)
  const [sessionMode, setSessionMode] = useState<string>("study")

  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({})
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({})
  const [reportedQuestions, setReportedQuestions] = useState<Record<string, boolean>>({})

  const [notes, setNotes] = useState<Record<string, string>>({})
  const [fontScale, setFontScale] = useState(1)

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/mbe/session/${sessionId}`)
        const data = await res.json()

        setQuestions(data?.questions ?? [])
        setSessionMode((data?.mode ?? "study").toString().toLowerCase())

        const serverTimeLimit = Number(data?.timeLimitSeconds ?? 0)
        setTotalTimeLimit(serverTimeLimit)

        const startedAt = data?.startedAt ? new Date(data.startedAt).getTime() : Date.now()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)

        const remaining =
          serverTimeLimit > 0
            ? Math.max(serverTimeLimit - elapsedSeconds, 0)
            : 0

        setTimeRemaining(remaining)

        if ((data?.mode ?? "").toString().toLowerCase() === "study") {
          setExamStarted(true)
        }
      } catch (err) {
        console.error(err)
        setQuestions([])
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadSession()
    }
  }, [sessionId])

  useEffect(() => {
    const hasActiveSession = examStarted && !examSubmitted && questions.length > 0

    if (hasActiveSession) {
      setDirty(true, {
        reason: "mbe_session",
        message:
          "You have an active MBE session. Leave this page only if you want to discard the current session progress.",
      })
    } else {
      clearDirty()
    }

    return () => {
      clearDirty()
    }
  }, [examStarted, examSubmitted, questions.length, setDirty, clearDirty])

  function commitCurrentAnswer() {
    if (!question) return

    const selected = selectedAnswers[question.id]

    if (selected) {
      setSubmittedAnswers((prev) => ({
        ...prev,
        [question.id]: selected,
      }))
    }
  }

  function goToNextQuestionFromTimeout() {
    commitCurrentAnswer()

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setPaused(false)
      return
    }

    submitExam(true)
  }

  useEffect(() => {
    if (!examStarted) return
    if (paused) return
    if (!questions.length) return
    if (totalTimeLimit <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setTimeout(() => {
            goToNextQuestionFromTimeout()
          }, 0)

          return 0
        }

        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paused, currentIndex, questions.length, examStarted, totalTimeLimit])

  function formatSeconds(seconds: number) {
    return (seconds % 60).toString().padStart(2, "0")
  }

  if (loading) return <div style={{ padding: 40 }}>Loading session...</div>
  if (!questions.length) return <div style={{ padding: 40 }}>No questions found.</div>

  if (!examStarted && sessionMode !== "study") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border rounded-2xl shadow p-10 space-y-6 text-center max-w-lg">
          <h2 className="text-2xl font-semibold">
            Ready to start your exam?
          </h2>

          <p className="text-gray-500">
            This session contains {questions.length} questions.
            The timer will begin once you start.
          </p>

          <div className="text-3xl font-bold">
            {Math.floor(timeRemaining / 60)}:{formatSeconds(timeRemaining)}
          </div>

          <button
            onClick={() => setExamStarted(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg"
          >
            Start Exam
          </button>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]

  const percentRemaining =
    totalTimeLimit > 0
      ? Math.max(0, Math.min(100, (timeRemaining / totalTimeLimit) * 100))
      : 0

  function selectAnswer(choice: string) {
    setSelectedAnswers((prev) => ({
      ...prev,
      [question.id]: choice,
    }))
  }

  function confirmAnswer() {
    commitCurrentAnswer()
  }

  function nextQuestion() {
    commitCurrentAnswer()

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function gotoQuestion(i: number) {
    commitCurrentAnswer()
    setCurrentIndex(i)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleFlagQuestion() {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [question.id]: !prev[question.id],
    }))
  }

  function toggleSaveQuestion() {
    setSavedQuestions((prev) => ({
      ...prev,
      [question.id]: !prev[question.id],
    }))
  }

  function reportQuestion() {
    setReportedQuestions((prev) => ({
      ...prev,
      [question.id]: true,
    }))
  }

  function submitExam(skipConfirm: boolean = false) {
    if (examSubmitted) return

    const unanswered = questions.filter(
      (q) => submittedAnswers[q.id] === undefined
    )

    if (!skipConfirm && unanswered.length > 0) {
      const unansweredNumbers = unanswered.map((q) => {
        const originalIndex = questions.findIndex((item) => item.id === q.id)
        return originalIndex + 1
      })

      const confirmed = window.confirm(
        `You still have unanswered question(s): ${unansweredNumbers.join(", ")}. Submit anyway?`
      )

      if (!confirmed) return
    }

    commitCurrentAnswer()
    setExamSubmitted(true)
    clearDirty()
    router.push(`/mbe/results/${sessionId}`)
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFontScale(0.9)} className="border px-2 rounded">T</button>
          <button onClick={() => setFontScale(1)} className="border px-2 rounded font-semibold">T</button>
          <button onClick={() => setFontScale(1.2)} className="border px-2 rounded text-lg">T</button>
        </div>

        {question && (
          <div
            className="space-y-6 max-w-3xl"
            style={{ fontSize: `${fontScale}rem` }}
          >
            <div className="flex justify-between items-center">
              <div className="text-blue-600 font-semibold">
                Study Mode 📖
                <span className="text-gray-400 ml-2">
                  Q{currentIndex + 1}/{questions.length}
                </span>
              </div>

              <div className="flex gap-2">
                {question.subject && (
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {question.subject} · {question.topic}
                  </div>
                )}

                <div className="border px-3 py-1 rounded text-sm text-gray-500">
                  ID: {question.id}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={toggleFlagQuestion}
                className={`border px-3 py-2 rounded-xl text-xs flex items-center gap-1 ${
                  flaggedQuestions[question.id]
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "bg-white"
                }`}
              >
                <Flag size={14} /> Flag
              </button>

              <button
                onClick={toggleSaveQuestion}
                className={`border px-3 py-2 rounded-xl text-xs flex items-center gap-1 ${
                  savedQuestions[question.id]
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-white"
                }`}
              >
                <Star size={14} /> Save
              </button>

              <button
                onClick={reportQuestion}
                className={`border px-3 py-2 rounded-xl text-xs flex items-center gap-1 ${
                  reportedQuestions[question.id]
                    ? "bg-green-100 border-green-300 text-green-700"
                    : "bg-white"
                }`}
              >
                <AlertTriangle size={14} /> Report
              </button>
            </div>

            <div className="text-lg font-semibold">
              {question.questionText}
            </div>

            <div className="space-y-3">
              {["A", "B", "C", "D"].map((letter) => {
                const text = question["answer" + letter]
                const selected = selectedAnswers[question.id] === letter
                const submitted = submittedAnswers[question.id]
                const correct = question.correctAnswer

                let style = "border-gray-300 hover:bg-gray-50"

                if (submitted) {
                  if (letter === correct) style = "bg-green-100 border-green-400 text-green-800"
                  else if (letter === submitted) style = "bg-red-100 border-red-400 text-red-800"
                } else if (selected) {
                  style = "border-blue-600 bg-blue-50"
                }

                return (
                  <div key={letter} className="relative">
                    <button
                      onClick={() => selectAnswer(letter)}
                      className={`w-full text-left border rounded-lg p-4 ${style}`}
                    >
                      <span className="font-semibold mr-2">{letter}.</span>
                      {text}
                    </button>
                  </div>
                )
              })}
            </div>

            {!submittedAnswers[question.id] && (
              <button
                onClick={confirmAnswer}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg"
              >
                Confirm Answer
              </button>
            )}

            {submittedAnswers[question.id] && question.explanation && (
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-5">
                <div className="text-xs font-semibold text-blue-700 mb-2">
                  EXPLANATION
                </div>

                <div className="text-gray-700">
                  {question.explanation}
                </div>
              </div>
            )}

            <textarea
              placeholder="Your notes for this question..."
              value={notes[question.id] || ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full border rounded p-3 text-sm"
              rows={3}
            />

            <div className="flex justify-between pt-6">
              <button
                onClick={nextQuestion}
                className="bg-slate-700 text-white px-6 py-2 rounded-lg"
              >
                Next Question
              </button>

              <button
                onClick={() => {
                  if (sessionMode === "study" && currentIndex === questions.length - 1) {
                    clearDirty()
                    router.push("/mbe")
                  } else {
                    submitExam()
                  }
                }}
                className="bg-red-600 text-white px-6 py-2 rounded-xl"
              >
                {sessionMode === "study" && currentIndex === questions.length - 1
                  ? "Finish Session"
                  : "Submit Exam"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-72 border-l p-6 space-y-6 bg-gray-50 overflow-y-auto">
        <div className="bg-white rounded-xl border shadow-sm p-5 text-center space-y-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Session Timer
          </div>

          {totalTimeLimit > 0 && (
            <>
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-2 rounded bg-blue-500 transition-all"
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>

              <div className="text-4xl font-bold">
                <span>{Math.floor(timeRemaining / 60)}:</span>
                <span className={timeRemaining <= 10 && !paused ? "text-red-600" : ""}>
                  {formatSeconds(timeRemaining)}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setPaused(true)}
              className="px-4 py-2 rounded-lg border"
            >
              Pause
            </button>

            <button
              onClick={() => setPaused(false)}
              className="px-4 py-2 rounded-lg border"
            >
              Resume
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Questions
          </div>

          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, i) => {
              const answered = submittedAnswers[q.id] !== undefined
              const flagged = flaggedQuestions[q.id]
              const saved = savedQuestions[q.id]
              const reported = reportedQuestions[q.id]
              const active = i === currentIndex

              let stateClass = "bg-gray-100 border-gray-300 text-gray-700"

              if (reported) stateClass = "bg-green-100 border-green-300 text-green-700"
              else if (saved) stateClass = "bg-orange-100 border-orange-300 text-orange-700"
              else if (flagged) stateClass = "bg-red-100 border-red-300 text-red-700"
              else if (answered) stateClass = "bg-blue-100 border-blue-300 text-blue-700"

              if (active) stateClass = "bg-blue-600 border-blue-600 text-white"

              return (
                <button
                  key={q.id}
                  onClick={() => gotoQuestion(i)}
                  className={`h-10 rounded-lg border text-sm font-medium ${stateClass}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div className="text-xs pt-2 space-y-1">
            <div>Blue = Answered</div>
            <div>Red = Flagged</div>
            <div>Orange = Saved</div>
            <div>Green = Reported</div>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, ChevronUp, BookOpen, Target, Brain } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type Topic = {
  id: number
  name: string
  questionCount: number
  solvedCount: number
}

type Subject = {
  id: number
  name: string
  questionCount: number
  topics: Topic[]
}

type ReviewTopic = {
  id: number
  name: string
  subjectId?: number
  questionCount?: number
}

type ReviewSubject = {
  id: number
  name: string
  questionCount: number
  topics: ReviewTopic[]
}

type SelectedTopicsMap = Record<number, number[]>

const SUBJECT_STYLES: Record<
  string,
  {
    border: string
    accent: string
    chip: string
    button: string
    iconBg: string
    icon: string
    description: string
    topics: string[]
  }
> = {
  Contracts: {
    border: "border-blue-200",
    accent: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    iconBg: "bg-blue-50",
    icon: "✍️",
    description:
      "Offer, acceptance, consideration, performance, breach, defenses, and remedies under common law and UCC Article 2.",
    topics: ["Offer & Acceptance", "Consideration", "Defenses", "Remedies", "UCC Article 2"],
  },
  Torts: {
    border: "border-red-200",
    accent: "bg-red-500",
    chip: "border-red-200 bg-red-50 text-red-700",
    button: "bg-red-600 hover:bg-red-700 text-white",
    iconBg: "bg-red-50",
    icon: "⚖️",
    description:
      "Intentional torts, negligence, strict liability, products liability, nuisance, and defamation.",
    topics: ["Negligence", "Intentional Torts", "Products Liability", "Strict Liability", "Defenses"],
  },
  "Real Property": {
    border: "border-emerald-200",
    accent: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    iconBg: "bg-emerald-50",
    icon: "🏠",
    description:
      "Present estates, future interests, concurrent ownership, landlord-tenant, deeds, mortgages, and recording acts.",
    topics: ["Estates", "Land Transactions", "Adverse Possession", "Mortgages", "Easements"],
  },
  Evidence: {
    border: "border-violet-200",
    accent: "bg-violet-500",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    button: "bg-violet-600 hover:bg-violet-700 text-white",
    iconBg: "bg-violet-50",
    icon: "🔍",
    description:
      "Relevance, hearsay and its exceptions, privileges, impeachment, authentication, and the best evidence rule.",
    topics: ["Hearsay", "Exceptions", "Relevance", "Privileges", "Expert Testimony"],
  },
  "Civil Procedure": {
    border: "border-amber-200",
    accent: "bg-amber-600",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    iconBg: "bg-amber-50",
    icon: "⚖️",
    description:
      "Personal and subject matter jurisdiction, venue, pleadings, discovery, summary judgment, and appeals.",
    topics: ["Personal Jurisdiction", "SMJ", "Erie", "Pleadings", "Discovery"],
  },
  "Criminal Law and Procedure": {
    border: "border-orange-200",
    accent: "bg-orange-700",
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    button: "bg-orange-700 hover:bg-orange-800 text-white",
    iconBg: "bg-orange-50",
    icon: "⚖️",
    description:
      "Homicide, theft crimes, defenses, constitutional protections, 4th–6th Amendment rights, and confessions.",
    topics: ["Homicide", "Theft Crimes", "Defenses", "4th Amendment", "5th & 6th Amendment"],
  },
  "Constitutional Law": {
    border: "border-sky-200",
    accent: "bg-sky-500",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
    iconBg: "bg-sky-50",
    icon: "🏛️",
    description:
      "Judicial review, federalism, separation of powers, equal protection, due process, and the First Amendment.",
    topics: ["Federalism", "Separation of Powers", "Equal Protection", "Due Process", "First Amendment"],
  },
}

function getSubjectStyle(name: string) {
  return (
    SUBJECT_STYLES[name] || {
      border: "border-slate-200",
      accent: "bg-slate-500",
      chip: "border-slate-200 bg-slate-50 text-slate-700",
      button: "bg-slate-700 hover:bg-slate-800 text-white",
      iconBg: "bg-slate-50",
      icon: "📘",
      description: "Practice targeted questions by subject and topic.",
      topics: [],
    }
  )
}

export default function MBEPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [showPreviousExams, setShowPreviousExams] = useState(false)

  const [mode, setMode] = useState<"study" | "quiz" | "review">("study")
  const [reviewSource, setReviewSource] = useState<
    "saved" | "missed" | "combined" | "weak"
  >("saved")

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [reviewSubjects, setReviewSubjects] = useState<ReviewSubject[]>([])

  const [selectedReviewSubjects, setSelectedReviewSubjects] = useState<number[]>([])
  const [selectedReviewTopics, setSelectedReviewTopics] = useState<SelectedTopicsMap>({})
  const [expandedReviewSubjects, setExpandedReviewSubjects] = useState<number[]>([])

  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([])
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopicsMap>({})

  const [questionCount, setQuestionCount] = useState<number | "">("")
  const [customMinutes, setCustomMinutes] = useState<number | "">(1)
  const [customSeconds, setCustomSeconds] = useState<number | "">(40)

  const [loading, setLoading] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingReviewSubjects, setLoadingReviewSubjects] = useState(false)

  const [subjectSearch, setSubjectSearch] = useState("")

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
    async function loadSubjects() {
      try {
        setLoadingSubjects(true)

        const res = await fetch("/api/mbe/subjects-topics")
        const data = await res.json()

        if (data.success) {
          setSubjects(data.subjects || [])
        } else {
          setSubjects([])
        }
      } catch (err) {
        console.error(err)
        setSubjects([])
      } finally {
        setLoadingSubjects(false)
      }
    }

    loadSubjects()
  }, [])

  useEffect(() => {
    async function loadReviewPool() {
      if (mode !== "review") return

      try {
        setLoadingReviewSubjects(true)

        const res = await fetch(`/api/mbe/review-pool?source=${reviewSource}`)
        const data = await res.json()

        if (data.success) {
          const normalized: ReviewSubject[] = (data.subjects || []).map((subject: any) => ({
            id: subject.id,
            name: subject.name,
            questionCount:
              typeof subject.questionCount === "number"
                ? subject.questionCount
                : Array.isArray(subject.topics)
                ? subject.topics.length
                : 0,
            topics: Array.isArray(subject.topics)
              ? subject.topics.map((topic: any) => ({
                  id: topic.id,
                  name: topic.name,
                  subjectId: topic.subjectId,
                  questionCount:
                    typeof topic.questionCount === "number" ? topic.questionCount : 0,
                }))
              : [],
          }))

          setReviewSubjects(normalized)
        } else {
          setReviewSubjects([])
        }
      } catch (err) {
        console.error(err)
        setReviewSubjects([])
      } finally {
        setLoadingReviewSubjects(false)
      }
    }

    loadReviewPool()
  }, [mode, reviewSource])

  function toggleExpand(subjectId: number) {
    setExpandedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function toggleReviewExpand(subjectId: number) {
    setExpandedReviewSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function toggleSubject(subjectId: number) {
    setSelectedSubjects((prev) => {
      const isSelected = prev.includes(subjectId)

      if (isSelected) {
        return prev.filter((id) => id !== subjectId)
      }

      return [...prev, subjectId]
    })
  }

  function toggleReviewSubject(subjectId: number) {
    setSelectedReviewSubjects((prev) => {
      const isSelected = prev.includes(subjectId)

      if (isSelected) {
        const next = prev.filter((id) => id !== subjectId)

        setSelectedReviewTopics((current) => {
          const copy = { ...current }
          delete copy[subjectId]
          return copy
        })

        return next
      }

      return [...prev, subjectId]
    })
  }

  function toggleTopic(subjectId: number, topicId: number) {
    setSelectedTopics((prev) => {
      const current = prev[subjectId] || []
      const exists = current.includes(topicId)

      return {
        ...prev,
        [subjectId]: exists
          ? current.filter((id) => id !== topicId)
          : [...current, topicId],
      }
    })

    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev : [...prev, subjectId]
    )
  }

  function toggleReviewTopic(subjectId: number, topicId: number) {
    setSelectedReviewTopics((prev) => {
      const current = prev[subjectId] || []
      const exists = current.includes(topicId)

      return {
        ...prev,
        [subjectId]: exists
          ? current.filter((id) => id !== topicId)
          : [...current, topicId],
      }
    })

    setSelectedReviewSubjects((prev) =>
      prev.includes(subjectId) ? prev : [...prev, subjectId]
    )
  }

  function handleQuestionCountChange(value: string) {
    if (value === "") {
      setQuestionCount("")
      return
    }

    const parsed = Number(value)

    if (Number.isNaN(parsed)) return
    if (parsed < 1) {
      setQuestionCount(1)
      return
    }
    if (parsed > 100) {
      setQuestionCount(100)
      return
    }

    setQuestionCount(parsed)
  }

  function handleCustomMinutesChange(value: string) {
    if (value === "") {
      setCustomMinutes("")
      return
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    setCustomMinutes(Math.max(0, parsed))
  }

  function handleCustomSecondsChange(value: string) {
    if (value === "") {
      setCustomSeconds("")
      return
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed)) return

    const clamped = Math.max(0, Math.min(59, parsed))
    setCustomSeconds(clamped)
  }

  function applyPreset(minutes: number, seconds: number) {
    setCustomMinutes(minutes)
    setCustomSeconds(seconds)
  }

  const hasSelection =
    mode === "review"
      ? selectedReviewSubjects.length > 0 || reviewSubjects.length === 0
      : selectedSubjects.length > 0

  const startButtonText = useMemo(() => {
    const label =
      mode === "study"
        ? "Study"
        : mode === "quiz"
        ? "Quiz"
        : "Review"

    if (!questionCount) {
      return `Start ${label} Session`
    }

    return `Start ${label} Session — ${questionCount} Questions`
  }, [mode, questionCount])

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return subjects

    return subjects.filter((subject) => {
      const matchSubject = subject.name.toLowerCase().includes(q)
      const matchTopic = subject.topics.some((topic) =>
        topic.name.toLowerCase().includes(q)
      )
      return matchSubject || matchTopic
    })
  }, [subjects, subjectSearch])

  async function startSession() {
    if (!userId) {
      alert("Please log in again.")
      router.push("/login")
      return
    }

    if (!questionCount || questionCount < 1 || questionCount > 100) {
      alert("Enter a number of questions between 1 and 100.")
      return
    }

    if ((mode === "study" || mode === "quiz") && !hasSelection) {
      alert("Select at least one subject.")
      return
    }

    if (mode === "review" && reviewSubjects.length > 0 && selectedReviewSubjects.length === 0) {
      alert("Select at least one review subject.")
      return
    }

    const minutesValue = customMinutes === "" ? 0 : Math.max(0, Number(customMinutes))
    const secondsValue = customSeconds === "" ? 0 : Math.max(0, Math.min(59, Number(customSeconds)))
    const secondsPerQuestion = minutesValue * 60 + secondsValue

    if ((mode === "quiz" || mode === "review") && secondsPerQuestion <= 0) {
      alert("Enter a valid timer.")
      return
    }

    try {
      setLoading(true)

      const payload = {
        userId,
        mode,
        reviewSource: mode === "review" ? reviewSource : null,
        reviewSelection:
          mode === "review"
            ? selectedReviewSubjects.map((subjectId) => {
                const subject = reviewSubjects.find((s) => s.id === subjectId)

                return {
                  subjectId,
                  name: subject?.name || "",
                  topicIds: selectedReviewTopics[subjectId] || [],
                }
              })
            : [],
        questionCount,
        secondsPerQuestion: mode === "study" ? null : secondsPerQuestion,
        subjects:
          mode === "review"
            ? []
            : selectedSubjects.map((subjectId) => {
                const subject = subjects.find((s) => s.id === subjectId)

                return {
                  subjectId,
                  name: subject?.name || "",
                  topicIds: selectedTopics[subjectId] || [],
                }
              }),
      }

      const res = await fetch("/api/mbe/start-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || "Failed to start session")
        return
      }

      router.push(`/mbe/session/${data.sessionId}`)
    } catch (err) {
      console.error(err)
      alert("Failed to start session")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="p-10">Loading MBE...</div>
  }

  return (
    <div className="p-8 md:p-10 max-w-[1500px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          MBE Practice
        </h1>
        <p className="text-slate-500 mt-2">
          Choose your subjects, select topics, and launch a focused practice session.
        </p>
      </div>

      <div className="flex gap-8 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => setShowPreviousExams(false)}
          className={`pb-2 text-lg ${
            !showPreviousExams
              ? "text-slate-900 font-semibold border-b-2 border-amber-500"
              : "text-slate-500"
          }`}
        >
          Practice
        </button>

        <button
          type="button"
          onClick={() => setShowPreviousExams(true)}
          className={`pb-2 text-lg ${
            showPreviousExams
              ? "text-slate-900 font-semibold border-b-2 border-amber-500"
              : "text-slate-500"
          }`}
        >
          Previous Exams
        </button>
      </div>

      {showPreviousExams ? (
        <div className="border border-slate-200 rounded-3xl p-8 bg-white">
          <h2 className="text-2xl font-semibold mb-4">Previous Exams</h2>
          <p className="text-slate-500">
            Past exam history, scores, and statistics will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-3xl p-6 bg-white space-y-6">
            <div className="text-sm font-semibold tracking-wide text-slate-700">
              SESSION MODE
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ModeCard
                title="Study Mode"
                subtitle="Answers revealed immediately."
                active={mode === "study"}
                icon={<BookOpen size={20} />}
                onClick={() => setMode("study")}
              />

              <ModeCard
                title="Quiz Mode"
                subtitle="Timed conditions like the real exam."
                active={mode === "quiz"}
                icon={<Target size={20} />}
                onClick={() => setMode("quiz")}
              />

              <ModeCard
                title="Review Mode"
                subtitle="Practice saved, missed, or weak questions."
                active={mode === "review"}
                icon={<Brain size={20} />}
                onClick={() => setMode("review")}
              />
            </div>
          </div>

          {mode === "review" && (
            <div className="border border-slate-200 rounded-3xl p-6 bg-white">
              <div className="text-sm font-semibold mb-5 text-slate-700">
                REVIEW SOURCE
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { key: "saved", label: "Saved" },
                  { key: "missed", label: "Missed" },
                  { key: "combined", label: "Saved + Missed" },
                  { key: "weak", label: "Weak Topics" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setReviewSource(item.key as any)}
                    className={`p-4 border rounded-2xl transition ${
                      reviewSource === item.key
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mode === "study" || mode === "quiz") && (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-6 text-sm font-semibold text-slate-500">
                  <span className="text-slate-900">
                    All Subjects <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{subjects.length}</span>
                  </span>
                  <span>
                    Selected <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{selectedSubjects.length}</span>
                  </span>
                  <span>
                    Topics <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                      {Object.values(selectedTopics).reduce((sum, arr) => sum + arr.length, 0)}
                    </span>
                  </span>
                </div>

                <div className="relative w-full md:w-[320px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Filter subjects or topics..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-3xl p-6 bg-white">
                {loadingSubjects ? (
                  <div className="text-slate-500">Loading subjects...</div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="text-slate-500">
                    No matching subjects found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {filteredSubjects.map((subject) => {
                      const expanded = expandedSubjects.includes(subject.id)
                      const selected = selectedSubjects.includes(subject.id)
                      const topicIds = selectedTopics[subject.id] || []
                      const style = getSubjectStyle(subject.name)

                      const estimatedMastery =
                        subject.questionCount > 0
                          ? Math.min(100, Math.round((subject.topics.reduce((sum, t) => sum + t.solvedCount, 0) / Math.max(subject.questionCount, 1)) * 100))
                          : 0

                      const estimatedAccuracy =
                        estimatedMastery === 0 ? 0 : Math.min(100, estimatedMastery + 18)

                      const selectedTopicCount = topicIds.length
                      const dueCount =
                        selectedTopicCount > 0
                          ? selectedTopicCount
                          : Math.min(subject.topics.length, Math.max(1, Math.ceil(subject.questionCount / 10)))

                      return (
                        <div
                          key={subject.id}
                          className={`rounded-[28px] border bg-white p-6 shadow-sm ${style.border}`}
                        >
                          <div className={`h-1 w-full rounded-full ${style.accent} mb-6`} />

                          <div className="flex items-start justify-between gap-4">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl ${style.iconBg}`}>
                              {style.icon}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleSubject(subject.id)}
                              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                selected
                                  ? style.chip
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {selected ? "Selected" : `${dueCount} due`}
                            </button>
                          </div>

                          <div className="mt-5">
                            <div className="text-[38px] leading-none font-serif text-slate-900">
                              {subject.name}
                            </div>

                            <p className="text-slate-500 mt-4 leading-7 min-h-[72px]">
                              {style.description}
                            </p>
                          </div>

                          <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${style.accent}`}
                              style={{ width: `${estimatedMastery}%` }}
                            />
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-500">
                                <span className="font-semibold text-slate-800">{subject.questionCount}</span> cards
                              </span>
                              <span className="text-slate-500">
                                <span className="font-semibold text-slate-800">{estimatedMastery}%</span> mastered
                              </span>
                              <span className="text-slate-500">
                                <span className="font-semibold text-slate-800">{estimatedAccuracy}%</span> accuracy
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpand(subject.id)}
                              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${style.button}`}
                            >
                              {expanded ? "Hide Topics" : "Pick Topics"}
                              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {(expanded ? subject.topics : subject.topics.slice(0, 5)).map((topic) => {
                              const topicSelected = topicIds.includes(topic.id)

                              return (
                                <button
                                  key={topic.id}
                                  type="button"
                                  onClick={() => toggleTopic(subject.id, topic.id)}
                                  className={`rounded-full border px-3 py-2 text-sm transition ${
                                    topicSelected
                                      ? style.chip
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  {topic.name} ({topic.solvedCount} / {topic.questionCount})
                                </button>
                              )
                            })}

                            {!expanded && subject.topics.length > 5 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(subject.id)}
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"
                              >
                                +{subject.topics.length - 5} more
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {mode === "review" && (
            <div className="border border-slate-200 rounded-3xl p-7 bg-white">
              <div className="text-sm font-semibold mb-6">
                Review Subjects & Topics
              </div>

              {loadingReviewSubjects ? (
                <div className="text-slate-500">Loading review subjects...</div>
              ) : reviewSubjects.length === 0 ? (
                <div className="text-slate-500">
                  No review questions found for this source yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {reviewSubjects.map((subject) => {
                    const expanded = expandedReviewSubjects.includes(subject.id)
                    const selected = selectedReviewSubjects.includes(subject.id)
                    const topicIds = selectedReviewTopics[subject.id] || []

                    return (
                      <div
                        key={subject.id}
                        className={`border rounded-2xl p-5 transition ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleReviewSubject(subject.id)}
                            className="text-left"
                          >
                            <div className="font-semibold text-xl">
                              {subject.name}
                            </div>
                            <div className="text-slate-500 mt-1">
                              {subject.questionCount > 0
                                ? `${subject.questionCount} questions`
                                : "No questions yet"}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleReviewExpand(subject.id)}
                            className="text-blue-600 text-sm"
                          >
                            {expanded ? "Hide" : "Topics"}
                          </button>
                        </div>

                        {expanded && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {subject.topics.map((topic) => {
                              const topicSelected = topicIds.includes(topic.id)

                              return (
                                <button
                                  key={topic.id}
                                  type="button"
                                  onClick={() => toggleReviewTopic(subject.id, topic.id)}
                                  className={`px-3 py-2 rounded-full border text-sm transition ${
                                    topicSelected
                                      ? "border-blue-600 bg-blue-100 text-blue-700"
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  {topic.name}
                                  {typeof topic.questionCount === "number"
                                    ? ` (${topic.questionCount})`
                                    : ""}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div
            className={`grid gap-6 ${
              mode === "study" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            <div className="border border-slate-200 rounded-3xl p-7 bg-white">
              <div className="text-sm font-semibold mb-4 text-slate-700">
                Total Questions
              </div>

              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => handleQuestionCountChange(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3 w-32 text-lg"
              />

              <div className="text-sm text-slate-500 mt-3">
                Limit: 1 to 100 questions.
              </div>
            </div>

            {(mode === "quiz" || mode === "review") && (
              <div className="border border-slate-200 rounded-3xl p-7 bg-white">
                <div className="text-sm font-semibold mb-4 text-slate-700">
                  Timer Per Question
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPreset(1, 0)}
                    className="px-4 py-2 border border-slate-200 rounded-xl"
                  >
                    1:00
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset(1, 40)}
                    className="px-4 py-2 border border-slate-200 rounded-xl"
                  >
                    1:40
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset(2, 0)}
                    className="px-4 py-2 border border-slate-200 rounded-xl"
                  >
                    2:00
                  </button>
                </div>

                <div className="flex items-center gap-3 text-lg">
                  <input
                    type="number"
                    min={0}
                    value={customMinutes}
                    onChange={(e) => handleCustomMinutesChange(e.target.value)}
                    className="w-16 border border-slate-200 rounded-xl text-center py-2"
                  />

                  <span>:</span>

                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={customSeconds}
                    onChange={(e) => handleCustomSecondsChange(e.target.value)}
                    className="w-16 border border-slate-200 rounded-xl text-center py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startSession}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Starting session..." : startButtonText}
          </button>
        </>
      )}
    </div>
  )
}

function ModeCard({
  title,
  subtitle,
  active,
  icon,
  onClick,
}: {
  title: string
  subtitle: string
  active: boolean
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-6 border rounded-3xl text-left transition ${
        active
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3 text-slate-900 font-semibold text-xl">
        {icon}
        {title}
      </div>

      <p className="text-slate-500 mt-3 text-base">
        {subtitle}
      </p>
    </button>
  )
}
"use client"

import { useEffect, useMemo, useState, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronLeft,
  Clock3,
  Eye,
  Flag,
  Layers3,
  Save,
  Sparkles,
  X,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type Flashcard = {
  id: string
  subject: string
  topic: string
  title: string
  ruleType: string
  rule: string
  buzzwords: string[]
}

type SessionPayload = {
  id?: string
  mode?: "study" | "quiz"
  timed?: boolean
  timePerCard?: number
  deckType?: string
  cards?: any[]
}

type CardAnswer = "knew" | "missed"

function buildQuestion(title: string, ruleType?: string) {
  if (ruleType === "elements") return `What are the elements of ${title}?`
  if (ruleType === "definition") return `What is the rule for ${title}?`
  if (ruleType === "doctrine") return `What is the ${title} doctrine?`
  if (ruleType === "exception") return `What is the exception to ${title}?`
  if (ruleType === "test") return `What is the ${title} test?`
  return `What is the rule for ${title}?`
}

function truncate(text: string, max = 26) {
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function ProgressRing({
  knew,
  missed,
  total,
}: {
  knew: number
  missed: number
  total: number
}) {
  const done = knew + missed
  const remaining = Math.max(total - done, 0)
  const greenDeg = total > 0 ? (knew / total) * 360 : 0
  const redDeg = total > 0 ? (missed / total) * 360 : 0
  const grayDeg = total > 0 ? (remaining / total) * 360 : 0
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const background = `conic-gradient(
    #16a34a 0deg ${greenDeg}deg,
    #ef4444 ${greenDeg}deg ${greenDeg + redDeg}deg,
    rgba(148,163,184,0.18) ${greenDeg + redDeg}deg ${greenDeg + redDeg + grayDeg}deg
  )`

  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <div
        className="absolute inset-0 rounded-full shadow-[0_0_35px_rgba(59,130,246,0.10)]"
        style={{ background }}
      />
      <div className="absolute inset-[9px] rounded-full border border-white/70 bg-white/90 backdrop-blur-md" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[18px] font-semibold tracking-[-0.04em] text-slate-900">
            {percent}%
          </div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
            done
          </div>
        </div>
      </div>
    </div>
  )
}

function SideRow({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${valueClassName}`}>{value}</span>
    </div>
  )
}

function TinyButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: "neutral" | "blue" | "red" | "green" | "dark"
}) {
  const className =
    tone === "blue"
      ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
      : tone === "red"
        ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
        : tone === "green"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : tone === "dark"
            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[38px] items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium shadow-sm transition ${className} ${
        disabled ? "cursor-not-allowed opacity-45 hover:bg-inherit" : ""
      }`}
    >
      {children}
    </button>
  )
}

export default function FlashcardSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { sessionId } = use(params)

  const [userId, setUserId] = useState<string | null>(null)

  const [cards, setCards] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showAnswer, setShowAnswer] = useState(false)
  const [finished, setFinished] = useState(false)

  const [savedCards, setSavedCards] = useState<string[]>([])
  const [reviewCards, setReviewCards] = useState<string[]>([])
  const [answersByCardId, setAnswersByCardId] = useState<Record<string, CardAnswer>>({})

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("Wrong rule")
  const [reportNote, setReportNote] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const [sessionMode, setSessionMode] = useState<"study" | "quiz">("study")
  const [deckType, setDeckType] = useState("custom")
  const [timed, setTimed] = useState(false)
  const [timePerCard, setTimePerCard] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

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
    if (!userId) return

    try {
      const stored = sessionStorage.getItem(`flashcard-session-${sessionId}`)

      if (!stored) {
        console.error("Session not found in sessionStorage")
        setLoading(false)
        return
      }

      const session: SessionPayload = JSON.parse(stored)

      if (!session?.cards) {
        console.error("Invalid session data", session)
        setLoading(false)
        return
      }

      const mapped = session.cards.map((r: any) => ({
        id: String(r.id),
        subject: r.subject ?? "",
        topic: r.topic ?? "",
        title: r.title ?? r.topic ?? "",
        ruleType: r.rule_type ?? "definition",
        rule: r.ruleText ?? r.rule ?? "",
        buzzwords: r.keywords ?? r.buzzwords ?? [],
      }))

      setCards(mapped)
      setSessionMode(session.mode ?? "study")
      setDeckType(session.deckType ?? "custom")
      setTimed(!!session.timed)
      setTimePerCard(typeof session.timePerCard === "number" ? session.timePerCard : null)
      setTimeLeft(session.timed ? session.timePerCard ?? null : null)
    } catch (err) {
      console.error("Failed to load stored session", err)
    }

    setLoading(false)
  }, [sessionId, userId])

  useEffect(() => {
    if (!timed || finished || cards.length === 0) return
    if (showAnswer) return
    if (timeLeft === null) return

    if (timeLeft <= 0) {
      setShowAnswer(true)
      return
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => (prev === null ? null : prev - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [timed, finished, cards.length, showAnswer, timeLeft])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (finished || loading || cards.length === 0) return
      if (reportOpen) return

      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return

      if (e.code === "Space") {
        e.preventDefault()
        if (!showAnswer) setShowAnswer(true)
        return
      }

      if (e.key === "1") {
        if (showAnswer) {
          void answer("missed")
        }
        return
      }

      if (e.key === "2") {
        if (showAnswer) {
          void answer("knew")
        }
        return
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        previousCard()
        return
      }

      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (canGoNext) nextCard()
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showAnswer, finished, loading, cards.length, reportOpen, index, answersByCardId])

  const card = cards[index]

  const correct = useMemo(
    () => Object.values(answersByCardId).filter((v) => v === "knew").length,
    [answersByCardId]
  )

  const missed = useMemo(
    () => Object.values(answersByCardId).filter((v) => v === "missed").length,
    [answersByCardId]
  )

  const answeredCount = correct + missed
  const remaining = Math.max(cards.length - answeredCount, 0)
  const currentAnswer = card ? answersByCardId[card.id] : undefined
  const canGoNext = !!currentAnswer && index + 1 < cards.length
  const canFinish = !!currentAnswer && index === cards.length - 1
  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0
  const scorePercent = answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : 0

  const nextPreview = cards.slice(index + 1, index + 5)

  async function answer(result: CardAnswer) {
    if (!userId || !card) {
      alert("Please log in again.")
      router.push("/login")
      return
    }

    const previous = answersByCardId[card.id]

    try {
      await fetch("/api/flashcards/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId,
          ruleId: card.id,
          result,
        }),
      })

      setAnswersByCardId((prev) => ({
        ...prev,
        [card.id]: result,
      }))

      if (!showAnswer) {
        setShowAnswer(true)
      }

      if (previous !== result) {
        // no-op on purpose, derived counts handle it
      }
    } catch (err) {
      console.error("FLASHCARD ANSWER ERROR:", err)
      alert("Failed to save answer.")
    }
  }

  function previousCard() {
    if (index === 0) return
    setIndex((i) => i - 1)
    setShowAnswer(false)
    setTimeLeft(timed ? timePerCard : null)
  }

  function nextCard() {
    if (!canGoNext) return
    setIndex((i) => i + 1)
    setShowAnswer(false)
    setTimeLeft(timed ? timePerCard : null)
  }

  function finishSession() {
    if (!canFinish) return
    setFinished(true)
  }

  function toggleSaveCard() {
    if (!card) return

    setSavedCards((prev) =>
      prev.includes(card.id)
        ? prev.filter((id) => id !== card.id)
        : [...prev, card.id]
    )
  }

  function toggleReviewCard() {
    if (!card) return

    setReviewCards((prev) =>
      prev.includes(card.id)
        ? prev.filter((id) => id !== card.id)
        : [...prev, card.id]
    )
  }

  async function submitReport() {
    if (!card) return

    try {
      setReportSubmitting(true)

      await fetch("/api/flashcards/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId,
          ruleId: card.id,
          reason: reportReason,
          note: reportNote,
          topic: card.topic,
          subject: card.subject,
          title: card.title,
        }),
      })

      setReportOpen(false)
      setReportReason("Wrong rule")
      setReportNote("")
      alert("Report submitted")
    } catch (err) {
      console.error("Failed to submit report", err)
      alert("Failed to submit report")
    } finally {
      setReportSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%),#f8fbff] p-8">
        <div className="mx-auto max-w-[1280px] text-slate-500">Loading flashcards...</div>
      </div>
    )
  }

  if (!card || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%),#f8fbff] p-8">
        <div className="mx-auto max-w-[1280px] text-slate-500">No flashcards available</div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%),#f8fbff] px-4 py-8">
        <div className="mx-auto max-w-[720px] rounded-[30px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_55px_-30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#7c3aed)] text-white shadow-[0_18px_40px_-20px_rgba(59,130,246,0.45)]">
            <Sparkles size={22} />
          </div>

          <h1 className="text-[32px] font-semibold tracking-[-0.05em] text-slate-900">
            Session Complete
          </h1>

          <p className="mt-2 text-[14px] text-slate-500">
            Clean finish. Your flashcard session is saved.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Knew it</div>
              <div className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-emerald-700">
                {correct}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Missed</div>
              <div className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-red-500">
                {missed}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Accuracy</div>
              <div className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
                {scorePercent}%
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Saved / Review</div>
              <div className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
                {savedCards.length} / {reviewCards.length}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => router.push("/flashcards")}
              className="rounded-xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-5 py-3 text-[14px] font-medium text-white shadow-[0_18px_40px_-20px_rgba(59,130,246,0.45)]"
            >
              New Session
            </button>

            <button
              onClick={() => router.push("/flashcards")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-[14px] font-medium text-slate-700"
            >
              Back to Decks
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isSaved = savedCards.includes(card.id)
  const isMarkedForReview = reviewCards.includes(card.id)
  const question = buildQuestion(card.title, card.ruleType)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#fbfdff_100%)] px-4 py-5 xl:px-6">
      <div className="mx-auto grid max-w-[1450px] gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="min-w-0">
          <div className="rounded-[28px] border border-white/70 bg-white/78 px-5 py-5 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <button
                onClick={() => router.push("/flashcards")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
                Change deck
              </button>

              <div className="flex items-center gap-4 text-[13px]">
                <span className="font-medium text-emerald-600">✓ {correct}</span>
                <span className="font-medium text-red-500">✗ {missed}</span>
                <span className="text-slate-500">
                  {index + 1}/{cards.length}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                <span>Progress</span>
                <span className="font-medium text-slate-700">{Math.round(progress)}%</span>
              </div>

              <div className="h-2 rounded-full bg-slate-100">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#7c3aed)] shadow-[0_0_14px_rgba(99,102,241,0.25)]"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] text-slate-500">
                  {card.subject ? `${card.subject} • ` : ""}
                  {card.topic || "Flashcard"}
                </div>
                <div className="mt-1 text-[18px] font-medium tracking-[-0.04em] text-slate-900">
                  {card.title}
                </div>
              </div>

              <div className="flex gap-2">
                <TinyButton onClick={toggleSaveCard} tone={isSaved ? "blue" : "neutral"}>
                  <Save size={14} />
                  Save
                </TinyButton>

                <TinyButton onClick={toggleReviewCard} tone={isMarkedForReview ? "green" : "neutral"}>
                  <Eye size={14} />
                  Review
                </TinyButton>

                <TinyButton onClick={() => setReportOpen(true)} tone="red">
                  <Flag size={14} />
                  Report
                </TinyButton>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.98))] p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)]">
              {!showAnswer ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                  <div className="mb-5 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Flashcard
                  </div>

                  <div className="max-w-[760px] text-[24px] font-medium leading-[1.45] tracking-[-0.04em] text-slate-900 md:text-[31px]">
                    {question}
                  </div>

                  {card.subject && (
                    <div className="mt-4 text-[13px] text-slate-400">
                      {card.subject}
                    </div>
                  )}

                  <button
                    onClick={() => setShowAnswer(true)}
                    className="mt-8 inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3157D6,#3f67eb)] px-5 py-3 text-[14px] font-medium text-white shadow-[0_14px_28px_-18px_rgba(49,87,214,0.55)] transition hover:translate-y-[-1px]"
                  >
                    Show Answer
                  </button>

                  <div className="mt-5 text-[12px] text-slate-400">
                    Press Space to reveal
                  </div>
                </div>
              ) : (
                <div className="min-h-[340px]">
                  <div className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Rule / Answer
                  </div>

                  <div className="text-[18px] leading-[1.95] text-slate-900 md:text-[20px]">
                    {card.rule}
                  </div>

                  {card.buzzwords.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {card.buzzwords.map((word) => (
                        <span
                          key={word}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-700"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2.5">
              <TinyButton onClick={previousCard} disabled={index === 0}>
                <ArrowLeft size={14} />
                Previous
              </TinyButton>

              <TinyButton onClick={() => answer("missed")} disabled={!showAnswer} tone="red">
                <X size={14} />
                Missed
              </TinyButton>

              <TinyButton onClick={() => answer("knew")} disabled={!showAnswer} tone="green">
                <Check size={14} />
                Knew It
              </TinyButton>

              {index === cards.length - 1 ? (
                <TinyButton onClick={finishSession} disabled={!canFinish} tone="dark">
                  Finish
                </TinyButton>
              ) : (
                <TinyButton onClick={nextCard} disabled={!canGoNext} tone="dark">
                  Next
                  <ArrowRight size={14} />
                </TinyButton>
              )}
            </div>

            {!showAnswer ? (
              <div className="mt-4 text-center text-[12px] text-slate-400">
                Space = reveal answer
              </div>
            ) : (
              <div className="mt-4 text-center text-[12px] text-slate-400">
                1 = missed • 2 = knew it • ← = previous • → = next
              </div>
            )}
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-[26px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <Layers3 size={14} />
              Current Deck
            </div>

            <div className="mb-3 text-[18px] font-medium tracking-[-0.04em] text-slate-900">
              {deckType === "golden120"
                ? "Golden 120"
                : deckType === "smart_prep"
                  ? "Smart Prep"
                  : "Custom Deck"}
            </div>

            <SideRow label="Mode" value={sessionMode === "study" ? "Study" : "Quiz"} />
            <SideRow label="Total cards" value={String(cards.length)} />
            <SideRow label="Due today" value={String(cards.length)} valueClassName="text-amber-600" />
            <SideRow label="Mastered" value={String(correct)} valueClassName="text-emerald-700" />
            <SideRow
              label="Algorithm"
              value={deckType === "smart_prep" ? "Adaptive" : "Standard"}
            />
          </div>

          <div className="rounded-[26px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <BrainCircuit size={14} />
              Session Score
            </div>

            <div className="flex items-center gap-4">
              <ProgressRing knew={correct} missed={missed} total={cards.length} />

              <div className="min-w-0 flex-1">
                <SideRow label="Knew it" value={String(correct)} valueClassName="text-emerald-700" />
                <SideRow label="Missed" value={String(missed)} valueClassName="text-red-500" />
                <SideRow label="Remaining" value={String(remaining)} />
                <SideRow label="Score" value={`${scorePercent}%`} />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <Clock3 size={14} />
              Up Next
            </div>

            <div className="space-y-2.5">
              {nextPreview.length > 0 ? (
                nextPreview.map((nextCard, i) => (
                  <div
                    key={`${nextCard.id}-${i}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">#{index + i + 2}</div>
                      <div className="text-[11px] text-slate-400">
                        {nextCard.subject || "Rule"}
                      </div>
                    </div>

                    <div className="mt-1 text-[13px] font-medium text-slate-900">
                      {truncate(nextCard.title || nextCard.topic || "Card", 30)}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500">
                      {truncate(nextCard.topic || nextCard.subject || "Topic", 32)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-slate-400">No more cards in this session.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[26px] border border-white/70 bg-white p-6 shadow-2xl">
            <div className="mb-4 text-[22px] font-semibold tracking-[-0.03em] text-slate-900">
              Report Flashcard Issue
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">What is wrong?</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option>Wrong rule</option>
                <option>Typo / grammar issue</option>
                <option>Wrong buzzwords</option>
                <option>Wrong topic</option>
                <option>Duplicate card</option>
                <option>Other</option>
              </select>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-slate-700">Short note to admin</label>
              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Briefly explain the issue..."
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setReportOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={submitReport}
                disabled={reportSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {reportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
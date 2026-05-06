"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  BrainCircuit,
  Layers3,
  Wand2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Target,
  BookOpen,
  Zap,
  Filter,
  Crown,
  Rocket,
} from "lucide-react"

type Topic = {
  id: string
  name: string
  ruleCount: number
}

type Subject = {
  id: string
  name: string
  ruleCount: number
  topics: Topic[]
}

type SelectedTopics = Record<string, string[]>

type Mode = "study" | "quiz"
type DeckType = "custom" | "golden120" | "smart_prep"

type RawRule = {
  id?: string | number
  title?: string
  topic?: string | { name?: string }
  topic_name?: string
  rule_text?: string
  keywords?: string[]
  buzzwords?: string[]
  subject?: string
  subject_name?: string
  subjectId?: string
  subject_id?: string
  is_golden?: boolean
  mastery?: number
  avgScore?: number
  nextReviewAt?: string | number | null
  lastReviewedAt?: string | number | null
  hypo?: string
  example?: string
}

type SessionCard = {
  id: string
  subject: string
  topic: string
  ruleText: string
  keywords: string[]
  title: string
  isGolden?: boolean
  mastery?: number
  avgScore?: number
  nextReviewAt?: string | number | null
  lastReviewedAt?: string | number | null
  hypo?: string
  example?: string
}

type PendingSession = {
  id: string
  mode: Mode
  timed: boolean
  timePerCard: number
  cardCount: number
  random: boolean
  deckType: DeckType
  selectedSubjects: string[]
  selectedTopics: SelectedTopics
  selectedTopicNames: string[]
  smartPrep: {
    weakRulesPriority: string
    strongRulesReturn: string
    adaptiveSelection: boolean
  } | null
  cards: SessionCard[]
}

type LaunchVariant = "streams" | "wave" | "rain"

function softShuffle<T>(input: T[]) {
  const copy = [...input]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getTopicName(rule: RawRule) {
  if (typeof rule.topic === "string") return rule.topic
  if (rule.topic && typeof rule.topic === "object" && typeof rule.topic.name === "string") {
    return rule.topic.name
  }
  if (typeof rule.topic_name === "string") return rule.topic_name
  return ""
}

function getSubjectName(rule: RawRule) {
  if (typeof rule.subject === "string") return rule.subject
  if (typeof rule.subject_name === "string") return rule.subject_name
  return ""
}

function clampPositiveNumber(value: number, fallback: number, min = 1, max = 500) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

function toTimestamp(value: unknown) {
  if (!value) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const ts = new Date(value).getTime()
    return Number.isFinite(ts) ? ts : null
  }
  return null
}

function getWeaknessScore(rule: SessionCard) {
  const mastery =
    typeof rule.mastery === "number"
      ? rule.mastery
      : typeof rule.avgScore === "number"
        ? rule.avgScore
        : 50

  const nextReviewTs = toTimestamp(rule.nextReviewAt)
  const lastReviewedTs = toTimestamp(rule.lastReviewedAt)
  const now = Date.now()

  let urgency = 0

  if (nextReviewTs !== null) {
    const overdueMs = now - nextReviewTs
    if (overdueMs > 0) {
      urgency += Math.min(40, overdueMs / (1000 * 60 * 60 * 24))
    }
  } else if (lastReviewedTs !== null) {
    const ageDays = (now - lastReviewedTs) / (1000 * 60 * 60 * 24)
    urgency += Math.min(18, ageDays * 0.4)
  } else {
    urgency += 12
  }

  const weakness = 100 - mastery
  return weakness + urgency
}

function buildSmartPrepDeck(cards: SessionCard[], count: number) {
  if (cards.length === 0) return []

  const sorted = [...cards].sort((a, b) => getWeaknessScore(b) - getWeaknessScore(a))

  const weakBucket = sorted.filter((card) => {
    const mastery =
      typeof card.mastery === "number"
        ? card.mastery
        : typeof card.avgScore === "number"
          ? card.avgScore
          : 50
    return mastery < 70
  })

  const mediumBucket = sorted.filter((card) => {
    const mastery =
      typeof card.mastery === "number"
        ? card.mastery
        : typeof card.avgScore === "number"
          ? card.avgScore
          : 50
    return mastery >= 70 && mastery < 90
  })

  const strongDueBucket = sorted.filter((card) => {
    const mastery =
      typeof card.mastery === "number"
        ? card.mastery
        : typeof card.avgScore === "number"
          ? card.avgScore
          : 50
    const nextReviewTs = toTimestamp(card.nextReviewAt)
    const now = Date.now()
    return mastery >= 90 && (nextReviewTs === null || nextReviewTs <= now)
  })

  const weakTarget = Math.min(weakBucket.length, Math.ceil(count * 0.55))
  const mediumTarget = Math.min(mediumBucket.length, Math.ceil(count * 0.3))
  const strongTarget = Math.min(strongDueBucket.length, count - weakTarget - mediumTarget)

  const picked = [
    ...softShuffle(weakBucket).slice(0, weakTarget),
    ...softShuffle(mediumBucket).slice(0, mediumTarget),
    ...softShuffle(strongDueBucket).slice(0, strongTarget),
  ]

  if (picked.length < count) {
    const remaining = softShuffle(
      sorted.filter((card) => !picked.some((pickedCard) => pickedCard.id === card.id))
    )
    picked.push(...remaining.slice(0, count - picked.length))
  }

  return softShuffle(picked).slice(0, count)
}

function buildGoldenDeck(cards: SessionCard[], count: number) {
  const golden = cards.filter((card) => card.isGolden)
  if (golden.length === 0) {
    return softShuffle(cards).slice(0, count)
  }
  return softShuffle(golden).slice(0, count)
}

function buildSafeSession(
  sessionId: string,
  mode: Mode,
  timed: boolean,
  timePerCard: number,
  cardCount: number,
  random: boolean,
  deckType: DeckType,
  selectedSubjects: string[],
  selectedTopics: SelectedTopics,
  selectedTopicNames: string[],
  cards: SessionCard[]
): PendingSession {
  return {
    id: sessionId,
    mode,
    timed,
    timePerCard,
    cardCount,
    random,
    deckType,
    selectedSubjects,
    selectedTopics,
    selectedTopicNames,
    smartPrep:
      deckType === "smart_prep"
        ? {
            weakRulesPriority: "every 2-3 days",
            strongRulesReturn: "7 days after 90%+ mastery",
            adaptiveSelection: true,
          }
        : null,
    cards,
  }
}

export default function FlashcardsPage() {
  const router = useRouter()
  const launchTimeoutRef = useRef<number | null>(null)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopics>({})

  const [mode, setMode] = useState<Mode>("study")
  const [deckType, setDeckType] = useState<DeckType>("custom")
  const [random, setRandom] = useState(true)
  const [timed, setTimed] = useState(false)

  const [cardCount, setCardCount] = useState(30)
  const [timePerCard, setTimePerCard] = useState(20)

  const [loading, setLoading] = useState(true)

  const [isNight, setIsNight] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchVariant, setLaunchVariant] = useState<LaunchVariant>("streams")

  useEffect(() => {
    const hour = new Date().getHours()
    setIsNight(hour >= 19 || hour <= 5)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/flashcards/subjects")

        let data = null

        try {
          data = await res.json()
        } catch {
          console.error("API did not return JSON")
          setLoading(false)
          return
        }

        if (Array.isArray(data)) {
          setSubjects(data)
        } else if (Array.isArray(data?.subjects)) {
          setSubjects(data.subjects)
        } else if (Array.isArray(data?.data)) {
          setSubjects(data.data)
        } else {
          console.error("Subjects response not recognized", data)
        }
      } catch (err) {
        console.error("Failed to load subjects", err)
      }

      setLoading(false)
    }

    load()

    return () => {
      if (launchTimeoutRef.current) {
        window.clearTimeout(launchTimeoutRef.current)
      }
    }
  }, [])

  function toggleExpand(id: string) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleTopic(subjectId: string, topicId: string) {
    setSelectedTopics((prev) => {
      const list = prev[subjectId] || []
      const exists = list.includes(topicId)

      return {
        ...prev,
        [subjectId]: exists ? list.filter((x) => x !== topicId) : [...list, topicId],
      }
    })

    if (!selectedSubjects.includes(subjectId)) {
      setSelectedSubjects((prev) => [...prev, subjectId])
    }
  }

  const selectedTopicCount = useMemo(() => {
    return Object.values(selectedTopics).reduce((acc, arr) => acc + arr.length, 0)
  }, [selectedTopics])

  const selectedSubjectObjects = useMemo(() => {
    return subjects.filter((subject) => selectedSubjects.includes(subject.id))
  }, [subjects, selectedSubjects])

  const selectedTopicNames = useMemo(() => {
    return subjects
      .filter((subject) => selectedSubjects.includes(subject.id))
      .flatMap((subject) => {
        const chosenIds = selectedTopics[subject.id] || []
        return subject.topics
          .filter((topic) => chosenIds.includes(topic.id))
          .map((topic) => topic.name)
      })
  }, [subjects, selectedSubjects, selectedTopics])

  const displayedRulePool = useMemo(() => {
    if (deckType === "golden120") return 120

    if (selectedTopicCount > 0) {
      return selectedSubjectObjects.reduce((sum, subject) => {
        const chosenIds = selectedTopics[subject.id] || []
        return (
          sum +
          subject.topics
            .filter((topic) => chosenIds.includes(topic.id))
            .reduce((topicSum, topic) => topicSum + (topic.ruleCount || 0), 0)
        )
      }, 0)
    }

    return selectedSubjectObjects.reduce((sum, subject) => sum + (subject.ruleCount || 0), 0)
  }, [deckType, selectedSubjectObjects, selectedTopicCount, selectedTopics])

  async function buildDeck(): Promise<PendingSession | null> {
    if (deckType === "custom" && selectedSubjects.length === 0) {
      alert("Select at least one subject")
      return null
    }

    try {
      let allRules: RawRule[] = []

      if (deckType === "custom" || deckType === "smart_prep") {
        if (selectedSubjects.length === 0) {
          alert("Select at least one subject")
          return null
        }

        for (const subjectId of selectedSubjects) {
          const res = await fetch(
            `/api/get-rules-by-subject?subjectId=${encodeURIComponent(subjectId)}`
          )

          const text = await res.text()

          let data: any = null

          try {
            data = JSON.parse(text)
          } catch {
            console.error("Rules API returned non JSON:", text)
            alert("Failed to load rules")
            return null
          }

          const rules = Array.isArray(data) ? data : []
          allRules.push(...rules)
        }
      }

      if (deckType === "golden120") {
        const fetched: RawRule[] = []

        for (const subject of subjects) {
          const res = await fetch(
            `/api/get-rules-by-subject?subjectId=${encodeURIComponent(subject.id)}`
          )

          const text = await res.text()

          let data: any = null

          try {
            data = JSON.parse(text)
          } catch {
            console.error("Rules API returned non JSON:", text)
            alert("Failed to load rules")
            return null
          }

          const rules = Array.isArray(data) ? data : []
          fetched.push(...rules)
        }

        allRules = fetched
      }

      let filteredRules = allRules

      if (deckType === "custom" && selectedTopicNames.length > 0) {
        filteredRules = allRules.filter((rule) => {
          const topicName = getTopicName(rule)
          return selectedTopicNames.includes(topicName)
        })
      }

      if (filteredRules.length === 0) {
        filteredRules = allRules
      }

      const mappedCards: SessionCard[] = filteredRules.map((rule) => ({
        id: String(rule.id ?? crypto.randomUUID()),
        subject: getSubjectName(rule),
        topic: getTopicName(rule),
        ruleText: typeof rule.rule_text === "string" ? rule.rule_text : "",
        keywords: Array.isArray(rule.keywords)
          ? rule.keywords
          : Array.isArray(rule.buzzwords)
            ? rule.buzzwords
            : [],
        title: typeof rule.title === "string" ? rule.title : "Rule",
        isGolden: !!rule.is_golden,
        mastery:
          typeof rule.mastery === "number"
            ? rule.mastery
            : typeof rule.avgScore === "number"
              ? rule.avgScore
              : undefined,
        avgScore: typeof rule.avgScore === "number" ? rule.avgScore : undefined,
        nextReviewAt: rule.nextReviewAt ?? null,
        lastReviewedAt: rule.lastReviewedAt ?? null,
        hypo: typeof rule.hypo === "string" ? rule.hypo : undefined,
        example: typeof rule.example === "string" ? rule.example : undefined,
      }))

      let deck = mappedCards.filter((card) => card.ruleText)

      if (deck.length === 0 && mappedCards.length > 0) {
        deck = mappedCards
      }

      if (deck.length === 0) {
        alert("No rules found for selected deck")
        return null
      }

      if (deckType === "golden120") {
        deck = buildGoldenDeck(deck, clampPositiveNumber(cardCount, 30, 1, 120))
      } else if (deckType === "smart_prep") {
        deck = buildSmartPrepDeck(deck, clampPositiveNumber(cardCount, 30, 1, 200))
      } else {
        if (random) {
          deck = softShuffle(deck)
        }
        deck = deck.slice(0, clampPositiveNumber(cardCount, 30, 1, 200))
      }

      const sessionId = crypto.randomUUID()

      return buildSafeSession(
        sessionId,
        mode,
        timed,
        timePerCard,
        cardCount,
        random,
        deckType,
        selectedSubjects,
        selectedTopics,
        selectedTopicNames,
        deck
      )
    } catch (err) {
      console.error("Session request error", err)
      alert("Failed to start session")
      return null
    }
  }

  async function start() {
    const session = await buildDeck()
    if (!session) return

    sessionStorage.setItem(`flashcard-session-${session.id}`, JSON.stringify(session))

    if (deckType === "golden120") {
      const variants: LaunchVariant[] = ["streams", "wave", "rain"]
      setLaunchVariant(variants[Math.floor(Math.random() * variants.length)])
      setLaunching(true)

      launchTimeoutRef.current = window.setTimeout(() => {
        router.push(`/flashcards/session/${session.id}`)
      }, 5000)

      return
    }

    router.push(`/flashcards/session/${session.id}`)
  }

  return (
    <>
      <style jsx global>{`
        @keyframes starFloat {
          0% { transform: translateY(0px) scale(1); opacity: 0.25; }
          50% { transform: translateY(-8px) scale(1.06); opacity: 0.85; }
          100% { transform: translateY(0px) scale(1); opacity: 0.25; }
        }

        @keyframes glowSweep {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 0.75; }
          100% { transform: translateX(220%); opacity: 0; }
        }

        @keyframes liquidGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulseSoft {
          0% { transform: scale(0.985); opacity: 0.45; }
          50% { transform: scale(1.015); opacity: 0.95; }
          100% { transform: scale(0.985); opacity: 0.45; }
        }

        @keyframes overlayLift {
          0% { transform: translateY(18px); opacity: 0; }
          16% { transform: translateY(0px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 1; }
        }

        @keyframes streamRise {
          0% { transform: translateY(36px) scaleY(0.9); opacity: 0; }
          10% { opacity: 0.85; }
          50% { transform: translateY(-4px) scaleY(1.02); opacity: 1; }
          100% { transform: translateY(-40px) scaleY(1.12); opacity: 0.08; }
        }

        @keyframes streamPulse {
          0% { opacity: 0.28; filter: blur(0px) brightness(0.9); }
          50% { opacity: 1; filter: blur(1px) brightness(1.2); }
          100% { opacity: 0.28; filter: blur(0px) brightness(0.9); }
        }

        @keyframes ribbonFlow {
          0% { transform: translateX(-4%) translateY(0px) scale(1); }
          50% { transform: translateX(4%) translateY(-8px) scale(1.02); }
          100% { transform: translateX(-4%) translateY(0px) scale(1); }
        }

        @keyframes ribbonBreath {
          0% { opacity: 0.45; }
          50% { opacity: 1; }
          100% { opacity: 0.45; }
        }

        @keyframes neonRain {
          0% { transform: translateY(-10%) scaleY(0.86); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(108%) scaleY(1.06); opacity: 0; }
        }

        @keyframes particleFloat {
          0% { transform: translateY(18px) scale(0.4); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translateY(-110px) scale(1.08); opacity: 0; }
        }
      `}</style>

      <div
        className={`min-h-screen ${
          isNight
            ? "bg-[radial-gradient(circle_at_top_left,rgba(46,92,255,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.14),transparent_18%),linear-gradient(180deg,#f4f8ff_0%,#fbfdff_28%,#ffffff_100%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_18%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#fcfdff_100%)]"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-4 py-4 xl:px-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0 space-y-4">
              <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/68 px-5 py-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl md:px-6 md:py-6">
                <div
                  className={`absolute inset-0 ${
                    isNight
                      ? "bg-[radial-gradient(circle_at_top_center,rgba(24,39,93,0.78),rgba(84,104,184,0.10)_32%,rgba(255,255,255,0.00)_62%)]"
                      : "bg-[radial-gradient(circle_at_top_center,rgba(88,108,184,0.18),rgba(180,191,255,0.08)_32%,rgba(255,255,255,0.00)_62%)]"
                  }`}
                />

                {isNight && (
                  <>
                    {Array.from({ length: 16 }).map((_, index) => (
                      <span
                        key={index}
                        className="absolute rounded-full bg-white/85"
                        style={{
                          width: 2 + (index % 2),
                          height: 2 + (index % 2),
                          left: `${6 + ((index * 6.2) % 86)}%`,
                          top: `${9 + ((index * 5.4) % 20)}%`,
                          boxShadow:
                            index % 2 === 0
                              ? "0 0 10px rgba(255,255,255,0.8), 0 0 18px rgba(96,165,250,0.28)"
                              : "0 0 10px rgba(255,255,255,0.7), 0 0 18px rgba(167,139,250,0.24)",
                          animation: `starFloat ${3 + (index % 3)}s ease-in-out infinite`,
                          animationDelay: `${index * 0.16}s`,
                        }}
                      />
                    ))}
                    <div className="absolute right-[8%] top-[10%] h-14 w-14 rounded-full bg-white/80 blur-[2px]" />
                    <div className="absolute right-[8%] top-[10%] h-14 w-14 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.94),rgba(255,255,255,0.45)_48%,transparent_72%)]" />
                  </>
                )}

                <div className="relative">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-[10px] font-medium tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-md">
                    <Sparkles size={12} className="text-violet-600" />
                    FLASHCARD LAB
                  </div>

                  <h1 className="max-w-[760px] text-[22px] font-medium tracking-[-0.05em] text-slate-950 md:text-[30px]">
                    Build a premium flashcard deck
                  </h1>

                  <p className="mt-3 max-w-[860px] text-[13px] leading-7 text-slate-600 md:text-[14px]">
                    Train black letter law with a cleaner compact layout, adaptive Smart Prep,
                    and a premium Golden 120 launch mode.
                  </p>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                <DeckSwitch
                  active={deckType === "custom"}
                  title="Custom Deck"
                  subtitle="Subjects and topics you choose"
                  icon={<Layers3 size={16} />}
                  accent="blue"
                  onClick={() => setDeckType("custom")}
                />
                <DeckSwitch
                  active={deckType === "golden120"}
                  title="Golden 120"
                  subtitle="Most tested high yield rules"
                  icon={<ShieldCheck size={16} />}
                  accent="gold"
                  onClick={() => setDeckType("golden120")}
                />
                <DeckSwitch
                  active={deckType === "smart_prep"}
                  title="Smart Prep"
                  subtitle="Adaptive spaced recall engine"
                  icon={<BrainCircuit size={16} />}
                  accent="green"
                  onClick={() => setDeckType("smart_prep")}
                />
              </section>

              {deckType === "custom" || deckType === "smart_prep" ? (
                <>
                  {loading ? (
                    <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 text-[13px] text-slate-500 shadow-sm backdrop-blur-md">
                      Loading subjects...
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-[13px] text-red-700 shadow-sm">
                      Subjects failed to load from API
                    </div>
                  ) : (
                    <section className="rounded-[30px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_22px_52px_-34px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Subject Builder
                          </div>
                          <div className="mt-2 text-[18px] font-medium tracking-[-0.04em] text-slate-950">
                            Choose what goes into your deck
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 text-[12px] text-slate-500">
                          <Wand2 size={13} className="text-violet-600" />
                          Keep it focused.
                        </div>
                      </div>

                      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                        {subjects.map((subject) => {
                          const isExpanded = expanded.includes(subject.id)
                          const isSelected = selectedSubjects.includes(subject.id)
                          const topicIds = selectedTopics[subject.id] || []

                          return (
                            <SubjectLine
                              key={subject.id}
                              subject={subject}
                              expanded={isExpanded}
                              selected={isSelected}
                              topicIds={topicIds}
                              onToggleSubject={() => toggleSubject(subject.id)}
                              onToggleExpand={() => toggleExpand(subject.id)}
                              onToggleTopic={(topicId) => toggleTopic(subject.id, topicId)}
                            />
                          )
                        })}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="rounded-[28px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.96),rgba(254,249,195,0.82))] px-5 py-5 shadow-[0_18px_40px_-28px_rgba(245,158,11,0.18)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      <Crown size={18} />
                    </div>

                    <div>
                      <div className="text-[16px] font-medium tracking-[-0.03em] text-slate-900">
                        Golden 120 selected
                      </div>
                      <div className="mt-1 text-[13px] leading-7 text-slate-600">
                        Premium high yield mode. When you flag Golden 120 rules in the database,
                        this deck will pull them automatically.
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-[30px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_22px_52px_-34px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Filter size={17} />
                  </div>

                  <div>
                    <div className="text-[18px] font-medium tracking-[-0.04em] text-slate-950">
                      Training settings
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      Compact and clean.
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    <SettingGroup label="Mode">
                      <div className="flex flex-wrap gap-2">
                        <MiniToggle
                          active={mode === "study"}
                          onClick={() => setMode("study")}
                          activeClass="bg-blue-600 text-white shadow-[0_10px_18px_rgba(59,130,246,0.20)]"
                        >
                          Study
                        </MiniToggle>
                        <MiniToggle
                          active={mode === "quiz"}
                          onClick={() => setMode("quiz")}
                          activeClass="bg-blue-600 text-white shadow-[0_10px_18px_rgba(59,130,246,0.20)]"
                        >
                          Quiz
                        </MiniToggle>
                      </div>
                    </SettingGroup>

                    <SettingGroup label="Behavior">
                      <div className="flex flex-wrap gap-5 text-[13px] text-slate-700">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={random}
                            onChange={() => setRandom(!random)}
                            className="h-4 w-4 rounded border-slate-300"
                            disabled={deckType === "smart_prep"}
                          />
                          Random
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={timed}
                            onChange={() => setTimed(!timed)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Timed
                        </label>
                      </div>

                      {deckType === "smart_prep" && (
                        <div className="pt-1 text-[12px] text-emerald-600">
                          Smart Prep controls ordering automatically.
                        </div>
                      )}
                    </SettingGroup>

                    {deckType === "smart_prep" && (
                      <div className="text-[12px] leading-6 text-slate-600">
                        Weak rules return more often around every 2 to 3 days. Strong rules above
                        90 percent can return about 1 week later.
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <SettingGroup label="Cards">
                      <div className="flex flex-wrap items-center gap-2">
                        {[10, 20, 30, 50].map((n) => (
                          <MiniToggle
                            key={n}
                            active={cardCount === n}
                            onClick={() => setCardCount(n)}
                            activeClass="bg-violet-600 text-white shadow-[0_10px_18px_rgba(124,58,237,0.18)]"
                          >
                            {n}
                          </MiniToggle>
                        ))}

                        <input
                          type="number"
                          min={1}
                          max={deckType === "golden120" ? 120 : 500}
                          value={cardCount}
                          onChange={(e) =>
                            setCardCount(
                              clampPositiveNumber(
                                Number(e.target.value),
                                30,
                                1,
                                deckType === "golden120" ? 120 : 500
                              )
                            )
                          }
                          className="w-24 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-300"
                        />
                      </div>
                    </SettingGroup>

                    {timed && (
                      <SettingGroup label="Time per card">
                        <div className="flex flex-wrap items-center gap-2">
                          {[10, 20, 30, 45, 60].map((sec) => (
                            <MiniToggle
                              key={sec}
                              active={timePerCard === sec}
                              onClick={() => setTimePerCard(sec)}
                              activeClass="bg-blue-600 text-white shadow-[0_10px_18px_rgba(59,130,246,0.20)]"
                            >
                              {sec}s
                            </MiniToggle>
                          ))}

                          <input
                            type="number"
                            min={1}
                            value={timePerCard}
                            onChange={(e) =>
                              setTimePerCard(clampPositiveNumber(Number(e.target.value), 20, 1, 600))
                            }
                            className="w-24 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-300"
                          />
                        </div>
                      </SettingGroup>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-[12px] leading-6 text-slate-500">
                  {deckType === "golden120"
                    ? "Golden 120 can be a premium subscription mode."
                    : deckType === "smart_prep"
                      ? "Smart Prep adapts using weak rules, timing, and mastery."
                      : "Custom Deck gives full control over subjects and topics."}
                </div>

                {deckType === "golden120" ? (
                  <button
                    type="button"
                    onClick={start}
                    className="group relative isolate overflow-hidden rounded-full px-6 py-3 text-[14px] font-medium tracking-[0.01em] text-white shadow-[0_18px_40px_-18px_rgba(245,158,11,0.48)] transition hover:translate-y-[-1px]"
                    style={{
                      background:
                        "linear-gradient(120deg, #f59e0b 0%, #facc15 18%, #f59e0b 36%, #fef3c7 52%, #f59e0b 68%, #d97706 100%)",
                      backgroundSize: "240% 240%",
                      animation: "liquidGlow 4.2s ease-in-out infinite",
                    }}
                  >
                    <span
                      className="absolute inset-[-2px] rounded-full opacity-75"
                      style={{
                        border: "1px solid rgba(251,191,36,0.55)",
                        animation: "pulseSoft 2.2s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="absolute inset-y-0 left-[-25%] w-[28%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)] blur-[2px]"
                      style={{ animation: "glowSweep 2.8s linear infinite" }}
                    />
                    <span className="relative inline-flex items-center gap-2">
                      <Rocket size={16} />
                      Launch Golden 120
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={start}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#3157D6,#6D5BFF)] px-6 py-3 text-[14px] font-medium text-white shadow-[0_16px_34px_-18px_rgba(59,130,246,0.42)] transition hover:translate-y-[-1px]"
                  >
                    Start flashcard session
                    <BookOpen size={16} />
                  </button>
                )}
              </div>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-5">
                <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/82 px-4 py-4 shadow-[0_22px_52px_-34px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <Sparkles size={12} className="text-violet-600" />
                    Session bookmark
                  </div>

                  <div className="space-y-3">
                    <BookmarkItem label="Deck" value={deckType === "golden120" ? "Golden 120" : deckType === "smart_prep" ? "Smart Prep" : "Custom"} />
                    <BookmarkItem label="Mode" value={mode === "study" ? "Study" : "Quiz"} />
                    <BookmarkItem label="Cards" value={String(cardCount)} />
                    <BookmarkItem label="Pool" value={displayedRulePool > 0 ? String(displayedRulePool) : "Pending"} />
                    <BookmarkItem label="Timed" value={timed ? `${timePerCard}s` : "No"} />
                    <BookmarkItem label="Subjects" value={deckType === "golden120" ? "All" : String(selectedSubjects.length)} />
                    <BookmarkItem label="Topics" value={deckType === "golden120" ? "Auto" : String(selectedTopicCount)} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {launching && deckType === "golden120" && (
        <GoldenLaunchOverlay variant={launchVariant} />
      )}
    </>
  )
}

function DeckSwitch({
  active,
  title,
  subtitle,
  icon,
  accent,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  icon: ReactNode
  accent: "blue" | "gold" | "green"
  onClick: () => void
}) {
  const activeClass =
    accent === "gold"
      ? "border-amber-200 text-amber-900 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,0.92),rgba(254,249,195,0.80))]"
      : accent === "green"
        ? "border-emerald-200 text-emerald-900 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,0.92),rgba(240,253,250,0.82))]"
        : "border-blue-200 text-blue-900 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.92),rgba(245,243,255,0.82))]"

  const iconClass =
    accent === "gold"
      ? "text-amber-700"
      : accent === "green"
        ? "text-emerald-700"
        : "text-blue-700"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? `${activeClass} shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)]`
          : "border-white/70 bg-white/80 text-slate-900 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] hover:border-slate-200"
      }`}
    >
      <div className={`mb-2 ${iconClass}`}>{icon}</div>
      <div className="text-[16px] font-medium tracking-[-0.03em]">{title}</div>
      <div className="mt-1 text-[12px] text-slate-500">{subtitle}</div>
    </button>
  )
}

function SubjectLine({
  subject,
  expanded,
  selected,
  topicIds,
  onToggleSubject,
  onToggleExpand,
  onToggleTopic,
}: {
  subject: Subject
  expanded: boolean
  selected: boolean
  topicIds: string[]
  onToggleSubject: () => void
  onToggleExpand: () => void
  onToggleTopic: (topicId: string) => void
}) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggleSubject} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                selected
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-300 bg-white text-transparent"
              }`}
            >
              <CheckCircle2 size={12} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-[16px] font-medium tracking-[-0.03em] text-slate-950">
                {subject.name}
              </div>
              <div className="mt-1 text-[12px] text-slate-400">{subject.ruleCount} rules</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-blue-600"
        >
          Topics
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pl-8">
          {subject.topics.length === 0 ? (
            <div className="text-[12px] text-slate-400">No topics</div>
          ) : (
            subject.topics.map((topic) => {
              const isSelected = topicIds.includes(topic.id)

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onToggleTopic(topic.id)}
                  className={`text-left text-[12px] transition ${
                    isSelected ? "text-blue-700" : "text-slate-500 hover:text-blue-600"
                  }`}
                >
                  {topic.name}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function SettingGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      {children}
    </div>
  )
}

function MiniToggle({
  active,
  onClick,
  children,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
        active
          ? activeClass
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  )
}

function BookmarkItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-[12px] last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}

function GoldenLaunchOverlay({
  variant,
}: {
  variant: LaunchVariant
}) {
  const particles = Array.from({ length: 22 }).map((_, i) => {
    const color =
      i % 4 === 0
        ? "rgba(96,165,250,0.95)"
        : i % 4 === 1
          ? "rgba(217,70,239,0.95)"
          : i % 4 === 2
            ? "rgba(255,255,255,0.92)"
            : "rgba(236,72,153,0.95)"

    return (
      <span
        key={i}
        className="absolute rounded-full"
        style={{
          width: 3 + (i % 3),
          height: 3 + (i % 3),
          left: `${8 + ((i * 11) % 84)}%`,
          bottom: `${10 + ((i * 7) % 18)}%`,
          background: color,
          boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
          animation: `particleFloat ${1.8 + (i % 4) * 0.45}s ease-out infinite`,
          animationDelay: `${i * 0.1}s`,
          opacity: 0,
        }}
      />
    )
  })

  return (
    <div className="fixed inset-0 z-[2000] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(33,8,84,0.96),rgba(7,10,26,0.98)_38%,rgba(2,4,14,1)_100%)]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px, 120px 120px",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_18%),radial-gradient(circle_at_center,rgba(217,70,239,0.16),transparent_26%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.12),transparent_30%)]" />

      {particles}

      <div className="relative flex h-full items-center justify-center px-6">
        <div className="w-full max-w-[980px] text-center" style={{ animation: "overlayLift 5s ease both" }}>
          <div className="mx-auto mb-8 flex items-center justify-center">
            {variant === "streams" && <NeonStreams />}
            {variant === "wave" && <NeonWave />}
            {variant === "rain" && <NeonRain />}
          </div>

          <div className="mx-auto max-w-[760px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium tracking-[0.16em] text-blue-100/80 backdrop-blur-md">
              <Zap size={14} />
              GOLDEN 120
            </div>

            <div className="text-[30px] font-medium tracking-[-0.04em] text-white md:text-[42px]">
              Launching Golden 120
            </div>

            <div className="mt-3 text-[14px] leading-7 text-blue-100/82 md:text-[15px]">
              Initializing premium session
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NeonStreams() {
  const lines = Array.from({ length: 26 }).map((_, i) => {
    const left = 4 + i * 3.7
    const width = i % 5 === 0 ? 8 : i % 3 === 0 ? 5 : 3
    const delay = i * 0.08
    const duration = 2.8 + (i % 4) * 0.45

    const color =
      i % 4 === 0
        ? "rgba(56,189,248,0.95)"
        : i % 4 === 1
          ? "rgba(168,85,247,0.95)"
          : i % 4 === 2
            ? "rgba(236,72,153,0.95)"
            : "rgba(255,255,255,0.92)"

    const glow =
      i % 4 === 0
        ? "0 0 18px rgba(56,189,248,0.8), 0 0 36px rgba(56,189,248,0.35)"
        : i % 4 === 1
          ? "0 0 18px rgba(168,85,247,0.8), 0 0 36px rgba(168,85,247,0.35)"
          : i % 4 === 2
            ? "0 0 18px rgba(236,72,153,0.8), 0 0 36px rgba(236,72,153,0.35)"
            : "0 0 18px rgba(255,255,255,0.75), 0 0 36px rgba(147,197,253,0.25)"

    return (
      <div
        key={i}
        className="absolute"
        style={{
          left: `${left}%`,
          top: i % 2 === 0 ? "4%" : "10%",
          width,
          height: `${45 + (i % 6) * 9}%`,
          borderRadius: 999,
          background: `linear-gradient(180deg, transparent 0%, ${color} 18%, ${color} 76%, transparent 100%)`,
          boxShadow: glow,
          animation: `streamRise ${duration}s ease-in-out infinite, streamPulse ${2.4 + (i % 3) * 0.4}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          filter: "blur(0.3px)",
        }}
      />
    )
  })

  const floorLines = Array.from({ length: 18 }).map((_, i) => {
    const left = -8 + i * 7
    const rotate = -24 + i * 2.8

    const color =
      i % 3 === 0
        ? "rgba(217,70,239,0.9)"
        : i % 3 === 1
          ? "rgba(59,130,246,0.9)"
          : "rgba(255,255,255,0.9)"

    return (
      <div
        key={`floor-${i}`}
        className="absolute bottom-[-8%]"
        style={{
          left: `${left}%`,
          width: "22%",
          height: 6,
          borderRadius: 999,
          transform: `rotate(${rotate}deg)`,
          background: `linear-gradient(90deg, transparent 0%, ${color} 30%, ${color} 70%, transparent 100%)`,
          boxShadow: `0 0 16px ${color}`,
          opacity: 0.9,
        }}
      />
    )
  })

  return (
    <div className="relative h-[280px] w-[540px] overflow-hidden">
      {lines}
      {floorLines}
    </div>
  )
}

function NeonWave() {
  const ribbons = Array.from({ length: 7 }).map((_, i) => {
    const top = 54 + i * 10
    const delay = i * 0.16
    const duration = 3.2 + i * 0.12

    const color =
      i % 3 === 0
        ? "rgba(244,114,182,0.95)"
        : i % 3 === 1
          ? "rgba(168,85,247,0.95)"
          : "rgba(96,165,250,0.95)"

    return (
      <div
        key={i}
        className="absolute left-[7%] right-[7%]"
        style={{
          top: `${top}px`,
          height: 4 + (i % 2),
          borderRadius: 999,
          background: `linear-gradient(90deg, rgba(255,255,255,0.0) 0%, ${color} 12%, rgba(255,255,255,0.98) 50%, ${color} 88%, rgba(255,255,255,0.0) 100%)`,
          boxShadow: `0 0 18px ${color}, 0 0 34px ${color}`,
          clipPath: "path('M 0 26 C 90 0, 180 0, 270 26 S 450 52, 540 26')",
          animation: `ribbonFlow ${duration}s ease-in-out infinite, ribbonBreath 2.2s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    )
  })

  return (
    <div className="relative h-[280px] w-[540px] overflow-hidden">
      <div className="absolute inset-0">{ribbons}</div>
    </div>
  )
}

function NeonRain() {
  const drops = Array.from({ length: 36 }).map((_, i) => {
    const left = 3 + i * 2.6
    const width = i % 4 === 0 ? 5 : i % 3 === 0 ? 3 : 2
    const delay = i * 0.07
    const duration = 1.6 + (i % 4) * 0.24

    const color =
      i % 3 === 0
        ? "rgba(59,130,246,0.92)"
        : i % 3 === 1
          ? "rgba(217,70,239,0.92)"
          : "rgba(255,255,255,0.9)"

    return (
      <div
        key={i}
        className="absolute top-[-14%]"
        style={{
          left: `${left}%`,
          width,
          height: `${34 + (i % 6) * 9}%`,
          borderRadius: 999,
          background: `linear-gradient(180deg, transparent 0%, ${color} 18%, ${color} 84%, transparent 100%)`,
          boxShadow: `0 0 14px ${color}, 0 0 30px ${color}`,
          animation: `neonRain ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          opacity: 0,
        }}
      />
    )
  })

  return (
    <div className="relative h-[280px] w-[540px] overflow-hidden">
      {drops}
    </div>
  )
}
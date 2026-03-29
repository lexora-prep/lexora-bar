"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Sparkles,
  BookOpen,
  TimerReset,
  Target,
  BrainCircuit,
  Layers3,
  SlidersHorizontal,
  ListChecks,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import ModeSwitcher from "./components/ModeSwitcher"
import TypingMode from "./components/TypingMode"
import FillBlankMode from "./components/FillBlankMode"
import BuzzwordsMode from "./components/BuzzwordsMode"
import OrderingMode from "./components/OrderingMode"
import FlashcardMode from "./components/FlashcardMode"

type Subject = {
  id: string
  name: string
  total_rules?: number
  completed_rules?: number
  weak_rules?: number
}

type Rule = {
  id: string
  title: string
  rule_text?: string
  keywords?: string[]
  topic?: string
  subtopic?: string
  topic_id?: string
  subtopic_id?: string
  subject?: string
  subject_id?: string
  avgScore?: number
}

type ResultShape = {
  score?: number
  keywordScore?: number
  similarity?: number
  matched_keywords?: string[]
  missed_keywords?: string[]
}

type SessionQuestionStyle = "prompt" | "recite" | "mixed"
type SessionOrder = "random" | "sequential" | "weakest"
type SessionFilter = "all" | "weak" | "untrained" | "mastered"
type SessionType = "study" | "quiz" | "timed" | "weak_focus"

const MBE_SUBJECTS = new Set([
  "Civil Procedure",
  "Constitutional Law",
  "Contracts",
  "Criminal Law and Procedure",
  "Evidence",
  "Real Property",
  "Torts",
])

function getSubjectGroup(name: string): "MBE" | "MEE" {
  return MBE_SUBJECTS.has(name) ? "MBE" : "MEE"
}

function getSubjectBarColorClass(name: string): string {
  switch (name) {
    case "Contracts":
      return "bg-indigo-500"
    case "Torts":
      return "bg-violet-500"
    case "Evidence":
      return "bg-sky-500"
    case "Civil Procedure":
      return "bg-emerald-500"
    case "Criminal Law and Procedure":
      return "bg-rose-500"
    case "Real Property":
      return "bg-amber-500"
    case "Constitutional Law":
      return "bg-purple-500"
    case "Business Associations":
      return "bg-blue-500"
    case "Family Law":
      return "bg-pink-500"
    case "Secured Transactions":
      return "bg-orange-500"
    case "Trusts":
      return "bg-teal-500"
    case "Wills":
      return "bg-yellow-700"
    default:
      return "bg-blue-500"
  }
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function clampSessionSize(value: number) {
  if (!Number.isFinite(value)) return 10
  return Math.max(1, Math.min(200, Math.round(value)))
}

function getSessionTypeMeta(sessionType: SessionType | null) {
  switch (sessionType) {
    case "study":
      return {
        label: "Study Session",
        icon: <BookOpen size={16} />,
        accent: "blue" as const,
      }
    case "quiz":
      return {
        label: "Quiz Session",
        icon: <BrainCircuit size={16} />,
        accent: "violet" as const,
      }
    case "timed":
      return {
        label: "Timed Session",
        icon: <TimerReset size={16} />,
        accent: "blue" as const,
      }
    case "weak_focus":
      return {
        label: "Weak Focus",
        icon: <Target size={16} />,
        accent: "green" as const,
      }
    default:
      return {
        label: "Session",
        icon: <Layers3 size={16} />,
        accent: "neutral" as const,
      }
  }
}

function getAccentClasses(accent: "blue" | "violet" | "green" | "neutral") {
  if (accent === "blue") {
    return {
      pill: "border-blue-200 bg-blue-50 text-blue-700",
      soft: "from-blue-50 to-white",
      glow: "shadow-[0_10px_24px_rgba(59,130,246,0.12)]",
    }
  }

  if (accent === "violet") {
    return {
      pill: "border-violet-200 bg-violet-50 text-violet-700",
      soft: "from-violet-50 to-white",
      glow: "shadow-[0_10px_24px_rgba(139,92,246,0.12)]",
    }
  }

  if (accent === "green") {
    return {
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
      soft: "from-emerald-50 to-white",
      glow: "shadow-[0_10px_24px_rgba(16,185,129,0.12)]",
    }
  }

  return {
    pill: "border-slate-200 bg-white text-slate-700",
    soft: "from-white to-slate-50",
    glow: "shadow-sm",
  }
}

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [modeSwitchRequest, setModeSwitchRequest] = useState<SessionType | null>(null)

  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const [rules, setRules] = useState<Rule[]>([])
  const [allRules, setAllRules] = useState<Rule[]>([])
  const [trainingQueue, setTrainingQueue] = useState<number[]>([])
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null)

  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now())
  const [answer, setAnswer] = useState<string>("")
  const [result, setResult] = useState<ResultShape | null>(null)

  const [mode, setMode] = useState("typing")
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [trainingMode, setTrainingMode] = useState<SessionType>("study")

  const [mbeOpen, setMbeOpen] = useState(true)
  const [meeOpen, setMeeOpen] = useState(true)
  const [attempts, setAttempts] = useState<number[]>([])
  const [weakRules, setWeakRules] = useState<string[]>([])
  const [ruleDifficulty, setRuleDifficulty] = useState<Record<string, number>>({})
  const [ruleMastery, setRuleMastery] = useState<Record<string, number>>({})
  const [ruleSchedule, setRuleSchedule] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [quizConfig, setQuizConfig] = useState({
    size: 10,
    customSize: "10",
    timed: false,
    timePerQuestion: 60,
    subjectIds: [] as string[],
    weakOnly: false,
    order: "sequential" as SessionOrder,
    ruleFilter: "all" as SessionFilter,
    questionStyle: "prompt" as SessionQuestionStyle,
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          setAuthReady(true)
          router.push("/login")
          return
        }

        setCurrentUserId(user.id)
        setAuthReady(true)
      } catch (err) {
        console.error("RULE TRAINING USER LOAD ERROR:", err)
        setAuthReady(true)
      }
    }

    loadUser()
  }, [router, supabase])

  function buildTrainingQueue(
    inputRules: Rule[],
    limit: number = 10,
    weakRuleIds: string[] = [],
    order: SessionOrder = "sequential"
  ) {
    const indexed = inputRules.map((rule, index) => ({
      rule,
      index,
      score: ruleDifficulty[rule.id] ?? rule.avgScore ?? 0,
      isWeak: weakRuleIds.includes(rule.id),
    }))

    if (order === "sequential") {
      return indexed.slice(0, limit).map((item) => item.index)
    }

    if (order === "weakest") {
      return indexed
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((item) => item.index)
    }

    const weakIndexes: number[] = []
    const strongIndexes: number[] = []

    indexed.forEach((item) => {
      if (item.isWeak) weakIndexes.push(item.index)
      else strongIndexes.push(item.index)
    })

    const shuffledWeak = shuffleArray(weakIndexes)
    const shuffledStrong = shuffleArray(strongIndexes)

    const weakCount = Math.min(shuffledWeak.length, Math.floor(limit * 0.7))
    const strongCount = Math.min(shuffledStrong.length, limit - weakCount)

    const mixed: number[] = []
    mixed.push(...shuffledWeak.slice(0, weakCount))
    mixed.push(...shuffledStrong.slice(0, strongCount))

    if (mixed.length < limit) {
      const remaining = shuffleArray([...shuffledWeak, ...shuffledStrong])
      for (let i = 0; i < remaining.length && mixed.length < limit; i++) {
        if (!mixed.includes(remaining[i])) mixed.push(remaining[i])
      }
    }

    return shuffleArray(mixed)
  }

  function resetAnswerState() {
    setAnswer("")
    setResult(null)
    setAttempts([])
    setAnswerStartTime(Date.now())
  }

  function handleTryAgain() {
    resetAnswerState()
  }

  function changeTrainingMode(newMode: SessionType) {
    if (newMode === trainingMode) return
    setModeSwitchRequest(newMode)
  }

  function confirmModeSwitch() {
    if (!modeSwitchRequest) return

    setTrainingMode(modeSwitchRequest)
    setSelectedSessionType(modeSwitchRequest)
    setSessionStarted(false)
    setMode("typing")
    resetAnswerState()
    setModeSwitchRequest(null)
  }

  function cancelModeSwitch() {
    setModeSwitchRequest(null)
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const selectedRule =
    selectedRuleIndex !== null ? rules[selectedRuleIndex] : null

  async function startStudySession(selectedMode: string) {
    if (studySessionId || !currentUserId) return

    try {
      const res = await fetch("/api/study-session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          mode: selectedMode,
        }),
      })

      const data = await res.json()

      if (data.sessionId) {
        setStudySessionId(data.sessionId)
      }
    } catch (err) {
      console.error("Session start failed", err)
    }
  }

  async function onPickSubject(subject: Subject) {
    setSelectedSubjectId(subject.id)
    startStudySession(mode)
    setSelectedRuleIndex(null)
    resetAnswerState()

    const res = await fetch(
      `/api/get-rules-by-subject?subjectId=${subject.id}`,
      { cache: "no-store" }
    )
    const data = await res.json()

    if (!Array.isArray(data)) {
      alert("Failed to load rules")
      setRules([])
      return
    }

    const normalizedRules: Rule[] = data.map((rule: any, index: number) => ({
      id: String(rule.id),
      title: rule.title ?? `Rule ${index + 1}`,
      rule_text: rule.rule_text ?? "",
      keywords: Array.isArray(rule.keywords)
        ? rule.keywords
        : Array.isArray(rule.buzzwords)
          ? rule.buzzwords
          : [],
      topic: rule.topic ?? "",
      subtopic: rule.subtopic ?? "",
      topic_id: rule.topic_id ?? "",
      subtopic_id: rule.subtopic_id ?? "",
      subject_id: subject.id,
      subject: subject.name,
      avgScore: typeof rule.avgScore === "number" ? rule.avgScore : 0,
    }))

    setRules(normalizedRules)
    setAnswer("")

    const weakId = searchParams.get("weak")
    if (weakId) {
      const index = normalizedRules.findIndex((r) => r.id === weakId)
      if (index !== -1) {
        setSelectedRuleIndex(index)
        setTrainingMode("weak_focus")
        setSelectedSessionType("weak_focus")
        setAnswerStartTime(Date.now())
        return
      }
    }

    if (normalizedRules.length > 0) {
      const initialQueue = buildTrainingQueue(
        normalizedRules,
        quizConfig.size,
        weakRules,
        quizConfig.order
      )

      setTrainingQueue(initialQueue)
      setSelectedRuleIndex(initialQueue[0] ?? null)
      setAnswerStartTime(Date.now())
    } else {
      setTrainingQueue([])
      setSelectedRuleIndex(null)
    }
  }

  useEffect(() => {
    if (!currentUserId) return

    async function loadWeakRules() {
      try {
        const res = await fetch(`/api/rules/weak-focus?userId=${currentUserId}&limit=100`)
        const data = await res.json()

        if (Array.isArray(data?.rules)) {
          setWeakRules(data.rules.map((r: any) => r.ruleId))
        }
      } catch (err) {
        console.error("Failed to load weak rules", err)
      }
    }

    async function loadAllRules() {
      try {
        const res = await fetch("/api/get-all-rules", { cache: "no-store" })
        const data = await res.json()

        if (Array.isArray(data)) {
          setAllRules(data)
        }
      } catch (err) {
        console.error("Failed to load all rules", err)
      }
    }

    async function loadSubjects() {
      const res = await fetch(`/api/get-subjects?userId=${currentUserId}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!Array.isArray(data)) return

      setSubjects(data)

      if (data.length > 0) {
        await onPickSubject(data[0])
      }
    }

    loadWeakRules()
    loadAllRules()
    loadSubjects()

    const weakId = searchParams.get("weak")
    if (weakId) {
      setTimeout(() => {
        setTrainingMode("weak_focus")
        setSelectedSessionType("weak_focus")
      }, 300)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!rules.length) {
      setTrainingQueue([])
      if (selectedRuleIndex !== null) setSelectedRuleIndex(null)
      return
    }

    const newQueue = buildTrainingQueue(
      rules,
      quizConfig.size,
      weakRules,
      quizConfig.order
    )

    setTrainingQueue(newQueue)

    if (selectedRuleIndex === null || !rules[selectedRuleIndex]) {
      setSelectedRuleIndex(newQueue[0] ?? null)
    }
  }, [rules, quizConfig.size, quizConfig.order, weakRules, selectedRuleIndex])

  async function onPickRule(index: number) {
    setSelectedRuleIndex(index)
    resetAnswerState()
  }

  async function handleSubmit() {
    if (selectedRuleIndex === null || isSubmitting || !currentUserId) return
    if (!rules[selectedRuleIndex]) return

    setIsSubmitting(true)

    try {
      const recallTime = Date.now() - answerStartTime
      const recallSeconds = Math.round(recallTime / 1000)
      const rule = rules[selectedRuleIndex]
      const safeAnswer = typeof answer === "string" ? answer : ""

      const res = await fetch("/api/submit-attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ruleId: rule.id,
          userAnswer: safeAnswer,
          userId: currentUserId,
          trainingMode,
        }),
      })

      const data = await res.json()

      const matched_keywords = data.matched_keywords ?? data.matchedBuzzwords ?? []
      const missed_keywords = data.missed_keywords ?? data.missedBuzzwords ?? []
      const score = typeof data.score === "number" ? data.score : 0

      const keywordScore =
        typeof data.keywordScore === "number"
          ? data.keywordScore
          : (rule.keywords?.length ?? 0) > 0
            ? Math.round(
                (matched_keywords.length / (rule.keywords?.length ?? 1)) * 100
              )
            : 0

      const similarity =
        typeof data.similarity === "number"
          ? data.similarity
          : Math.min(100, Math.round(score * 0.55))

      const normalized: ResultShape = {
        score,
        matched_keywords,
        missed_keywords,
        keywordScore,
        similarity,
      }

      setResult(normalized)
      setAttempts((prev) => [...prev, score])

      setRuleDifficulty((prev) => ({
        ...prev,
        [rule.id]: score,
      }))

      setRuleMastery((prev) => {
        const previous = prev[rule.id] ?? 0
        let change = 0

        if (score >= 90) change = 10
        else if (score >= 80) change = 6
        else if (score >= 70) change = 3
        else if (score >= 60) change = 0
        else change = -8

        const updated = Math.max(0, Math.min(100, previous + change))

        return {
          ...prev,
          [rule.id]: updated,
        }
      })

      const now = Date.now()
      let delay = 0

      if (score < 50) delay = 0
      else if (score < 70 || recallSeconds > 40) delay = 1
      else if (score < 85 || recallSeconds > 25) delay = 3
      else if (score < 95 || recallSeconds > 15) delay = 7
      else delay = 21

      const nextReview = now + delay * 24 * 60 * 60 * 1000

      setRuleSchedule((prev) => ({
        ...prev,
        [rule.id]: nextReview,
      }))

      if (score < 65) {
        setWeakRules((prev) =>
          prev.includes(rule.id) ? prev : [...prev, rule.id]
        )
      }

      setRules((prev) =>
        prev.map((r, i) =>
          i === selectedRuleIndex ? { ...r, avgScore: score } : r
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleNextRule() {
    if (selectedRuleIndex === null) return

    if (trainingMode === "study") {
      const next = selectedRuleIndex + 1
      if (next < rules.length) setSelectedRuleIndex(next)
    } else if (trainingMode === "weak_focus") {
      const weakIndexes = rules
        .map((r, i) => (weakRules.includes(r.id) ? i : null))
        .filter((v) => v !== null) as number[]

      if (weakIndexes.length > 0) {
        const currentPos = weakIndexes.indexOf(selectedRuleIndex)
        const nextIndex =
          currentPos === -1 || currentPos === weakIndexes.length - 1
            ? weakIndexes[0]
            : weakIndexes[currentPos + 1]

        setSelectedRuleIndex(nextIndex)
      }
    } else if (trainingQueue.length > 0) {
      const currentPosition = trainingQueue.indexOf(selectedRuleIndex)
      const nextPosition = currentPosition + 1
      if (nextPosition < trainingQueue.length) {
        setSelectedRuleIndex(trainingQueue[nextPosition])
      }
    } else {
      const next = selectedRuleIndex + 1
      if (next < rules.length) setSelectedRuleIndex(next)
    }

    resetAnswerState()
  }

  async function handleSaveRule() {
    if (!selectedRule || !currentUserId) return

    try {
      const res = await fetch("/api/rules/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          ruleId: selectedRule.id,
        }),
      })

      if (!res.ok) {
        alert("Could not save rule.")
        return
      }

      alert("Rule saved.")
    } catch (err) {
      console.error(err)
      alert("Could not save rule.")
    }
  }

  async function handleReportRule() {
    if (!selectedRule || !currentUserId) return

    try {
      const res = await fetch("/api/rules/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          ruleId: selectedRule.id,
          reason: "User reported from rule training screen",
        }),
      })

      if (!res.ok) {
        alert("Could not report rule.")
        return
      }

      alert("Rule reported.")
    } catch (err) {
      console.error(err)
      alert("Could not report rule.")
    }
  }

  function stopSession() {
    setSessionStarted(false)
    setSelectedRuleIndex(null)
    setRules([])
    setTrainingQueue([])
    resetAnswerState()
  }

  const mbeSubjects = useMemo(
    () => subjects.filter((s) => getSubjectGroup(s.name) === "MBE"),
    [subjects]
  )

  const meeSubjects = useMemo(
    () => subjects.filter((s) => getSubjectGroup(s.name) === "MEE"),
    [subjects]
  )

  const avgScore =
    attempts.length === 0
      ? selectedRule?.avgScore ?? 0
      : Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length)

  const filteredRules = useMemo(() => {
    let baseRules = rules

    if (trainingMode === "weak_focus") {
      baseRules = rules.filter((r) => weakRules.includes(r.id))
    }

    return baseRules
  }, [rules, trainingMode, weakRules])

  const subjectCards = useMemo(() => {
    return subjects.map((subject) => {
      const total =
        subject.total_rules ??
        allRules.filter((r) => r.subject_id === subject.id).length

      const weak =
        subject.weak_rules ??
        allRules.filter(
          (r) => r.subject_id === subject.id && weakRules.includes(r.id)
        ).length

      return {
        ...subject,
        total,
        weak,
        group: getSubjectGroup(subject.name),
      }
    })
  }, [subjects, allRules, weakRules])

  const previewSubjectNames = subjectCards
    .filter((s) => quizConfig.subjectIds.includes(s.id))
    .map((s) => s.name)

  const selectedStyleLabel =
    quizConfig.questionStyle === "prompt"
      ? "Question Prompt"
      : quizConfig.questionStyle === "recite"
        ? "Recite the Rule"
        : "Mixed"

  const sessionMeta = getSessionTypeMeta(selectedSessionType)
  const sessionAccent = getAccentClasses(sessionMeta.accent)

  function applySubjectPreset(preset: "all" | "mbe" | "mee" | "weak" | "clear") {
    if (preset === "all") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.map((s) => s.id),
        ruleFilter: "all",
        weakOnly: false,
      }))
      return
    }

    if (preset === "mbe") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => s.group === "MBE").map((s) => s.id),
        weakOnly: false,
      }))
      return
    }

    if (preset === "mee") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => s.group === "MEE").map((s) => s.id),
        weakOnly: false,
      }))
      return
    }

    if (preset === "weak") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => (s.weak ?? 0) > 0).map((s) => s.id),
        weakOnly: true,
        ruleFilter: "weak",
      }))
      return
    }

    setQuizConfig((prev) => ({
      ...prev,
      subjectIds: [],
      weakOnly: false,
      ruleFilter: "all",
    }))
  }

  function toggleQuizSubject(subjectId: string) {
    setQuizConfig((prev) => {
      const exists = prev.subjectIds.includes(subjectId)

      return {
        ...prev,
        subjectIds: exists
          ? prev.subjectIds.filter((id) => id !== subjectId)
          : [...prev.subjectIds, subjectId],
      }
    })
  }

  function setPresetSize(size: number) {
    const next = clampSessionSize(size)
    setQuizConfig((prev) => ({
      ...prev,
      size: next,
      customSize: String(next),
    }))
  }

  function setCustomSize(value: string) {
    setQuizConfig((prev) => ({
      ...prev,
      customSize: value,
      size: clampSessionSize(Number(value || 0)),
    }))
  }

  function startConfiguredSession(nextMode?: SessionType) {
    const effectiveMode = nextMode ?? trainingMode

    let filtered = [...allRules]
    const now = Date.now()

    if (effectiveMode === "weak_focus") {
      filtered = filtered.filter((r) => weakRules.includes(r.id))
    } else {
      if (quizConfig.subjectIds.length > 0) {
        filtered = filtered.filter((r) =>
          quizConfig.subjectIds.includes(r.subject_id || "")
        )
      }

      if (quizConfig.weakOnly || quizConfig.ruleFilter === "weak") {
        filtered = filtered.filter((r) => weakRules.includes(r.id))
      }

      if (quizConfig.ruleFilter === "untrained") {
        filtered = filtered.filter(
          (r) => !ruleDifficulty[r.id] && !ruleMastery[r.id] && !r.avgScore
        )
      }

      if (quizConfig.ruleFilter === "mastered") {
        filtered = filtered.filter((r) => {
          const mastery = ruleMastery[r.id] ?? r.avgScore ?? 0
          return mastery >= 80
        })
      }
    }

    filtered = filtered.filter((r) => {
      const nextReview = ruleSchedule[r.id]
      if (!nextReview) return true
      return nextReview <= now
    })

    if (filtered.length === 0) {
      filtered = [...allRules]
    }

    let finalRules = [...filtered]

    if (quizConfig.order === "random") {
      finalRules = shuffleArray(finalRules)
    } else if (quizConfig.order === "weakest") {
      finalRules = finalRules.sort((a, b) => {
        const aScore = ruleDifficulty[a.id] ?? a.avgScore ?? 0
        const bScore = ruleDifficulty[b.id] ?? b.avgScore ?? 0
        return aScore - bScore
      })
    }

    if (quizConfig.size > 0) {
      finalRules = finalRules.slice(0, quizConfig.size)
    }

    setTrainingMode(effectiveMode)
    setRules(finalRules)

    const nextQueue = buildTrainingQueue(
      finalRules,
      quizConfig.size,
      weakRules,
      quizConfig.order
    )

    setTrainingQueue(nextQueue)
    setSelectedRuleIndex(nextQueue[0] ?? 0)
    setSelectedSubjectId(finalRules[0]?.subject_id ?? null)
    setMode("typing")
    resetAnswerState()
    setSessionStarted(true)
  }

  function renderSectionHeader(
    label: string,
    count: number,
    open: boolean,
    onToggle: () => void
  ) {
    return (
      <div
        onClick={onToggle}
        className="mt-3 mb-1.5 flex cursor-pointer select-none items-center justify-between"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label} ({count})
        </div>

        <div
          className={`text-[9px] text-slate-300 transition-transform duration-150 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        >
          ▼
        </div>
      </div>
    )
  }

  function renderSubjectRow(subject: Subject) {
    const active = selectedSubjectId === subject.id
    const total = subject.total_rules ?? 0
    const done = subject.completed_rules ?? 0
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    const barColorClass = getSubjectBarColorClass(subject.name)

    return (
      <div
        key={subject.id}
        onClick={() => onPickSubject(subject)}
        className={`mb-1 cursor-pointer rounded-xl px-2.5 py-2 transition ${
          active
            ? "border border-blue-200/80 bg-gradient-to-r from-blue-50 to-white shadow-sm"
            : "border border-transparent hover:bg-slate-50"
        }`}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div
            className={`text-[11px] leading-[1.2] ${
              active ? "font-semibold text-blue-700" : "font-medium text-slate-700"
            }`}
          >
            {subject.name}
          </div>

          <div className="whitespace-nowrap text-[9px] text-slate-400">
            {total}r
          </div>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${barColorClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  const setupSummary = [
    {
      label: "Session",
      value: sessionMeta.label,
    },
    {
      label: "Subjects",
      value:
        previewSubjectNames.length > 0
          ? previewSubjectNames.length === 1
            ? previewSubjectNames[0]
            : `${previewSubjectNames.length} selected`
          : "None yet",
    },
    {
      label: "Session Size",
      value: String(quizConfig.size),
    },
    {
      label: "Order",
      value:
        quizConfig.order === "weakest"
          ? "Weakest"
          : quizConfig.order === "sequential"
            ? "Sequential"
            : "Random",
    },
    {
      label: "Rule Filter",
      value:
        quizConfig.ruleFilter === "all"
          ? "All"
          : quizConfig.ruleFilter === "weak"
            ? "Weak"
            : quizConfig.ruleFilter === "untrained"
              ? "Untrained"
              : "Mastered",
    },
    {
      label: "Question Style",
      value: selectedStyleLabel,
    },
  ]

  if (selectedSessionType === "timed") {
    setupSummary.push({
      label: "Timer",
      value: `${quizConfig.timePerQuestion}s`,
    })
  }

  if (!authReady) {
    return <div className="p-10">Loading...</div>
  }

  return (
    <div
      className={
        sessionStarted
          ? "grid h-[100dvh] grid-cols-[178px_minmax(0,1fr)_220px] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_24%),white]"
          : "min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_24%),white]"
      }
    >
      {sessionStarted && (
        <div className="overflow-y-auto border-r border-white/60 bg-white/65 px-2.5 py-3 backdrop-blur-md">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Subjects
          </div>

          {renderSectionHeader("MBE", mbeSubjects.length, mbeOpen, () =>
            setMbeOpen(!mbeOpen)
          )}
          {mbeOpen && mbeSubjects.map(renderSubjectRow)}

          {renderSectionHeader("MEE", meeSubjects.length, meeOpen, () =>
            setMeeOpen(!meeOpen)
          )}
          {meeOpen && meeSubjects.map(renderSubjectRow)}
        </div>
      )}

      <div
        className={
          sessionStarted
            ? "min-w-0 overflow-y-auto px-3 py-3"
            : "mx-auto w-full max-w-[1220px] px-4 py-5"
        }
      >
        {!sessionStarted ? (
          <div className="w-full">
            <div className="mb-4 overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 p-5 text-white shadow-[0_20px_50px_-24px_rgba(59,130,246,0.55)]">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-medium backdrop-blur-md">
                <Sparkles size={12} />
                Rule Training
              </div>

              <div className="text-[28px] font-semibold leading-tight">
                Choose your session
              </div>

              <div className="mt-2 max-w-[720px] text-[13px] leading-6 text-blue-50/95">
                Pick the mode first, then configure only what you need. Keep it compact, clean, and focused.
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <SessionTypeCard
                active={selectedSessionType === "study"}
                title="Study Session"
                description="Full rule visible."
                icon={<BookOpen size={16} />}
                onClick={() => {
                  setSelectedSessionType("study")
                  setTrainingMode("study")
                }}
              />
              <SessionTypeCard
                active={selectedSessionType === "quiz"}
                title="Quiz Session"
                description="Recall based practice."
                icon={<BrainCircuit size={16} />}
                onClick={() => {
                  setSelectedSessionType("quiz")
                  setTrainingMode("quiz")
                }}
              />
              <SessionTypeCard
                active={selectedSessionType === "timed"}
                title="Timed Session"
                description="Train under time pressure."
                icon={<TimerReset size={16} />}
                onClick={() => {
                  setSelectedSessionType("timed")
                  setTrainingMode("timed")
                }}
              />
              <SessionTypeCard
                active={selectedSessionType === "weak_focus"}
                title="Weak Focus"
                description="Automatically uses weak rules."
                icon={<Target size={16} />}
                onClick={() => {
                  setSelectedSessionType("weak_focus")
                  setTrainingMode("weak_focus")
                }}
              />
            </div>

            {selectedSessionType && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
                <GlassSection>
                  {selectedSessionType === "study" && (
                    <>
                      <SectionTitle
                        eyebrow="Study Setup"
                        title="Build your study session"
                        subtitle="Choose subjects, size, and order."
                      />

                      <SessionSection title="Choose Subjects">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <QuickChip label="All" tone="neutral" onClick={() => applySubjectPreset("all")} />
                          <QuickChip label="MBE Only" tone="blue" onClick={() => applySubjectPreset("mbe")} />
                          <QuickChip label="MEE Only" tone="violet" onClick={() => applySubjectPreset("mee")} />
                          <QuickChip label="Clear All" tone="neutral" onClick={() => applySubjectPreset("clear")} />
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                          {subjectCards.map((subject) => {
                            const selected = quizConfig.subjectIds.includes(subject.id)

                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => toggleQuizSubject(subject.id)}
                                className={[
                                  "rounded-2xl border p-3 text-left transition-all duration-200 backdrop-blur-md",
                                  selected
                                    ? "border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_rgba(139,92,246,0.10)]"
                                    : "border-white/70 bg-white/70 hover:border-blue-200 hover:bg-blue-50/40",
                                ].join(" ")}
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <div className="text-[12px] font-semibold leading-5 text-slate-900">
                                    {subject.name}
                                  </div>
                                  {selected && (
                                    <span className="text-[11px] font-bold text-violet-600">✓</span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {subject.total} rules
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </SessionSection>

                      <SessionSection title="Session Size">
                        <div className="flex flex-wrap items-center gap-2">
                          {[5, 10, 20, 25].map((count) => (
                            <PresetButton
                              key={count}
                              active={quizConfig.size === count}
                              onClick={() => setPresetSize(count)}
                            >
                              {count}
                            </PresetButton>
                          ))}

                          <div className="ml-1 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-500">Custom</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={quizConfig.customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              className="w-20 rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[12px] shadow-sm outline-none backdrop-blur-md"
                            />
                          </div>
                        </div>
                      </SessionSection>

                      <SessionSection title="Order">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.order === "sequential"}
                            label="Sequential"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "sequential",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "random"}
                            label="Random"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "random",
                              }))
                            }
                          />
                        </div>
                      </SessionSection>
                    </>
                  )}

                  {selectedSessionType === "quiz" && (
                    <>
                      <SectionTitle
                        eyebrow="Quiz Setup"
                        title="Build your quiz session"
                        subtitle="Choose subjects, size, filters, and style."
                      />

                      <SessionSection title="Choose Subjects">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <QuickChip label="All" tone="neutral" onClick={() => applySubjectPreset("all")} />
                          <QuickChip label="MBE Only" tone="blue" onClick={() => applySubjectPreset("mbe")} />
                          <QuickChip label="MEE Only" tone="violet" onClick={() => applySubjectPreset("mee")} />
                          <QuickChip label="Weak Only" tone="green" onClick={() => applySubjectPreset("weak")} />
                          <QuickChip label="Clear All" tone="neutral" onClick={() => applySubjectPreset("clear")} />
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                          {subjectCards.map((subject) => {
                            const selected = quizConfig.subjectIds.includes(subject.id)

                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => toggleQuizSubject(subject.id)}
                                className={[
                                  "rounded-2xl border p-3 text-left transition-all duration-200 backdrop-blur-md",
                                  selected
                                    ? "border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_rgba(139,92,246,0.10)]"
                                    : "border-white/70 bg-white/70 hover:border-blue-200 hover:bg-blue-50/40",
                                ].join(" ")}
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <div className="text-[12px] font-semibold leading-5 text-slate-900">
                                    {subject.name}
                                  </div>
                                  {selected && (
                                    <span className="text-[11px] font-bold text-violet-600">✓</span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {subject.total} rules • {subject.weak ?? 0} weak
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </SessionSection>

                      <SessionSection title="Session Size">
                        <div className="flex flex-wrap items-center gap-2">
                          {[5, 10, 20, 25].map((count) => (
                            <PresetButton
                              key={count}
                              active={quizConfig.size === count}
                              onClick={() => setPresetSize(count)}
                            >
                              {count}
                            </PresetButton>
                          ))}

                          <div className="ml-1 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-500">Custom</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={quizConfig.customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              className="w-20 rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[12px] shadow-sm outline-none backdrop-blur-md"
                            />
                          </div>
                        </div>
                      </SessionSection>

                      <SessionSection title="Question Order">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.order === "random"}
                            label="Random"
                            onClick={() =>
                              setQuizConfig((prev) => ({ ...prev, order: "random" }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "sequential"}
                            label="Sequential"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "sequential",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "weakest"}
                            label="Weakest First"
                            onClick={() =>
                              setQuizConfig((prev) => ({ ...prev, order: "weakest" }))
                            }
                          />
                        </div>
                      </SessionSection>

                      <SessionSection title="Rule Filter">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.ruleFilter === "all"}
                            label="All Rules"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                ruleFilter: "all",
                                weakOnly: false,
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.ruleFilter === "weak"}
                            label="Weak Only"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                ruleFilter: "weak",
                                weakOnly: true,
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.ruleFilter === "untrained"}
                            label="Untrained"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                ruleFilter: "untrained",
                                weakOnly: false,
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.ruleFilter === "mastered"}
                            label="Mastered"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                ruleFilter: "mastered",
                                weakOnly: false,
                              }))
                            }
                          />
                        </div>
                      </SessionSection>

                      <SessionSection title="Question Style">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.questionStyle === "prompt"}
                            label="Question Prompt"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                questionStyle: "prompt",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.questionStyle === "recite"}
                            label="Recite the Rule"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                questionStyle: "recite",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.questionStyle === "mixed"}
                            label="Mixed"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                questionStyle: "mixed",
                              }))
                            }
                          />
                        </div>
                      </SessionSection>
                    </>
                  )}

                  {selectedSessionType === "timed" && (
                    <>
                      <SectionTitle
                        eyebrow="Timed Setup"
                        title="Build your timed session"
                        subtitle="Choose scope, size, and timer."
                      />

                      <SessionSection title="Choose Subjects">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <QuickChip label="All" tone="neutral" onClick={() => applySubjectPreset("all")} />
                          <QuickChip label="MBE Only" tone="blue" onClick={() => applySubjectPreset("mbe")} />
                          <QuickChip label="MEE Only" tone="violet" onClick={() => applySubjectPreset("mee")} />
                          <QuickChip label="Weak Only" tone="green" onClick={() => applySubjectPreset("weak")} />
                          <QuickChip label="Clear All" tone="neutral" onClick={() => applySubjectPreset("clear")} />
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                          {subjectCards.map((subject) => {
                            const selected = quizConfig.subjectIds.includes(subject.id)

                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => toggleQuizSubject(subject.id)}
                                className={[
                                  "rounded-2xl border p-3 text-left transition-all duration-200 backdrop-blur-md",
                                  selected
                                    ? "border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_rgba(139,92,246,0.10)]"
                                    : "border-white/70 bg-white/70 hover:border-blue-200 hover:bg-blue-50/40",
                                ].join(" ")}
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <div className="text-[12px] font-semibold leading-5 text-slate-900">
                                    {subject.name}
                                  </div>
                                  {selected && (
                                    <span className="text-[11px] font-bold text-violet-600">✓</span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {subject.total} rules • {subject.weak ?? 0} weak
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </SessionSection>

                      <SessionSection title="Session Size">
                        <div className="flex flex-wrap items-center gap-2">
                          {[5, 10, 20, 25].map((count) => (
                            <PresetButton
                              key={count}
                              active={quizConfig.size === count}
                              onClick={() => setPresetSize(count)}
                            >
                              {count}
                            </PresetButton>
                          ))}

                          <div className="ml-1 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-500">Custom</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={quizConfig.customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              className="w-20 rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[12px] shadow-sm outline-none backdrop-blur-md"
                            />
                          </div>
                        </div>
                      </SessionSection>

                      <SessionSection title="Timer">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500">
                            Seconds per question
                          </span>
                          <input
                            type="number"
                            min={5}
                            max={600}
                            value={quizConfig.timePerQuestion}
                            onChange={(e) =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                timePerQuestion: Math.max(
                                  5,
                                  Math.min(600, Number(e.target.value || 60))
                                ),
                              }))
                            }
                            className="w-20 rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[12px] shadow-sm outline-none backdrop-blur-md"
                          />
                        </div>
                      </SessionSection>

                      <SessionSection title="Order">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.order === "random"}
                            label="Random"
                            onClick={() =>
                              setQuizConfig((prev) => ({ ...prev, order: "random" }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "sequential"}
                            label="Sequential"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "sequential",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "weakest"}
                            label="Weakest First"
                            onClick={() =>
                              setQuizConfig((prev) => ({ ...prev, order: "weakest" }))
                            }
                          />
                        </div>
                      </SessionSection>
                    </>
                  )}

                  {selectedSessionType === "weak_focus" && (
                    <>
                      <SectionTitle
                        eyebrow="Weak Focus Setup"
                        title="Train your weak rules"
                        subtitle="Automatically uses weak and overdue rules."
                      />

                      <SessionSection title="Session Size">
                        <div className="flex flex-wrap items-center gap-2">
                          {[5, 10, 20, 25].map((count) => (
                            <PresetButton
                              key={count}
                              active={quizConfig.size === count}
                              onClick={() => setPresetSize(count)}
                            >
                              {count}
                            </PresetButton>
                          ))}

                          <div className="ml-1 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-500">Custom</span>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={quizConfig.customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              className="w-20 rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-[12px] shadow-sm outline-none backdrop-blur-md"
                            />
                          </div>
                        </div>
                      </SessionSection>

                      <SessionSection title="Order">
                        <div className="flex flex-wrap gap-2">
                          <SelectPill
                            active={quizConfig.order === "weakest"}
                            label="Weakest First"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "weakest",
                              }))
                            }
                          />
                          <SelectPill
                            active={quizConfig.order === "random"}
                            label="Mixed"
                            onClick={() =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                order: "random",
                              }))
                            }
                          />
                        </div>
                      </SessionSection>
                    </>
                  )}

                  <div className="mt-5 flex justify-end">
                    <ActionButton onClick={() => startConfiguredSession(selectedSessionType)}>
                      {selectedSessionType === "study"
                        ? "Start Study Session"
                        : selectedSessionType === "quiz"
                          ? "Start Quiz Session"
                          : selectedSessionType === "timed"
                            ? "Start Timed Session"
                            : "Start Weak Focus"}
                    </ActionButton>
                  </div>
                </GlassSection>

                <div className="xl:sticky xl:top-5 xl:self-start">
                  <FloatingSummaryCard
                    icon={sessionMeta.icon}
                    accent={sessionMeta.accent}
                    title="Session Preview"
                    subtitle="This stays visible while you configure the session."
                  >
                    <div className="space-y-2">
                      {setupSummary.map((item) => (
                        <CompactSummaryRow
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </div>

                    <div className="mt-4 border-t border-slate-200/80 pt-3">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        <SlidersHorizontal size={12} />
                        Selected Subjects
                      </div>

                      {previewSubjectNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {previewSubjectNames.map((name) => (
                            <span
                              key={name}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${sessionAccent.pill}`}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          No subjects selected yet
                        </div>
                      )}
                    </div>
                  </FloatingSummaryCard>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!selectedRule && (
              <div className="mt-8 opacity-60">
                Select a rule from the left panel
              </div>
            )}

            {selectedRule && (
              <div className="mx-auto w-full max-w-[820px]">
                <GlassSection className="overflow-hidden px-5 py-4">
                  <div className="mb-1 text-[11px] text-slate-400">
                    Rule {selectedRuleIndex !== null ? selectedRuleIndex + 1 : 1} of {filteredRules.length || rules.length} •{" "}
                    {selectedRule.topic || selectedSubject?.name || "Rule Training"}
                  </div>

                  <div className="mb-2 text-[18px] font-semibold leading-tight text-slate-900 md:text-[20px]">
                    {selectedRule.title}
                  </div>

                  <div className="mb-4 h-[2px] w-14 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />

                  <div className="mb-3">
                    <div className="min-w-0 scale-[0.92] origin-left sm:scale-100">
                      <ModeSwitcher mode={mode as any} setMode={setMode as any} />
                    </div>
                  </div>

                  <div className="mt-5">
                    {mode === "typing" && (
                      <TypingMode
                        ruleText={selectedRule.rule_text}
                        keywords={selectedRule.keywords ?? []}
                        title={selectedRule.title}
                        answer={typeof answer === "string" ? answer : ""}
                        setAnswer={(value) => setAnswer(typeof value === "string" ? value : "")}
                        onSubmit={handleSubmit}
                        onTryAgain={handleTryAgain}
                        onNextRule={handleNextRule}
                        onSaveRule={handleSaveRule}
                        onReportRule={handleReportRule}
                        trainingMode={trainingMode}
                        result={result}
                        isSubmitting={isSubmitting}
                      />
                    )}

                    {mode === "fillblank" && (
                      <FillBlankMode
                        ruleText={selectedRule.rule_text || ""}
                        keywords={selectedRule.keywords || []}
                        onNextRule={handleNextRule}
                      />
                    )}

                    {mode === "buzzwords" && (
                      <BuzzwordsMode
                        ruleText={selectedRule.rule_text || ""}
                        keywords={selectedRule.keywords || []}
                        onNextRule={handleNextRule}
                      />
                    )}

                    {mode === "ordering" && (
                      <OrderingMode
                        ruleText={selectedRule.rule_text || ""}
                        keywords={selectedRule.keywords || []}
                        onNextRule={handleNextRule}
                      />
                    )}

                    {mode === "flashcard" && (
                      <FlashcardMode
                        ruleId={selectedRule.id}
                        title={selectedRule.title}
                        subject={selectedSubject?.name}
                        topic={selectedRule.topic}
                        subtopic={selectedRule.subtopic}
                        ruleText={selectedRule.rule_text || ""}
                        keywords={selectedRule.keywords || []}
                        onNextRule={handleNextRule}
                        onSaveRule={handleSaveRule}
                      />
                    )}
                  </div>
                </GlassSection>
              </div>
            )}
          </>
        )}
      </div>

      {sessionStarted && (
        <div className="flex min-h-0 flex-col border-l border-white/70 bg-white/65 px-2.5 py-3 backdrop-blur-md">
          <div className="shrink-0">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Training Mode
            </div>

            <div className="mb-3">
              {[
                { title: "Study", sub: "Full rule shown", modeValue: "study" as SessionType },
                { title: "Quiz", sub: "Score only", modeValue: "quiz" as SessionType },
                { title: "Timed", sub: "Beat the clock", modeValue: "timed" as SessionType },
                {
                  title: "Weak Focus",
                  sub: "Your weak rules",
                  modeValue: "weak_focus" as SessionType,
                },
              ].map((item) => {
                const active = trainingMode === item.modeValue

                return (
                  <div
                    key={item.title}
                    onClick={() => changeTrainingMode(item.modeValue)}
                    className={`mb-1 cursor-pointer rounded-xl px-2.5 py-2 transition ${
                      active
                        ? "border border-blue-200/80 bg-gradient-to-r from-blue-50 to-white shadow-sm"
                        : "border border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-0.5 text-[12px] font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      {item.sub}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Session Preview
            </div>

            <div className="mb-3 rounded-2xl border border-white/70 bg-white/75 p-2.5 shadow-sm backdrop-blur-md">
              <PreviewRow
                label="Mode"
                value={
                  trainingMode === "timed"
                    ? "Timed"
                    : trainingMode === "quiz"
                      ? "Quiz"
                      : trainingMode === "weak_focus"
                        ? "Weak"
                        : "Study"
                }
              />
              <PreviewRow label="Questions" value={String(quizConfig.size)} />
              <PreviewRow
                label="Order"
                value={
                  quizConfig.order === "weakest"
                    ? "Weakest"
                    : quizConfig.order === "sequential"
                      ? "Sequential"
                      : "Random"
                }
              />
              <PreviewRow
                label="Filter"
                value={
                  quizConfig.ruleFilter === "all"
                    ? "All"
                    : quizConfig.ruleFilter === "weak"
                      ? "Weak"
                      : quizConfig.ruleFilter === "untrained"
                        ? "Untrained"
                        : "Mastered"
                }
              />
              <PreviewRow
                label="Time/Q"
                value={trainingMode === "timed" ? `${quizConfig.timePerQuestion}s` : "Unlimited"}
              />
              <PreviewRow label="Style" value={selectedStyleLabel} />
              <PreviewRow label="Avg Score" value={`${avgScore}%`} />

              <div className="mb-1.5 mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <ListChecks size={12} />
                Selected Subjects
              </div>

              <div className="flex flex-wrap gap-1">
                {previewSubjectNames.length > 0 ? (
                  previewSubjectNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-600"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400">
                    No subjects selected
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={stopSession}
              className="mb-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Stop Session
            </button>
          </div>

          {modeSwitchRequest && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35">
              <div className="w-[340px] rounded-2xl border border-white/70 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                <div className="mb-2 text-[16px] font-semibold text-slate-900">
                  Switch training mode
                </div>

                <div className="mb-4 text-[12px] leading-5 text-slate-500">
                  Leave <b>{trainingMode}</b> mode and switch to <b>{modeSwitchRequest}</b>?
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelModeSwitch}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmModeSwitch}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white"
                  >
                    Switch
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GlassSection({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/70 bg-gradient-to-br from-white via-white to-slate-50/85 p-4 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.25)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

function FloatingSummaryCard({
  icon,
  accent,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  accent: "blue" | "violet" | "green" | "neutral"
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const accentClasses = getAccentClasses(accent)

  return (
    <div
      className={`rounded-[22px] border bg-gradient-to-br ${accentClasses.soft} p-4 ${accentClasses.glow} border-white/70 backdrop-blur-md`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${accentClasses.pill}`}>
          {icon}
        </div>

        <div>
          <div className="text-[14px] font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="mt-0.5 text-[11px] leading-5 text-slate-500">{subtitle}</div>}
        </div>
      </div>

      {children}
    </div>
  )
}

function CompactSummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/65 px-3 py-2 text-[11px] shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function SessionSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mt-4 border-t border-slate-200/80 pt-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </div>
      {children}
    </div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {eyebrow}
      </div>
      <div className="text-[18px] font-semibold text-slate-900">
        {title}
      </div>
      {subtitle && (
        <div className="mt-1 text-[12px] leading-5 text-slate-500">
          {subtitle}
        </div>
      )}
    </div>
  )
}

function SessionTypeCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[20px] border p-4 text-left transition-all duration-200 backdrop-blur-md",
        active
          ? "border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_12px_28px_rgba(139,92,246,0.10)]"
          : "border-white/70 bg-white/70 hover:border-blue-200 hover:bg-blue-50/30",
      ].join(" ")}
    >
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/75 text-slate-700 shadow-sm">
        {icon}
      </div>
      <div className="mb-1 text-[14px] font-semibold text-slate-900">
        {title}
      </div>
      <div className="text-[11px] leading-5 text-slate-500">
        {description}
      </div>
    </button>
  )
}

function QuickChip({
  label,
  onClick,
  tone = "neutral",
}: {
  label: string
  onClick: () => void
  tone?: "neutral" | "blue" | "violet" | "green"
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.04)]"
      : tone === "violet"
        ? "border-violet-200 bg-violet-50 text-violet-700 shadow-[0_0_0_1px_rgba(139,92,246,0.04)]"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.04)]"
          : "border-slate-300 bg-white text-slate-600"

  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${toneClass}`}
    >
      {label}
    </button>
  )
}

function PresetButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[11px] font-semibold backdrop-blur-md ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-600"
          : "border-white/70 bg-white/70 text-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

function SelectPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-xl border px-3 py-2 text-[11px] font-semibold backdrop-blur-md ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-600"
          : "border-white/70 bg-white/70 text-slate-700"
      }`}
    >
      {label}
    </button>
  )
}

function PreviewRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-200 py-1.5 text-[10px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/30 bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(124,58,237,0.18)] transition hover:from-violet-500 hover:to-violet-700"
    >
      {children}
    </button>
  )
}
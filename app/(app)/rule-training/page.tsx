"use client"

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  BookOpen,
  TimerReset,
  Target,
  BrainCircuit,
  Layers3,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Play,
  Star,
  Clock3,
  NotebookPen,
  Pause,
  Square,
  FolderClock,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useUnsavedChanges } from "@/app/_providers/UnsavedChangesProvider"
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
  exam_status?: string
  show_in_rule_training?: boolean
  show_in_analytics?: boolean
  badge_text?: string
  badge_tone?: string
  badge_subtext?: string
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
  prompt_question?: string
  application_example?: string
  common_trap?: string
  priority?: string
}

type TopicOption = {
  id: string
  name: string
  subjectId: string
  subjectName: string
  count: number
}

type ResultShape = {
  score?: number
  keywordScore?: number
  similarity?: number
  matched_keywords?: string[]
  missed_keywords?: string[]
}

type ModeAttemptPayload = {
  userAnswer: string
  score: number
  matchedKeywords: string[]
  missedKeywords: string[]
  keywordScore: number
  similarity: number
}

type SessionQuestionStyle = "prompt" | "recite" | "mixed"
type SessionOrder = "random" | "sequential" | "weakest"
type SessionFilter = "all" | "weak" | "untrained" | "mastered"
type SessionType = "study" | "quiz" | "timed" | "weak_focus"
type RuleMode = "typing" | "fillblank" | "buzzwords" | "ordering" | "flashcard"
type ActiveTab = "setup" | "active" | "results"

type SessionRuleResult = {
  ruleId: string
  title: string
  score: number
  matchedKeywords: string[]
  missedKeywords: string[]
  keywordScore: number
  similarity: number
  timeSpentSec: number
}

type SessionHistoryItem = {
  id: string
  mode: SessionType
  subjectName: string
  createdAt: string
  completedCount: number
  totalQuestions: number
  finalScore: number | null
  improvedCount: number
  savedCount: number
  reportedCount: number
  totalTimeSec: number
  avgTimePerRuleSec: number
  finishedInTime: boolean | null
  targetTimeSec: number | null
  missedKeywords: string[]
  bestRule?: SessionRuleResult | null
  worstRule?: SessionRuleResult | null
  rules: SessionRuleResult[]
}

type SessionDraft = {
  id: string
  label: string
  savedAt: string
  activeTab: ActiveTab
  selectedSessionType: SessionType | null
  sessionStarted: boolean
  selectedSubjectId: string | null
  rules: Rule[]
  trainingQueue: number[]
  selectedRuleIndex: number | null
  answer: string
  mode: RuleMode
  trainingMode: SessionType
  attempts: number[]
  weakRules: string[]
  ruleDifficulty: Record<string, number>
  ruleMastery: Record<string, number>
  ruleSchedule: Record<string, number>
  expandedSubjectIds: string[]
  selectedTopicIds: string[]
  quizConfig: {
    size: number
    customSize: string
    timed: boolean
    timePerQuestion: number
    subjectIds: string[]
    weakOnly: boolean
    order: SessionOrder
    ruleFilter: SessionFilter
    questionStyle: SessionQuestionStyle
  }
  sessionRuleResults: SessionRuleResult[]
  savedRuleIds: string[]
  reportedRuleIds: string[]
  remainingSeconds: number | null
  timerStarted: boolean
}

const STORAGE_ACTIVE_SESSION = "lexora_rule_training_active_session_v6"
const STORAGE_SESSION_HISTORY = "lexora_rule_training_session_history_v3"
const STORAGE_SESSION_DRAFTS = "lexora_rule_training_active_drafts_v3"

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

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getResultKeywordTotal(result: ResultShape | null) {
  if (!result) return 0

  const matched = Array.isArray(result.matched_keywords)
    ? result.matched_keywords.length
    : 0

  const missed = Array.isArray(result.missed_keywords)
    ? result.missed_keywords.length
    : 0

  return matched + missed
}

function getDisplayKeywordsForResult(result: ResultShape | null, fallback: string[] = []) {
  if (!result) return fallback

  const matched = Array.isArray(result.matched_keywords) ? result.matched_keywords : []
  const missed = Array.isArray(result.missed_keywords) ? result.missed_keywords : []

  const merged = [...matched, ...missed]
    .map((item) => String(item || "").trim())
    .filter(Boolean)

  return merged.length > 0 ? Array.from(new Set(merged)) : fallback
}

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function normalizeRuleRow(raw: any): Rule {
  const topicName = String(raw.topic ?? raw.topic_name ?? raw.topic_title ?? "").trim()
  const subtopicName = String(
    raw.subtopic ?? raw.subtopic_name ?? raw.subtopic_title ?? ""
  ).trim()
  const subjectName = String(
    raw.subject ?? raw.subject_name ?? raw.subject_title ?? ""
  ).trim()

  return {
    id: String(raw.id ?? "").trim(),
    title: String(raw.title ?? "").trim(),
    rule_text: String(raw.rule_text ?? "").trim(),
    keywords: normalizeKeywords(raw.keywords ?? raw.buzzwords),
    topic: topicName,
    subtopic: subtopicName,
    topic_id: String(raw.topic_id ?? "").trim(),
    subtopic_id: String(raw.subtopic_id ?? "").trim(),
    subject: subjectName,
    subject_id: String(raw.subject_id ?? "").trim(),
    avgScore:
      typeof raw.avgScore === "number"
        ? raw.avgScore
        : typeof raw.avg_score === "number"
          ? raw.avg_score
          : 0,
    prompt_question: String(raw.prompt_question ?? "").trim(),
    application_example: String(raw.application_example ?? "").trim(),
    common_trap: String(raw.common_trap ?? "").trim(),
    priority: String(raw.priority ?? "").trim(),
  }
}

function buildClientRuleKey(rule: Rule) {
  return [
    String(rule.subject_id || rule.subject || "").trim().toLowerCase(),
    String(rule.topic_id || rule.topic || "").trim().toLowerCase(),
    String(rule.subtopic_id || rule.subtopic || "").trim().toLowerCase(),
    String(rule.title || "").trim().toLowerCase(),
  ].join("::")
}

function mergeUniqueRules(rules: Rule[]) {
  const map = new Map<string, Rule>()

  for (const rule of rules) {
    if (!rule?.id) continue

    const key = buildClientRuleKey(rule)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, rule)
      continue
    }

    const ruleHasPrompt = !!String(rule.prompt_question ?? "").trim()
    const existingHasPrompt = !!String(existing.prompt_question ?? "").trim()

    if (ruleHasPrompt && !existingHasPrompt) {
      map.set(key, rule)
      continue
    }

    if (!existing.rule_text && rule.rule_text) {
      map.set(key, rule)
      continue
    }

    if ((rule.keywords?.length ?? 0) > (existing.keywords?.length ?? 0)) {
      map.set(key, rule)
      continue
    }
  }

  return Array.from(map.values())
}

function getEffectiveQuestionStyle(
  style: SessionQuestionStyle,
  rule: Rule | null
): "prompt" | "recite" {
  if (style === "prompt" || style === "recite") return style
  if (!rule) return "prompt"
  return hashString(rule.id || rule.title || "rule") % 2 === 0 ? "prompt" : "recite"
}

function buildPromptText(
  rule: Rule | null,
  effectiveStyle: "prompt" | "recite"
) {
  if (!rule) return ""

  if (effectiveStyle === "recite") {
    return rule.title?.trim()
      ? `Recite the full black letter law rule for ${rule.title}.`
      : "Recite the full black letter law rule."
  }

  if (rule.prompt_question?.trim()) {
    return rule.prompt_question.trim()
  }

  if (rule.title?.trim()) {
    return `State the black letter law rule for ${rule.title}.`
  }

  return "State the applicable rule."
}

function shouldShowRuleByDefault(trainingMode: SessionType) {
  return trainingMode === "study"
}

function getSessionTypeMeta(sessionType: SessionType | null) {
  switch (sessionType) {
    case "study":
      return {
        label: "Study Session",
        shortLabel: "Study",
        icon: <BookOpen size={15} />,
      }
    case "quiz":
      return {
        label: "Quiz Session",
        shortLabel: "Quiz",
        icon: <BrainCircuit size={15} />,
      }
    case "timed":
      return {
        label: "Timed Session",
        shortLabel: "Timed",
        icon: <TimerReset size={15} />,
      }
    case "weak_focus":
      return {
        label: "Weak Focus",
        shortLabel: "Weak Focus",
        icon: <Target size={15} />,
      }
    default:
      return {
        label: "Session",
        shortLabel: "Session",
        icon: <Layers3 size={15} />,
      }
  }
}

function getHistoryModeLabel(mode: SessionType) {
  if (mode === "weak_focus") return "Weak"
  if (mode === "quiz") return "Quiz"
  if (mode === "timed") return "Timed"
  return "Study"
}

function getHistoryModeTone(mode: SessionType) {
  if (mode === "quiz") return "bg-blue-50 text-blue-700 border-blue-200"
  if (mode === "timed") return "bg-amber-50 text-amber-700 border-amber-200"
  if (mode === "weak_focus") return "bg-violet-50 text-violet-700 border-violet-200"
  return "bg-emerald-50 text-emerald-700 border-emerald-200"
}

function formatDateLabel(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTimeLabel(isoString: string) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTimeShort(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins <= 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function getSetupProgressPercent(input: {
  selectedSessionType: SessionType | null
  selectedSubjectsCount: number
  selectedTopicsCount: number
  size: number
  order: SessionOrder
}) {
  const steps = [
    !!input.selectedSessionType,
    input.selectedSubjectsCount > 0 || input.selectedTopicsCount > 0,
    input.size > 0,
    !!input.order,
  ]
  return Math.round((steps.filter(Boolean).length / steps.length) * 100)
}

function getDraftGroupName(draft: SessionDraft) {
  const uniqueSubjects = Array.from(
    new Set(
      (draft.rules || [])
        .map((r) => r.subject?.trim())
        .filter((v): v is string => !!v)
    )
  )

  if (uniqueSubjects.length === 1) return uniqueSubjects[0]
  if (uniqueSubjects.length > 1) return "Mixed Subjects"

  return draft.selectedSessionType
    ? `${getSessionTypeMeta(draft.selectedSessionType).shortLabel}`
    : "Other Sessions"
}

function RuleTrainingPageContent() {
  const searchParams = useSearchParams()
  const modeFromUrl = searchParams.get("mode") || ""
  const weakFocusRuleIdFromUrl = searchParams.get("ruleId") || searchParams.get("weakFocusRuleId") || ""
  const weakFocusSubjectFromUrl = searchParams.get("subject") || ""
  const weakFocusTopicFromUrl = searchParams.get("topic") || ""
  const weakFocusSubtopicFromUrl = searchParams.get("subtopic") || ""
  const autoStartFromUrl = searchParams.get("autoStart") === "1"
  const drillFromWeakAreasFromUrl = searchParams.get("drillFromWeakAreas") === "1"
  const returnToFromUrl = searchParams.get("returnTo") || ""
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { setDirty, clearDirty, requestAction } = useUnsavedChanges()

  const restoredSessionRef = useRef(false)
  const directWeakAreasStartedRef = useRef(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [activeTab, setActiveTab] = useState<ActiveTab>("setup")
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "quiz" | "timed" | "weak_focus" | "study"
  >("all")
  const [historyDateStart, setHistoryDateStart] = useState("")
  const [historyDateEnd, setHistoryDateEnd] = useState("")
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([])
  const [sessionDrafts, setSessionDrafts] = useState<SessionDraft[]>([])
  const [draftGroupOpen, setDraftGroupOpen] = useState<Record<string, boolean>>({})

  const [modeSwitchRequest, setModeSwitchRequest] = useState<SessionType | null>(null)
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(modeFromUrl === "weak_focus" || modeFromUrl === "weak-focus" || searchParams.get("trainingMode") === "weak_focus" ? "weak_focus" : null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  const [rules, setRules] = useState<Rule[]>([])
  const [allRules, setAllRules] = useState<Rule[]>([])
  const [trainingQueue, setTrainingQueue] = useState<number[]>([])
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null)

  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now())
  const [answer, setAnswer] = useState<string>("")
  const [result, setResult] = useState<ResultShape | null>(null)

  const [mode, setMode] = useState<RuleMode>("typing")
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [trainingMode, setTrainingMode] = useState<SessionType>(modeFromUrl === "weak_focus" || modeFromUrl === "weak-focus" || searchParams.get("trainingMode") === "weak_focus" ? "weak_focus" : "study")

  const [mbeOpen, setMbeOpen] = useState(true)
  const [meeOpen, setMeeOpen] = useState(true)
  const [attempts, setAttempts] = useState<number[]>([])
  const [weakRules, setWeakRules] = useState<string[]>([])
  const [weakAreaItems, setWeakAreaItems] = useState<any[]>([])
  const [weakAreaRuleIds, setWeakAreaRuleIds] = useState<string[]>([])
  const [directWeakCompletedRuleIds, setDirectWeakCompletedRuleIds] = useState<string[]>([])
  const [ruleDifficulty, setRuleDifficulty] = useState<Record<string, number>>({})
  const [ruleMastery, setRuleMastery] = useState<Record<string, number>>({})
  const [ruleSchedule, setRuleSchedule] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [savedRuleIds, setSavedRuleIds] = useState<string[]>([])
  const [reportedRuleIds, setReportedRuleIds] = useState<string[]>([])
  const [sessionRuleResults, setSessionRuleResults] = useState<SessionRuleResult[]>([])

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [timerStarted, setTimerStarted] = useState(false)

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

  const visibleSubjects = useMemo(
    () => subjects.filter((subject) => subject.show_in_rule_training !== false),
    [subjects]
  )

  const topicsBySubject = useMemo(() => {
    const map = new Map<string, TopicOption[]>()

    for (const subject of visibleSubjects) {
      const grouped = new Map<string, TopicOption>()

      for (const rule of allRules) {
        const sameById = rule.subject_id && rule.subject_id === subject.id
        const sameByName = rule.subject && rule.subject === subject.name
        if (!sameById && !sameByName) continue

        const topicId = String(rule.topic_id ?? "").trim()
        const topicName = String(rule.topic ?? "").trim()
        if (!topicId || !topicName) continue

        const existing = grouped.get(topicId)
        if (existing) {
          existing.count += 1
        } else {
          grouped.set(topicId, {
            id: topicId,
            name: topicName,
            subjectId: subject.id,
            subjectName: subject.name,
            count: 1,
          })
        }
      }

      map.set(
        subject.id,
        Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
      )
    }

    return map
  }, [visibleSubjects, allRules])

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem(STORAGE_SESSION_HISTORY)
      if (historyRaw) {
        const parsed = JSON.parse(historyRaw)
        if (Array.isArray(parsed)) {
          setSessionHistory(parsed)
        }
      }

      const draftsRaw = localStorage.getItem(STORAGE_SESSION_DRAFTS)
      if (draftsRaw) {
        const parsedDrafts = JSON.parse(draftsRaw)
        if (Array.isArray(parsedDrafts)) {
          setSessionDrafts(parsedDrafts)
        }
      }
    } catch (error) {
      console.error("SESSION CACHE LOAD ERROR:", error)
    }
  }, [])

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

  function buildCurrentDraft(labelOverride?: string): SessionDraft {
    const modeLabel = getSessionTypeMeta(trainingMode).shortLabel
    const subjectName =
      selectedRule?.subject ||
      selectedSubject?.name ||
      (quizConfig.subjectIds.length > 1 || selectedTopicIds.length > 1
        ? "Multiple Subjects"
        : "Rule Training")

    return {
      id: studySessionId || `${Date.now()}`,
      label: labelOverride || `${modeLabel} / ${subjectName}`,
      savedAt: new Date().toISOString(),
      activeTab: "active",
      selectedSessionType,
      sessionStarted,
      selectedSubjectId,
      rules,
      trainingQueue,
      selectedRuleIndex,
      answer,
      mode,
      trainingMode,
      attempts,
      weakRules,
      ruleDifficulty,
      ruleMastery,
      ruleSchedule,
      expandedSubjectIds,
      selectedTopicIds,
      quizConfig,
      sessionRuleResults,
      savedRuleIds,
      reportedRuleIds,
      remainingSeconds,
      timerStarted,
    }
  }

  function persistDrafts(nextDrafts: SessionDraft[]) {
    setSessionDrafts(nextDrafts)
    try {
      localStorage.setItem(STORAGE_SESSION_DRAFTS, JSON.stringify(nextDrafts))
    } catch (error) {
      console.error("SESSION DRAFT SAVE ERROR:", error)
    }
  }

  function saveCurrentSessionDraft(customLabel?: string) {
    const draft = buildCurrentDraft(customLabel)
    const next = [draft, ...sessionDrafts.filter((item) => item.id !== draft.id)]
    persistDrafts(next)
    return draft
  }

  function abandonCurrentSessionState() {
    directWeakAreasStartedRef.current = false
    setSessionStarted(false)
    setSessionPaused(false)
    setSelectedRuleIndex(null)
    setRules([])
    setTrainingQueue([])
    setResult(null)
    setAnswer("")
    setSessionRuleResults([])
    setDirectWeakCompletedRuleIds([])
    setSavedRuleIds([])
    setReportedRuleIds([])
    setRemainingSeconds(null)
    setTimerStarted(false)
    try {
      sessionStorage.removeItem(STORAGE_ACTIVE_SESSION)
    } catch (error) {
      console.error("SESSION STORAGE REMOVE ERROR:", error)
    }
  }

  useEffect(() => {
    if (sessionStarted) {
      setDirty(true, {
        reason: "rule_training_session",
        message:
          "You have an active rule training session. Do you want to save it before leaving?",
        onSave: async () => {
          try {
            sessionStorage.setItem(
              STORAGE_ACTIVE_SESSION,
              JSON.stringify(buildCurrentDraft("Live Session"))
            )
          } catch (error) {
            console.error("LIVE SESSION SAVE ERROR:", error)
          }
        },
        onDiscard: async () => {
          abandonCurrentSessionState()
        },
      })
    } else {
      clearDirty()
    }
return () => clearDirty()
  }, [
    sessionStarted,
    setDirty,
    clearDirty,
    selectedSessionType,
    selectedSubjectId,
    rules,
    trainingQueue,
    selectedRuleIndex,
    answer,
    mode,
    trainingMode,
    attempts,
    weakRules,
    ruleDifficulty,
    ruleMastery,
    ruleSchedule,
    expandedSubjectIds,
    selectedTopicIds,
    quizConfig,
    sessionRuleResults,
    savedRuleIds,
    reportedRuleIds,
    remainingSeconds,
    timerStarted,
  ])

  useEffect(() => {
    if (!authReady) return

    try {
      const raw = sessionStorage.getItem(STORAGE_ACTIVE_SESSION)
      if (!raw) return
      const parsed: SessionDraft = JSON.parse(raw)
      if (parsed?.sessionStarted) {
        restoredSessionRef.current = true
        restoreDraft(parsed, false)
      }
    } catch (error) {
      console.error("SESSION RESTORE ERROR:", error)
    }
  }, [authReady])

  function restoreDraft(draft: SessionDraft, moveToActiveTab = true) {
    restoredSessionRef.current = true
    setActiveTab(moveToActiveTab ? "active" : draft.activeTab ?? "active")
    setSelectedSessionType(draft.selectedSessionType ?? null)
    setSessionStarted(draft.sessionStarted ?? false)
    setSessionPaused(false)
    setSelectedSubjectId(draft.selectedSubjectId ?? null)
    setRules(Array.isArray(draft.rules) ? draft.rules : [])
    setTrainingQueue(Array.isArray(draft.trainingQueue) ? draft.trainingQueue : [])
    setSelectedRuleIndex(
      typeof draft.selectedRuleIndex === "number" ? draft.selectedRuleIndex : null
    )
    setAnswer(typeof draft.answer === "string" ? draft.answer : "")
    setMode((draft.mode as RuleMode) ?? "typing")
    setTrainingMode((draft.trainingMode as SessionType) ?? "study")
    setAttempts(Array.isArray(draft.attempts) ? draft.attempts : [])
    setWeakRules(Array.isArray(draft.weakRules) ? draft.weakRules : [])
    setRuleDifficulty(draft.ruleDifficulty ?? {})
    setRuleMastery(draft.ruleMastery ?? {})
    setRuleSchedule(draft.ruleSchedule ?? {})
    setExpandedSubjectIds(Array.isArray(draft.expandedSubjectIds) ? draft.expandedSubjectIds : [])
    setSelectedTopicIds(Array.isArray(draft.selectedTopicIds) ? draft.selectedTopicIds : [])
    setQuizConfig(draft.quizConfig ?? quizConfig)
    setSessionRuleResults(Array.isArray(draft.sessionRuleResults) ? draft.sessionRuleResults : [])
    setSavedRuleIds(Array.isArray(draft.savedRuleIds) ? draft.savedRuleIds : [])
    setReportedRuleIds(Array.isArray(draft.reportedRuleIds) ? draft.reportedRuleIds : [])
    setRemainingSeconds(
      typeof draft.remainingSeconds === "number" ? draft.remainingSeconds : null
    )
    setTimerStarted(!!draft.timerStarted)
    setResult(null)
    setAnswerStartTime(Date.now())
  }

  function removeDraft(draftId: string) {
    const next = sessionDrafts.filter((item) => item.id !== draftId)
    persistDrafts(next)
  }

  function saveHistory(historyItem: SessionHistoryItem) {
    const next = [historyItem, ...sessionHistory]
    setSessionHistory(next)
    try {
      localStorage.setItem(STORAGE_SESSION_HISTORY, JSON.stringify(next))
    } catch (error) {
      console.error("SESSION HISTORY SAVE ERROR:", error)
    }
  }

  function finalizeSession() {
    const completedRules = sessionRuleResults
    const totalQuestions = trainingQueue.length > 0 ? trainingQueue.length : rules.length
    const scores = completedRules.map((r) => r.score)
    const finalScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

    const bestRule =
      completedRules.length > 0
        ? [...completedRules].sort((a, b) => b.score - a.score)[0]
        : null

    const worstRule =
      completedRules.length > 0
        ? [...completedRules].sort((a, b) => a.score - b.score)[0]
        : null

    const missedKeywords = Array.from(new Set(completedRules.flatMap((r) => r.missedKeywords)))

    const totalTimeSec = completedRules.reduce((sum, item) => sum + item.timeSpentSec, 0)
    const avgTimePerRuleSec =
      completedRules.length > 0 ? Math.round(totalTimeSec / completedRules.length) : 0

    const improvedCount =
      trainingMode === "weak_focus"
        ? completedRules.filter((r) => r.score >= 70).length
        : 0

    const subjectName =
      selectedRule?.subject ||
      selectedSubject?.name ||
      (quizConfig.subjectIds.length > 1 || selectedTopicIds.length > 1
        ? "Mixed Subjects"
        : "Mixed Subjects")

    const targetTimeSec =
      trainingMode === "timed" ? quizConfig.size * quizConfig.timePerQuestion : null

    const historyItem: SessionHistoryItem = {
      id: `${Date.now()}`,
      mode: trainingMode,
      subjectName,
      createdAt: new Date().toISOString(),
      completedCount: completedRules.length,
      totalQuestions,
      finalScore,
      improvedCount,
      savedCount: savedRuleIds.length,
      reportedCount: reportedRuleIds.length,
      totalTimeSec,
      avgTimePerRuleSec,
      finishedInTime:
        trainingMode === "timed" && targetTimeSec !== null
          ? totalTimeSec <= targetTimeSec
          : null,
      targetTimeSec,
      missedKeywords,
      bestRule,
      worstRule,
      rules: completedRules,
    }

    saveHistory(historyItem)
    clearDirty()
    abandonCurrentSessionState()
    setActiveTab("results")
    setHistoryOpenId(historyItem.id)
  }

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

    if (trainingMode === "timed") {
      setRemainingSeconds(quizConfig.timePerQuestion)
      setTimerStarted(false)
    } else {
      setRemainingSeconds(null)
      setTimerStarted(false)
    }
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
    setSessionPaused(false)
    setMode("typing")
    setResult(null)
    setAnswer("")
    setRemainingSeconds(null)
    setTimerStarted(false)
    setModeSwitchRequest(null)
  }

  function cancelModeSwitch() {
    setModeSwitchRequest(null)
  }

  useEffect(() => {
    async function loadWeakAreaRulesForTraining() {
      if (!currentUserId) {
        setWeakAreaItems([])
        setWeakAreaRuleIds([])
        return
      }

      try {
        const res = await fetch(`/api/weak-areas?userId=${currentUserId}`, {
          cache: "no-store",
        })

        const data = await res.json()
        const rows = Array.isArray(data) ? data : Array.isArray(data?.weakAreas) ? data.weakAreas : []

        const ids = rows
          .map((item: any) => String(item?.ruleId || item?.id || "").trim())
          .filter(Boolean)

        setWeakAreaItems(rows)
        setWeakAreaRuleIds(Array.from(new Set(ids)))
      } catch (error) {
        console.error("WEAK FOCUS LOAD WEAK AREAS ERROR:", error)
        setWeakAreaItems([])
        setWeakAreaRuleIds([])
      }
    }

    loadWeakAreaRulesForTraining()
  }, [currentUserId])

  const selectedSubject = visibleSubjects.find((s) => s.id === selectedSubjectId)
  const selectedRule = selectedRuleIndex !== null ? rules[selectedRuleIndex] : null
  const activeQueueTotal = trainingQueue.length > 0 ? trainingQueue.length : rules.length
  const activeQueuePosition =
    selectedRuleIndex !== null && trainingQueue.length > 0
      ? Math.max(0, trainingQueue.indexOf(selectedRuleIndex)) + 1
      : selectedRuleIndex !== null
        ? selectedRuleIndex + 1
        : 1

  const effectiveQuestionStyle = getEffectiveQuestionStyle(
    quizConfig.questionStyle,
    selectedRule
  )
  const activePromptText = buildPromptText(selectedRule, effectiveQuestionStyle)

  async function startStudySession(selectedMode: string) {
    if (studySessionId || !currentUserId) return

    try {
      const res = await fetch("/api/study-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    const res = await fetch(`/api/get-rules-by-subject?subjectId=${subject.id}`, {
      cache: "no-store",
    })
    const data = await res.json()

    if (!Array.isArray(data)) {
      alert("Failed to load rules")
      setRules([])
      return
    }

    const normalizedRules: Rule[] = data.map((rule: any) => {
      const normalized = normalizeRuleRow(rule)
      return {
        ...normalized,
        subject_id: normalized.subject_id || subject.id,
        subject: normalized.subject || subject.name,
      }
    })

    const canonicalRules = mergeUniqueRules(normalizedRules)

    setRules(canonicalRules)
    setAnswer("")

    const weakId = searchParams.get("weak")
    if (weakId) {
      const index = canonicalRules.findIndex((r) => r.id === weakId)
      if (index !== -1) {
        setSelectedRuleIndex(index)
        setTrainingMode("weak_focus")
        setSelectedSessionType("weak_focus")
        setAnswerStartTime(Date.now())
        return
      }
    }

    if (canonicalRules.length > 0) {
      const initialQueue = buildTrainingQueue(
        canonicalRules,
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
          const normalized = data
            .map((row: any) => normalizeRuleRow(row))
            .filter((row) => row.id)

          setAllRules(mergeUniqueRules(normalized))
        } else {
          setAllRules([])
        }
      } catch (err) {
        console.error("Failed to load all rules", err)
        setAllRules([])
      }
    }

    async function loadSubjects() {
      const res = await fetch(`/api/get-subjects?userId=${currentUserId}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!Array.isArray(data)) return

      const filtered = data.filter(
        (subject: Subject) => subject.show_in_rule_training !== false
      )
      setSubjects(filtered)

      if (!restoredSessionRef.current && filtered.length > 0) {
        await onPickSubject(filtered[0])
      }
    }

    loadWeakRules()
    loadAllRules()
    loadSubjects()

    const weakId = searchParams.get("weak")
    if (weakId && !restoredSessionRef.current) {
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

    if (sessionStarted && restoredSessionRef.current) return

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
  }, [rules, quizConfig.size, quizConfig.order, weakRules, selectedRuleIndex, sessionStarted])

  useEffect(() => {
    if (!sessionStarted || trainingMode !== "timed") return
    if (sessionPaused) return
    if (!timerStarted) return
    if (result) return

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [sessionStarted, trainingMode, sessionPaused, timerStarted, result])

  useEffect(() => {
    if (trainingMode !== "timed") return
    if (!sessionStarted) return
    if (sessionPaused) return
    if (isSubmitting) return
    if (result) return
    if (remainingSeconds !== 0) return

    void handleSubmit()
  }, [remainingSeconds, trainingMode, sessionStarted, sessionPaused, isSubmitting, result])

  async function submitModeAttempt(payload: ModeAttemptPayload) {
    if (selectedRuleIndex === null || isSubmitting || !currentUserId) return
    if (!rules[selectedRuleIndex]) return

    setIsSubmitting(true)

    try {
      const recallTime = Date.now() - answerStartTime
      const recallSeconds = Math.round(recallTime / 1000)
      const rule = rules[selectedRuleIndex]

      const res = await fetch("/api/submit-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: rule.id,
          userAnswer: payload.userAnswer,
          userId: currentUserId,
          mode,
          exerciseMode: mode,
          trainingMode,
          scoreOverride: payload.score,
          matchedKeywordsOverride: payload.matchedKeywords,
          missedKeywordsOverride: payload.missedKeywords,
          keywordScoreOverride: payload.keywordScore,
          similarityOverride: payload.similarity,
        }),
      })

      const data = await res.json()

      const matched_keywords = data.matched_keywords ?? payload.matchedKeywords ?? []
      const missed_keywords = data.missed_keywords ?? payload.missedKeywords ?? []
      const score = typeof data.score === "number" ? data.score : payload.score

      const keywordScore =
        typeof data.keywordScore === "number"
          ? data.keywordScore
          : payload.keywordScore

      const similarity =
        typeof data.similarity === "number"
          ? data.similarity
          : payload.similarity

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
        return { ...prev, [rule.id]: updated }
      })

      const now = Date.now()
      let delay = 0
      if (score < 50) delay = 0
      else if (score < 70 || recallSeconds > 40) delay = 1
      else if (score < 85 || recallSeconds > 25) delay = 3
      else if (score < 95 || recallSeconds > 15) delay = 7
      else delay = 21

      const nextReview = now + delay * 24 * 60 * 60 * 1000
      setRuleSchedule((prev) => ({ ...prev, [rule.id]: nextReview }))

      if (score >= 70 && drillFromWeakAreasFromUrl) {
        setDirectWeakCompletedRuleIds((prev) =>
          prev.includes(rule.id) ? prev : [...prev, rule.id]
        )
        setWeakRules((prev) => prev.filter((id) => id !== rule.id))
        setWeakAreaRuleIds((prev) => prev.filter((id) => id !== rule.id))
        setWeakAreaItems((prev) =>
          prev.filter((item) => String(item?.ruleId || item?.id || "").trim() !== rule.id)
        )
      } else if (score < 65) {
        setWeakRules((prev) => (prev.includes(rule.id) ? prev : [...prev, rule.id]))
      }

      setRules((prev) =>
        prev.map((r, i) => (i === selectedRuleIndex ? { ...r, avgScore: score } : r))
      )

      setSessionRuleResults((prev) => {
        const next = prev.filter((item) => item.ruleId !== rule.id)
        next.push({
          ruleId: rule.id,
          title: rule.title,
          score,
          matchedKeywords: Array.isArray(matched_keywords) ? matched_keywords : [],
          missedKeywords: Array.isArray(missed_keywords) ? missed_keywords : [],
          keywordScore,
          similarity,
          timeSpentSec: recallSeconds,
        })
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: rule.id,
          userAnswer: safeAnswer,
          userId: currentUserId,
          mode,
          exerciseMode: mode,
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
            ? Math.round((matched_keywords.length / (rule.keywords?.length ?? 1)) * 100)
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
        return { ...prev, [rule.id]: updated }
      })

      const now = Date.now()
      let delay = 0
      if (score < 50) delay = 0
      else if (score < 70 || recallSeconds > 40) delay = 1
      else if (score < 85 || recallSeconds > 25) delay = 3
      else if (score < 95 || recallSeconds > 15) delay = 7
      else delay = 21

      const nextReview = now + delay * 24 * 60 * 60 * 1000
      setRuleSchedule((prev) => ({ ...prev, [rule.id]: nextReview }))

      if (score >= 70 && drillFromWeakAreasFromUrl) {
        setDirectWeakCompletedRuleIds((prev) =>
          prev.includes(rule.id) ? prev : [...prev, rule.id]
        )
        setWeakRules((prev) => prev.filter((id) => id !== rule.id))
        setWeakAreaRuleIds((prev) => prev.filter((id) => id !== rule.id))
        setWeakAreaItems((prev) =>
          prev.filter((item) => String(item?.ruleId || item?.id || "").trim() !== rule.id)
        )
      } else if (score < 65) {
        setWeakRules((prev) => (prev.includes(rule.id) ? prev : [...prev, rule.id]))
      }

      setRules((prev) =>
        prev.map((r, i) => (i === selectedRuleIndex ? { ...r, avgScore: score } : r))
      )

      setSessionRuleResults((prev) => {
        const next = prev.filter((item) => item.ruleId !== rule.id)
        next.push({
          ruleId: rule.id,
          title: rule.title,
          score,
          matchedKeywords: Array.isArray(matched_keywords) ? matched_keywords : [],
          missedKeywords: Array.isArray(missed_keywords) ? missed_keywords : [],
          keywordScore,
          similarity,
          timeSpentSec: recallSeconds,
        })
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleNextRule() {
    if (selectedRuleIndex === null) return

    const completedSet = new Set(directWeakCompletedRuleIds)

    if (
      drillFromWeakAreasFromUrl &&
      selectedRuleIndex !== null &&
      rules[selectedRuleIndex] &&
      result &&
      (result.score ?? 0) >= 70
    ) {
      completedSet.add(rules[selectedRuleIndex].id)
    }

    let nextIndex: number | null = null

    if (trainingQueue.length > 0) {
      const currentPosition = trainingQueue.indexOf(selectedRuleIndex)

      for (let i = currentPosition + 1; i < trainingQueue.length; i += 1) {
        const candidateIndex = trainingQueue[i]
        const candidateRule = rules[candidateIndex]

        if (!candidateRule) continue
        if (drillFromWeakAreasFromUrl && completedSet.has(candidateRule.id)) continue

        nextIndex = candidateIndex
        break
      }
    } else {
      for (let i = selectedRuleIndex + 1; i < rules.length; i += 1) {
        const candidateRule = rules[i]

        if (!candidateRule) continue
        if (drillFromWeakAreasFromUrl && completedSet.has(candidateRule.id)) continue

        nextIndex = i
        break
      }
    }

    if (nextIndex === null) {
      if (drillFromWeakAreasFromUrl && returnToFromUrl) {
        const completedIds = Array.from(completedSet)

        clearDirty()

        const params = new URLSearchParams()
        params.set("refresh", "1")
        if (completedIds.length > 0) {
          params.set("completedRuleIds", completedIds.join(","))
        }

        router.push(`${returnToFromUrl}?${params.toString()}`)
        return
      }

      finalizeSession()
      return
    }

    setSelectedRuleIndex(nextIndex)
    resetAnswerState()
  }

  async function handleSaveRule() {
    if (!selectedRule || !currentUserId) return

    try {
      const res = await fetch("/api/rules/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          ruleId: selectedRule.id,
        }),
      })

      if (!res.ok) {
        alert("Could not save rule.")
        return
      }

      setSavedRuleIds((prev) =>
        prev.includes(selectedRule.id) ? prev : [...prev, selectedRule.id]
      )
    } catch (err) {
      console.error(err)
      alert("Could not save rule.")
    }
  }

  async function handleReportRule(payload?: { reason: string; details: string }) {
    if (!selectedRule || !currentUserId) return

    try {
      const res = await fetch("/api/rules/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          ruleId: selectedRule.id,
          reason: payload?.reason || "incorrect_rule",
          details: payload?.details || "",
        }),
      })

      if (!res.ok) {
        alert("Could not report rule.")
        return
      }

      setReportedRuleIds((prev) =>
        prev.includes(selectedRule.id) ? prev : [...prev, selectedRule.id]
      )
    } catch (err) {
      console.error(err)
      alert("Could not report rule.")
    }
  }

  function stopSession(clearPersisted = true) {
    clearDirty()
    setSessionStarted(false)
    setSessionPaused(false)
    setSelectedRuleIndex(null)
    setRules([])
    setTrainingQueue([])
    setResult(null)
    setAnswer("")
    setSessionRuleResults([])
    setSavedRuleIds([])
    setReportedRuleIds([])
    setRemainingSeconds(null)
    setTimerStarted(false)
    setStopConfirmOpen(false)

    if (clearPersisted) {
      try {
        sessionStorage.removeItem(STORAGE_ACTIVE_SESSION)
      } catch (error) {
        console.error("SESSION STORAGE CLEAR ERROR:", error)
      }
    }
  }

  function goBackToSetup() {
    requestAction(async () => {
      setActiveTab("setup")
      stopSession(true)
    })
  }

  function finishDirectWeakAreaDrill() {
    if (!drillFromWeakAreasFromUrl || !returnToFromUrl) {
      finalizeSession()
      return
    }

    const completedSet = new Set(directWeakCompletedRuleIds)

    if (
      selectedRuleIndex !== null &&
      rules[selectedRuleIndex] &&
      result &&
      (result.score ?? 0) >= 70
    ) {
      completedSet.add(rules[selectedRuleIndex].id)
    }

    clearDirty()

    const params = new URLSearchParams()
    params.set("refresh", "1")

    const completedIds = Array.from(completedSet)
    if (completedIds.length > 0) {
      params.set("completedRuleIds", completedIds.join(","))
    }

    router.push(`${returnToFromUrl}?${params.toString()}`)
  }


  function handlePauseSession() {
    if (!sessionStarted) return
    setSessionPaused((prev) => !prev)
  }

  function handleSaveActiveSession() {
    if (drillFromWeakAreasFromUrl && returnToFromUrl) {
      finishDirectWeakAreaDrill()
      return
    }

    saveCurrentSessionDraft()
    stopSession(true)
    setActiveTab("active")
  }

  function confirmStopToActiveSession() {
    if (drillFromWeakAreasFromUrl && returnToFromUrl) {
      finishDirectWeakAreaDrill()
      return
    }

    saveCurrentSessionDraft()
    stopSession(true)
    setActiveTab("active")
  }

  async function fetchRulesForSubjectIds(subjectIds: string[]) {
    const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)))
    if (uniqueIds.length === 0) return []

    const results = await Promise.all(
      uniqueIds.map(async (subjectId) => {
        const res = await fetch(`/api/get-rules-by-subject?subjectId=${subjectId}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (!Array.isArray(data)) return []
        return data.map((row: any) => normalizeRuleRow(row))
      })
    )

    return mergeUniqueRules(results.flat())
  }

  // DIRECT_WEAK_AREAS_SKIP_RESTORE_FIX
  useEffect(() => {
    if (!drillFromWeakAreasFromUrl) return

    restoredSessionRef.current = true

    try {
        sessionStorage.removeItem("STORAGE_ACTIVE_SESSION")
        sessionStorage.removeItem("lexora-rule-training-active-session")
        sessionStorage.removeItem("lexora_rule_training_active_drafts_v3")
        sessionStorage.removeItem("lexora_rule_training_active_session_v6")
        sessionStorage.removeItem("lexora_rule_training_session_history_v3")
        sessionStorage.removeItem("rule-training-active-session")
    } catch (error) {
      console.error("DIRECT WEAK DRILL SESSION STORAGE CLEAR ERROR:", error)
    }
  }, [drillFromWeakAreasFromUrl])

  // WEAK_FOCUS_URL_MODE_SYNC_FINAL
  useEffect(() => {
    const shouldUseWeakFocus =
      modeFromUrl === "weak_focus" ||
      modeFromUrl === "weak-focus" ||
      searchParams.get("trainingMode") === "weak_focus"

    if (!shouldUseWeakFocus) return

    setTrainingMode("weak_focus")
    setSelectedSessionType("weak_focus")
  }, [modeFromUrl, searchParams])

  // ACTIVE_SESSION_SCROLL_FIX
  useEffect(() => {
    if (!sessionStarted || activeTab !== "active") return

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })

      const appMain = document.querySelector("main")
      if (appMain) {
        appMain.scrollTo({ top: 0, left: 0, behavior: "auto" })
      }

      const scrollContainers = document.querySelectorAll("[data-radix-scroll-area-viewport], .overflow-y-auto, .overflow-auto")
      scrollContainers.forEach((container) => {
        if (container instanceof HTMLElement) {
          container.scrollTop = 0
        }
      })
    }

    resetScroll()
    requestAnimationFrame(resetScroll)
    window.setTimeout(resetScroll, 50)
  }, [sessionStarted, activeTab, selectedRuleIndex])

  // WEAK_AREAS_DIRECT_DRILL_QUEUE_FIX
  useEffect(() => {
    if (!authReady) return
    if (!currentUserId) return
    if (!autoStartFromUrl) return
    if (!drillFromWeakAreasFromUrl) return
    if (!weakFocusRuleIdFromUrl) return
    if (sessionStarted) return
    if (allRules.length === 0) return
    if (weakAreaItems.length === 0) return

    const clickedRuleId = String(weakFocusRuleIdFromUrl).trim()
    const targetSubject = String(weakFocusSubjectFromUrl || "").trim()

    const sameSubjectWeakIds = weakAreaItems
      .filter((item) => {
        const itemSubject = String(item?.subject || "").trim()
        if (!targetSubject) return true
        return itemSubject === targetSubject
      })
      .map((item) => String(item?.id || item?.ruleId || "").trim())
      .filter(Boolean)

    const orderedIds = [
      clickedRuleId,
      ...sameSubjectWeakIds.filter((id) => id !== clickedRuleId),
    ]

    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))
    const orderedRules = orderedIds
      .map((id) => ruleById.get(id))
      .filter(Boolean) as Rule[]

    if (orderedRules.length === 0) return

    setSelectedSessionType("weak_focus")
    setTrainingMode("weak_focus")
    setRules(orderedRules)
    setTrainingQueue(orderedRules.map((_, index) => index))
    setSelectedRuleIndex(0)
    setResult(null)
    setAnswer("")
    setAttempts([])
    setSessionRuleResults([])
    setDirectWeakCompletedRuleIds([])
    setSessionStarted(true)
    setActiveTab("active")
    setAnswerStartTime(Date.now())
  }, [
    authReady,
    currentUserId,
    autoStartFromUrl,
    drillFromWeakAreasFromUrl,
    weakFocusRuleIdFromUrl,
    weakFocusSubjectFromUrl,
    sessionStarted,
    allRules,
    weakAreaItems,
  ])

  async function resolveRulesForSession(
    effectiveMode: SessionType
  ): Promise<Rule[]> {
    const now = Date.now()

    if (effectiveMode === "weak_focus") {
      const directWeakRuleId = String(weakFocusRuleIdFromUrl || "").trim()

      if (directWeakRuleId) {
        const existingDirectRule = allRules.find((rule) => rule.id === directWeakRuleId)

        if (existingDirectRule) {
          return [existingDirectRule]
        }

        try {
          const detailRes = await fetch(
            `/api/rules/detail?ruleId=${encodeURIComponent(directWeakRuleId)}`,
            {
              cache: "no-store",
            }
          )

          if (detailRes.ok) {
            const detailData = await detailRes.json()
            const detailRule = detailData?.rule

            if (detailRule?.id) {
              return [
                {
                  id: String(detailRule.id),
                  title: String(detailRule.title || "Untitled Rule"),
                  rule: String(detailRule.title || "Untitled Rule"),
                  subject: String(detailRule.subject || ""),
                  topic: String(detailRule.topic || ""),
                  subtopic: String(detailRule.subtopic || ""),
                  ruleText: String(detailRule.ruleText || ""),
                  rule_text: String(detailRule.ruleText || ""),
                  promptQuestion: String(detailRule.promptQuestion || ""),
                  prompt_question: String(detailRule.promptQuestion || ""),
                  applicationExample: String(detailRule.applicationExample || ""),
                  application_example: String(detailRule.applicationExample || ""),
                  commonTrap: Array.isArray(detailRule.commonTraps)
                    ? detailRule.commonTraps
                        .map((trap: any) => `${trap?.title || "Common Trap"}: ${trap?.explanation || ""}`)
                        .join(" ")
                    : "",
                  common_trap: Array.isArray(detailRule.commonTraps)
                    ? detailRule.commonTraps
                        .map((trap: any) => `${trap?.title || "Common Trap"}: ${trap?.explanation || ""}`)
                        .join(" ")
                    : "",
                  howToApply: Array.isArray(detailRule.howToApply) ? detailRule.howToApply : [],
                  commonTraps: Array.isArray(detailRule.commonTraps) ? detailRule.commonTraps : [],
                  examTip: String(detailRule.examTip || ""),
                } as Rule,
              ]
            }
          }
        } catch (error) {
          console.error("DIRECT WEAK RULE LOAD ERROR:", error)
        }
      }

      const activeWeakRuleIds = weakAreaRuleIds.length > 0 ? weakAreaRuleIds : weakRules
      let weakOnly = allRules.filter((r) => activeWeakRuleIds.includes(r.id))

      if (weakOnly.length === 0 && visibleSubjects.length > 0) {
        const fetched = await fetchRulesForSubjectIds(visibleSubjects.map((s) => s.id))
        weakOnly = fetched.filter((r) => activeWeakRuleIds.includes(r.id))
      }

      const selectedWeakSubjectNames = weakFocusSubjectCards
        .filter((subject) => quizConfig.subjectIds.includes(subject.id))
        .map((subject) => subject.name)

      const selectedTopicKeys = new Set<string>(
        selectedTopicIds.map((value) => String(value || "").trim()).filter(Boolean)
      )

      for (const subjectTopics of topicsBySubject.values()) {
        for (const topic of subjectTopics) {
          const topicId = String(topic.id || "").trim()
          const topicName = String(topic.name || "").trim()

          if (selectedTopicKeys.has(topicId) || selectedTopicKeys.has(topicName)) {
            if (topicId) selectedTopicKeys.add(topicId)
            if (topicName) selectedTopicKeys.add(topicName)
          }
        }
      }

      const hasWeakSubjectSelection = quizConfig.subjectIds.length > 0
      const hasWeakTopicSelection = selectedTopicKeys.size > 0

      if (hasWeakSubjectSelection || hasWeakTopicSelection) {
        weakOnly = weakOnly.filter((rule) => {
          const ruleSubjectId = String(rule.subject_id || "").trim()
          const ruleSubjectName = String(rule.subject || "").trim()
          const ruleTopicId = String(rule.topic_id || "").trim()
          const ruleTopicName = String(rule.topic || "").trim()

          const subjectMatch =
            !hasWeakSubjectSelection ||
            quizConfig.subjectIds.includes(ruleSubjectId) ||
            selectedWeakSubjectNames.includes(ruleSubjectName)

          const topicMatch =
            !hasWeakTopicSelection ||
            selectedTopicKeys.has(ruleTopicId) ||
            selectedTopicKeys.has(ruleTopicName)

          return subjectMatch && topicMatch
        })
      }

        return mergeUniqueRules(
          weakOnly.filter((rule) => {
            const nextReview = ruleSchedule[rule.id]
            if (!nextReview) return true
            return nextReview <= now
          })
        )
      }

      const selectedSubjectNames = subjectCards
        .filter((subject) => quizConfig.subjectIds.includes(subject.id))
        .map((subject) => subject.name)

      let filtered = [...allRules]

    const hasSubjectSelection = quizConfig.subjectIds.length > 0
    const hasTopicSelection = selectedTopicIds.length > 0

    if (hasSubjectSelection || hasTopicSelection) {
      filtered = filtered.filter((r) => {
        const subjectMatch =
          (r.subject_id && quizConfig.subjectIds.includes(r.subject_id)) ||
          (r.subject && selectedSubjectNames.includes(r.subject))

        const topicMatch =
          (r.topic_id && selectedTopicIds.includes(r.topic_id)) ||
          (r.topic && selectedTopicIds.includes(r.topic))

        if (hasSubjectSelection && hasTopicSelection) {
          return subjectMatch || topicMatch
        }

        if (hasSubjectSelection) return !!subjectMatch
        if (hasTopicSelection) return !!topicMatch
        return true
      })
    }

    if (filtered.length === 0 && quizConfig.subjectIds.length > 0) {
      const fetched = await fetchRulesForSubjectIds(quizConfig.subjectIds)
      filtered = fetched.filter((r) => {
        if (!hasTopicSelection) return true
        return (
          (r.topic_id && selectedTopicIds.includes(r.topic_id)) ||
          (r.topic && selectedTopicIds.includes(r.topic))
        )
      })
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

    filtered = filtered.filter((r) => {
      const nextReview = ruleSchedule[r.id]
      if (!nextReview) return true
      return nextReview <= now
    })

    return mergeUniqueRules(filtered)
  }

  async function startConfiguredSession(nextMode?: SessionType) {
    const effectiveMode = nextMode ?? trainingMode

    try {
      sessionStorage.removeItem(STORAGE_ACTIVE_SESSION)
    } catch (error) {
      console.error("ACTIVE SESSION RESET ERROR:", error)
    }

    let finalRules = await resolveRulesForSession(effectiveMode)

    if (finalRules.length === 0) {
      alert("No rules found for this selection.")
      return
    }

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

    if (finalRules.length === 0) {
      alert("No rules found for this selection.")
      return
    }

    const nextQueue = buildTrainingQueue(
      finalRules,
      quizConfig.size,
      weakRules,
      quizConfig.order
    )

    if (nextQueue.length === 0) {
      alert("No rules found for this selection.")
      return
    }

    setTrainingMode(effectiveMode)
    setSelectedSessionType(effectiveMode)
    setRules(finalRules)
    setTrainingQueue(nextQueue)
    setSelectedRuleIndex(nextQueue[0] ?? null)
    setSelectedSubjectId(finalRules[nextQueue[0] ?? 0]?.subject_id ?? null)
    setMode("typing")
    setResult(null)
    setAnswer("")
    setSessionRuleResults([])
    setSavedRuleIds([])
    setReportedRuleIds([])
    setSessionPaused(false)
    setSessionStarted(true)
    setAnswerStartTime(Date.now())
    setStudySessionId(`${Date.now()}`)

    if (effectiveMode === "timed") {
      setRemainingSeconds(quizConfig.timePerQuestion)
      setTimerStarted(false)
    } else {
      setRemainingSeconds(null)
      setTimerStarted(false)
    }

    try {
      sessionStorage.removeItem(STORAGE_ACTIVE_SESSION)
    } catch (error) {
      console.error("CLEAR STALE LIVE SESSION ERROR:", error)
    }
  }

  const mbeSubjects = useMemo(
    () => visibleSubjects.filter((s) => getSubjectGroup(s.name) === "MBE"),
    [visibleSubjects]
  )

  const meeSubjects = useMemo(
    () => visibleSubjects.filter((s) => getSubjectGroup(s.name) === "MEE"),
    [visibleSubjects]
  )

  const currentSessionAverage =
    sessionRuleResults.length > 0
      ? Math.round(
          sessionRuleResults.reduce((sum, item) => sum + item.score, 0) /
            sessionRuleResults.length
        )
      : 0

  const filteredRules = useMemo(() => {
    let baseRules = rules
    if (trainingMode === "weak_focus") {
      baseRules = rules.filter((r) => weakRules.includes(r.id))
    }
    return baseRules
  }, [rules, trainingMode, weakRules])

  const subjectCards = useMemo(() => {
    return visibleSubjects.map((subject) => {
      const total =
        typeof subject.total_rules === "number"
          ? subject.total_rules
          : allRules.filter(
              (r) => r.subject_id === subject.id || r.subject === subject.name
            ).length

      const weak =
        typeof subject.weak_rules === "number"
          ? subject.weak_rules
          : allRules.filter(
              (r) =>
                (r.subject_id === subject.id || r.subject === subject.name) &&
                weakRules.includes(r.id)
            ).length

      return {
        ...subject,
        total,
        weak,
        group: getSubjectGroup(subject.name),
      }
    })
  }, [visibleSubjects, allRules, weakRules])

  const weakFocusSubjectCards = useMemo(() => {
    const subjectCounts = new Map<string, number>()

    for (const item of weakAreaItems) {
      const subjectName = String(item?.subject || "Unknown").trim()
      if (!subjectName) continue
      subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1)
    }

    return subjectCards
      .map((subject) => {
        const weakCount = subjectCounts.get(subject.name) || 0
        return {
          ...subject,
          total: weakCount,
          weak: weakCount,
        }
      })
      .filter((subject) => (subject.weak ?? 0) > 0)
  }, [subjectCards, weakAreaItems])

  const weakFocusTopicsBySubject = useMemo(() => {
    const result = new Map<string, TopicOption[]>()

    for (const subject of weakFocusSubjectCards) {
      const topicMap = new Map<string, TopicOption>()

      for (const item of weakAreaItems) {
        const itemSubject = String(item?.subject || "").trim()
        if (itemSubject !== subject.name) continue

        const topicName = String(item?.topic || "Uncategorized").trim() || "Uncategorized"
        const topicKey = topicName.toLowerCase()
        const existing = topicMap.get(topicKey)
        const nextCount = Number(existing?.count || 0) + 1

        topicMap.set(topicKey, {
          id: topicName,
          name: topicName,
          subjectId: subject.id,
          subjectName: subject.name,
          count: nextCount,
        })
      }

      result.set(subject.id, Array.from(topicMap.values()))
    }

    return result
  }, [weakFocusSubjectCards, weakAreaItems])

  const previewSubjectNames = subjectCards
    .filter((s) => quizConfig.subjectIds.includes(s.id))
    .map((s) => s.name)

  const previewTopicNames = useMemo(() => {
    const names: string[] = []
    for (const subjectTopics of topicsBySubject.values()) {
      for (const topic of subjectTopics) {
        if (selectedTopicIds.includes(topic.id)) names.push(topic.name)
      }
    }
    return names
  }, [topicsBySubject, selectedTopicIds])

  const selectedStyleLabel =
    quizConfig.questionStyle === "prompt"
      ? "Question Prompt"
      : quizConfig.questionStyle === "recite"
        ? "Recite the Rule"
        : "Mixed"

  const sessionMeta = getSessionTypeMeta(selectedSessionType)
  const setupProgress = getSetupProgressPercent({
    selectedSessionType,
    selectedSubjectsCount: previewSubjectNames.length,
    selectedTopicsCount: selectedTopicIds.length,
    size: quizConfig.size,
    order: quizConfig.order,
  })

  const historyItems = useMemo(() => {
    return sessionHistory.filter((item) => {
      const modeOk = historyFilter === "all" ? true : item.mode === historyFilter
      const date = new Date(item.createdAt).getTime()
      const startOk = historyDateStart
        ? date >= new Date(`${historyDateStart}T00:00:00`).getTime()
        : true
      const endOk = historyDateEnd
        ? date <= new Date(`${historyDateEnd}T23:59:59`).getTime()
        : true

      return modeOk && startOk && endOk
    })
  }, [sessionHistory, historyFilter, historyDateStart, historyDateEnd])

  const draftGroups = useMemo(() => {
    const grouped = new Map<string, SessionDraft[]>()
    for (const draft of sessionDrafts) {
      const key = getDraftGroupName(draft)
      const list = grouped.get(key) ?? []
      list.push(draft)
      grouped.set(key, list)
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sessionDrafts])

  const totalSessionRules = Math.max(trainingQueue.length || rules.length, 1)
  const completedCount = sessionRuleResults.length
  const progressPercent = Math.min(
    100,
    Math.round((completedCount / totalSessionRules) * 100)
  )

  const headerSubjectName =
    selectedRule?.subject ||
    selectedSubject?.name ||
    (previewSubjectNames.length === 1 ? previewSubjectNames[0] : "Multiple Subjects")

  function applySubjectPreset(preset: "all" | "mbe" | "mee" | "weak" | "clear") {
    if (preset === "all") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.map((s) => s.id),
        ruleFilter: "all",
        weakOnly: false,
      }))
      setSelectedTopicIds([])
      return
    }

    if (preset === "mbe") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => s.group === "MBE").map((s) => s.id),
        weakOnly: false,
      }))
      setSelectedTopicIds([])
      return
    }

    if (preset === "mee") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => s.group === "MEE").map((s) => s.id),
        weakOnly: false,
      }))
      setSelectedTopicIds([])
      return
    }

    if (preset === "weak") {
      setQuizConfig((prev) => ({
        ...prev,
        subjectIds: subjectCards.filter((s) => (s.weak ?? 0) > 0).map((s) => s.id),
        weakOnly: true,
        ruleFilter: "weak",
      }))
      setSelectedTopicIds([])
      return
    }

    setQuizConfig((prev) => ({
      ...prev,
      subjectIds: [],
      weakOnly: false,
      ruleFilter: "all",
    }))
    setSelectedTopicIds([])
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

  function toggleExpandedSubject(subjectId: string) {
    setExpandedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    )
  }

  function toggleWholeSubjectOnly(subjectId: string) {
    toggleQuizSubject(subjectId)
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

  function handleTypedAnswerChange(value: string) {
    if (trainingMode === "timed" && !timerStarted && value.trim().length > 0) {
      setTimerStarted(true)
      if (remainingSeconds === null) {
        setRemainingSeconds(quizConfig.timePerQuestion)
      }
    }
    setAnswer(value)
  }

  function renderSectionHeader(
    label: string,
    count: number,
    open: boolean,
    onToggle: () => void
  ) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-1.5 mt-2.5 flex w-full items-center justify-between text-left"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label} ({count})
        </div>
        {open ? (
          <ChevronUp size={13} className="text-slate-400" />
        ) : (
          <ChevronDown size={13} className="text-slate-400" />
        )}
      </button>
    )
  }

  function renderSubjectRow(subject: Subject) {
    const active = selectedSubjectId === subject.id
    const total = subject.total_rules ?? 0
    const done = subject.completed_rules ?? 0
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)

    return (
      <button
        type="button"
        key={subject.id}
        onClick={() => onPickSubject(subject)}
        className={`mb-1 w-full rounded-lg px-2 py-2 text-left transition ${
          active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={`truncate text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
              {subject.name}
            </div>

            {!!subject.badge_text && (
              <div
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                  subject.badge_tone === "removed"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {subject.badge_text}
              </div>
            )}
          </div>

          <div className="shrink-0 text-[9px] text-slate-400">{total}r</div>
        </div>

        <div className="h-1 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
        </div>
      </button>
    )
  }

  if (!authReady) {
    return <div className="p-10 text-sm text-slate-500">Loading...</div>
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-5">
        {!sessionStarted && (
          <>
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("setup")}
                  className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
                    activeTab === "setup"
                      ? "bg-[#0F172A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Setup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("active")}
                  className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
                    activeTab === "active"
                      ? "bg-[#0F172A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Active Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("results")}
                  className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
                    activeTab === "results"
                      ? "bg-[#0F172A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Results
                </button>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Rule Training
              </div>
            </div>

            {activeTab === "setup" && (
              <>
                <div className="mb-5">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Session Configuration
                  </div>
                  <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">
                    Choose your session
                  </h1>
                  <p className="mt-1.5 text-[14px] text-slate-500">
                    Pick the mode first, then choose whole subjects or specific topics.
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-4">
                  <ModeTypeCard
                    active={selectedSessionType === "study"}
                    tone="study"
                    title="Study Session"
                    description="Full rule visible. Read and absorb at your pace."
                    icon={<BookOpen size={15} />}
                    onClick={() => {
                      setSelectedSessionType("study")
                      setTrainingMode("study")
                    }}
                  />
                  <ModeTypeCard
                    active={selectedSessionType === "quiz"}
                    tone="quiz"
                    title="Quiz Session"
                    description="Recall based practice. No hints or aids."
                    icon={<NotebookPen size={15} />}
                    onClick={() => {
                      setSelectedSessionType("quiz")
                      setTrainingMode("quiz")
                    }}
                  />
                  <ModeTypeCard
                    active={selectedSessionType === "timed"}
                    tone="timed"
                    title="Timed Session"
                    description="Pressure test your recall under the clock."
                    icon={<Clock3 size={15} />}
                    onClick={() => {
                      setSelectedSessionType("timed")
                      setTrainingMode("timed")
                    }}
                  />
                  <ModeTypeCard
                    active={selectedSessionType === "weak_focus"}
                    tone="weak"
                    title="Weak Focus"
                    description="Auto targets your lowest scored rules."
                    icon={<Star size={15} />}
                    onClick={() => {
                      setSelectedSessionType("weak_focus")
                      setTrainingMode("weak_focus")
                    }}
                  />
                </div>

                {selectedSessionType && (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
                    <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-5">
                      {selectedSessionType === "study" && (
                        <SetupSection
                          title="Build your study session"
                          subtitle="Choose subjects, topics, session size, and order."
                        >
                          <SubjectSelectorBlock
                            title="Choose Subjects and Topics"
                            count={previewSubjectNames.length + selectedTopicIds.length}
                            subjectCards={subjectCards}
                            quizConfig={quizConfig}
                            applySubjectPreset={applySubjectPreset}
                            toggleQuizSubject={toggleQuizSubject}
                            expandedSubjectIds={expandedSubjectIds}
                            toggleExpandedSubject={toggleExpandedSubject}
                            topicsBySubject={topicsBySubject}
                            selectedTopicIds={selectedTopicIds}
                            toggleTopic={toggleTopic}
                            toggleWholeSubjectOnly={toggleWholeSubjectOnly}
                          />

                          <OptionDivider />

                          <SizeBlock
                            size={quizConfig.size}
                            customSize={quizConfig.customSize}
                            setPresetSize={setPresetSize}
                            setCustomSize={setCustomSize}
                          />

                          <OptionDivider />

                          <OrderBlock
                            order={quizConfig.order}
                            options={["sequential", "random"]}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({ ...prev, order: value }))
                            }
                          />
                        </SetupSection>
                      )}

                      {selectedSessionType === "quiz" && (
                        <SetupSection
                          title="Build your quiz session"
                          subtitle="Choose subjects or topics, size, filters, and style."
                        >
                          <SubjectSelectorBlock
                            title="Choose Subjects and Topics"
                            count={previewSubjectNames.length + selectedTopicIds.length}
                            subjectCards={subjectCards}
                            quizConfig={quizConfig}
                            applySubjectPreset={applySubjectPreset}
                            toggleQuizSubject={toggleQuizSubject}
                            expandedSubjectIds={expandedSubjectIds}
                            toggleExpandedSubject={toggleExpandedSubject}
                            topicsBySubject={topicsBySubject}
                            selectedTopicIds={selectedTopicIds}
                            toggleTopic={toggleTopic}
                            toggleWholeSubjectOnly={toggleWholeSubjectOnly}
                            showWeakPreset
                          />

                          <OptionDivider />

                          <SizeBlock
                            size={quizConfig.size}
                            customSize={quizConfig.customSize}
                            setPresetSize={setPresetSize}
                            setCustomSize={setCustomSize}
                          />

                          <OptionDivider />

                          <OrderBlock
                            order={quizConfig.order}
                            options={["sequential", "random", "weakest"]}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({ ...prev, order: value }))
                            }
                          />

                          <OptionDivider />

                          <FilterBlock
                            value={quizConfig.ruleFilter}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({
                                ...prev,
                                ruleFilter: value,
                                weakOnly: value === "weak",
                              }))
                            }
                          />

                          <OptionDivider />

                          <QuestionStyleBlock
                            value={quizConfig.questionStyle}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({ ...prev, questionStyle: value }))
                            }
                          />
                        </SetupSection>
                      )}

                      {selectedSessionType === "timed" && (
                        <SetupSection
                          title="Build your timed session"
                          subtitle="Choose subjects or topics, size, and timer."
                        >
                          <SubjectSelectorBlock
                            title="Choose Subjects and Topics"
                            count={previewSubjectNames.length + selectedTopicIds.length}
                            subjectCards={subjectCards}
                            quizConfig={quizConfig}
                            applySubjectPreset={applySubjectPreset}
                            toggleQuizSubject={toggleQuizSubject}
                            expandedSubjectIds={expandedSubjectIds}
                            toggleExpandedSubject={toggleExpandedSubject}
                            topicsBySubject={topicsBySubject}
                            selectedTopicIds={selectedTopicIds}
                            toggleTopic={toggleTopic}
                            toggleWholeSubjectOnly={toggleWholeSubjectOnly}
                            showWeakPreset
                          />

                          <OptionDivider />

                          <SizeBlock
                            size={quizConfig.size}
                            customSize={quizConfig.customSize}
                            setPresetSize={setPresetSize}
                            setCustomSize={setCustomSize}
                          />

                          <OptionDivider />

                          <div>
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                              Timer
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] text-slate-500">
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
                                className="h-10 w-[86px] rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-blue-400"
                              />
                            </div>
                          </div>

                          <OptionDivider />

                          <OrderBlock
                            order={quizConfig.order}
                            options={["sequential", "random", "weakest"]}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({ ...prev, order: value }))
                            }
                          />
                        </SetupSection>
                      )}

                      {selectedSessionType === "weak_focus" && (
                        <SetupSection
                          title="Train your weak rules"
                          subtitle="Automatically uses weak and overdue rules."
                        >
                          <SubjectSelectorBlock
                              title="Choose Weak Subjects and Topics"
                              count={previewSubjectNames.length + selectedTopicIds.length}
                              subjectCards={weakFocusSubjectCards}
                              quizConfig={quizConfig}
                              applySubjectPreset={applySubjectPreset}
                              toggleQuizSubject={toggleQuizSubject}
                              expandedSubjectIds={expandedSubjectIds}
                              toggleExpandedSubject={toggleExpandedSubject}
                              topicsBySubject={weakFocusTopicsBySubject}
                              selectedTopicIds={selectedTopicIds}
                              toggleTopic={toggleTopic}
                              toggleWholeSubjectOnly={toggleWholeSubjectOnly}
                              showWeakPreset
                            />

                            <OptionDivider />

                            <SizeBlock
                            size={quizConfig.size}
                            customSize={quizConfig.customSize}
                            setPresetSize={setPresetSize}
                            setCustomSize={setCustomSize}
                          />

                          <OptionDivider />

                          <OrderBlock
                            order={quizConfig.order}
                            options={["weakest", "random"]}
                            onChange={(value) =>
                              setQuizConfig((prev) => ({ ...prev, order: value }))
                            }
                          />
                        </SetupSection>
                      )}

                      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuizConfig({
                              size: 10,
                              customSize: "10",
                              timed: false,
                              timePerQuestion: 60,
                              subjectIds: [],
                              weakOnly: false,
                              order: "sequential",
                              ruleFilter: "all",
                              questionStyle: "prompt",
                            })
                            setSelectedTopicIds([])
                            setExpandedSubjectIds([])
                          }}
                          className="rounded-[10px] border border-slate-200 px-5 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Reset
                        </button>

                        <button
                          type="button"
                          onClick={() => startConfiguredSession(selectedSessionType)}
                          className="inline-flex items-center gap-2 rounded-[10px] bg-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Play size={14} />
                          {selectedSessionType === "study"
                            ? "Start Study Session"
                            : selectedSessionType === "quiz"
                              ? "Start Quiz Session"
                              : selectedSessionType === "timed"
                                ? "Start Timed Session"
                                : "Start Weak Focus"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-4">
                      <div className="mb-4 flex items-start gap-3 border-b border-slate-200 pb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-blue-200 bg-blue-50 text-blue-600">
                          {sessionMeta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-900">
                            Session Preview
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Updates live as you configure
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Setup progress</span>
                          <span className="font-semibold text-blue-600">{setupProgress}%</span>
                        </div>
                        <div className="h-[4px] overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7C83F6)] transition-all"
                            style={{ width: `${setupProgress}%` }}
                          />
                        </div>
                      </div>

                      <PreviewRow label="Mode" value={sessionMeta.label} blue />
                      <PreviewRow
                        label="Subjects"
                        value={
                          previewSubjectNames.length > 0
                            ? `${previewSubjectNames.length} selected`
                            : "None selected"
                        }
                      />
                      <PreviewRow
                        label="Topics"
                        value={
                          selectedTopicIds.length > 0
                            ? `${selectedTopicIds.length} selected`
                            : "None selected"
                        }
                      />
                      <PreviewRow label="Session size" value={String(quizConfig.size)} />
                      <PreviewRow
                        label="Order"
                        value={
                          quizConfig.order === "weakest"
                            ? "Weakest First"
                            : quizConfig.order === "random"
                              ? "Random"
                              : "Sequential"
                        }
                      />
                      <PreviewRow
                        label="Rule filter"
                        value={
                          quizConfig.ruleFilter === "all"
                            ? "All rules"
                            : quizConfig.ruleFilter === "weak"
                              ? "Weak only"
                              : quizConfig.ruleFilter === "untrained"
                                ? "Untrained"
                                : "Mastered"
                        }
                      />
                      <PreviewRow label="Style" value={selectedStyleLabel} noBorder />

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Selected Items
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {previewSubjectNames.map((name) => (
                            <span
                              key={`subject-${name}`}
                              className="rounded-[8px] border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                            >
                              {name}
                            </span>
                          ))}

                          {previewTopicNames.map((name) => (
                            <span
                              key={`topic-${name}`}
                              className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                            >
                              {name}
                            </span>
                          ))}

                          {previewSubjectNames.length === 0 && previewTopicNames.length === 0 && (
                            <span className="text-[11px] italic text-slate-400">None yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "active" && (
              <div className="mx-auto max-w-[1120px]">
                {draftGroups.length === 0 ? (
                  <div className="rounded-[18px] border border-slate-200 bg-white px-6 py-10 text-center text-[14px] text-slate-500">
                    No active sessions saved yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftGroups.map(([groupName, drafts]) => {
                      const isOpen = draftGroupOpen[groupName] ?? true

                      return (
                        <div
                          key={groupName}
                          className="overflow-hidden rounded-[16px] border border-slate-200 bg-white"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setDraftGroupOpen((prev) => ({
                                ...prev,
                                [groupName]: !isOpen,
                              }))
                            }
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <div>
                              <div className="text-[14px] font-semibold text-slate-900">
                                {groupName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {drafts.length} active session{drafts.length > 1 ? "s" : ""}
                              </div>
                            </div>

                            {isOpen ? (
                              <ChevronUp size={16} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={16} className="text-slate-400" />
                            )}
                          </button>

                          {isOpen && (
                            <div className="border-t border-slate-200">
                              {drafts.map((draft) => {
                                const draftProgress = Math.min(
                                  100,
                                  Math.round(
                                    ((draft.sessionRuleResults?.length ?? 0) /
                                      Math.max(
                                        draft.trainingQueue?.length || draft.rules?.length || 1,
                                        1
                                      )) *
                                      100
                                  )
                                )

                                return (
                                  <div
                                    key={draft.id}
                                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-sm not-last:border-b not-last:border-slate-200"
                                  >
                                    <div className="min-w-0">
                                      <div className="mb-1 flex items-center gap-2">
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getHistoryModeTone(draft.trainingMode)}`}
                                        >
                                          {getHistoryModeLabel(draft.trainingMode)}
                                        </span>
                                        <span className="text-[12px] text-slate-400">
                                          {formatDateTimeLabel(draft.savedAt)}
                                        </span>
                                      </div>

                                      <div className="truncate text-[13px] font-semibold text-slate-900">
                                        {draft.label}
                                      </div>

                                      <div className="mt-1 max-w-[260px]">
                                        <div className="h-[4px] overflow-hidden rounded-full bg-slate-100">
                                          <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7C83F6)]"
                                            style={{ width: `${draftProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-[12px] font-semibold text-blue-600">
                                      {draftProgress}%
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => restoreDraft(draft, false)}
                                        className="rounded-[10px] bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                                      >
                                        Resume
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removeDraft(draft.id)}
                                        className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 transition hover:bg-red-100"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
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

            {activeTab === "results" && (
              <div className="mx-auto max-w-[1080px]">
                <div className="mb-2 text-[11px] font-medium text-slate-400">
                  All past training sessions
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {[
                    { id: "all", label: "All" },
                    { id: "quiz", label: "Quiz" },
                    { id: "timed", label: "Timed" },
                    { id: "weak_focus", label: "Weak Focus" },
                    { id: "study", label: "Study" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHistoryFilter(item.id as any)}
                      className={`rounded-[12px] border px-5 py-3 text-[14px] font-semibold transition ${
                        historyFilter === item.id
                          ? "border-[#18181B] bg-[#18181B] text-white"
                          : "border-[#D6D3D1] bg-white text-[#52525B] hover:text-[#18181B]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}

                  <div className="mx-1 h-6 w-px bg-slate-200" />

                  <div className="flex items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5">
                    <Calendar size={16} className="text-slate-400" />
                    <input
                      type="date"
                      value={historyDateStart}
                      onChange={(e) => setHistoryDateStart(e.target.value)}
                      className="text-[13px] text-slate-600 outline-none"
                    />
                    <span className="text-slate-300">—</span>
                    <input
                      type="date"
                      value={historyDateEnd}
                      onChange={(e) => setHistoryDateEnd(e.target.value)}
                      className="text-[13px] text-slate-600 outline-none"
                    />
                  </div>
                </div>

                {historyItems.length === 0 ? (
                  <div className="rounded-[18px] border border-slate-200 bg-white px-6 py-10 text-center text-[14px] text-slate-500">
                    No sessions found for this filter yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyItems.map((item, index) => {
                      const open = historyOpenId === item.id
                      const summaryValue =
                        item.mode === "study"
                          ? "completed"
                          : item.mode === "weak_focus"
                            ? `+${item.improvedCount} improved`
                            : `${item.finalScore ?? 0}%`

                      return (
                        <div
                          key={item.id}
                          className={`overflow-hidden rounded-[18px] border bg-white ${
                            open ? "border-blue-200" : "border-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setHistoryOpenId(open ? null : item.id)}
                            className="flex w-full items-center gap-4 px-5 py-5 text-left"
                          >
                            <div className="text-[16px] font-semibold text-slate-400">
                              #{historyItems.length - index}
                            </div>

                            <span
                              className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${getHistoryModeTone(item.mode)}`}
                            >
                              {getHistoryModeLabel(item.mode)}
                            </span>

                            <div className="text-[16px] font-semibold text-slate-900">
                              {item.subjectName}
                            </div>

                            <div className="text-[15px] text-slate-400">
                              {formatDateLabel(item.createdAt)}
                            </div>

                            <div className="ml-auto flex items-center gap-3">
                              <div
                                className={`text-[16px] font-semibold ${
                                  item.mode === "study"
                                    ? "text-slate-500"
                                    : item.finalScore !== null && item.finalScore >= 70
                                      ? "text-blue-600"
                                      : "text-amber-600"
                                }`}
                              >
                                {summaryValue}
                              </div>
                              {open ? (
                                <ChevronUp size={18} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={18} className="text-slate-400" />
                              )}
                            </div>
                          </button>

                          {open && (
                            <div className="border-t border-slate-200 px-6 py-6">
                              <HistoryDetail item={item} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {sessionStarted && (
          <div
            className={`grid min-h-[calc(100vh-140px)] gap-4 ${
              trainingMode === "study"
                ? "grid-cols-[190px_minmax(0,1fr)_250px]"
                : "grid-cols-[minmax(0,1fr)_250px]"
            }`}
          >
            {trainingMode === "study" && (
              <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
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

            <div className="min-w-0 bg-white">
              {!selectedRule ? (
                <div className="mt-8 text-sm text-slate-500">
                  Select a rule from the left panel
                </div>
              ) : (
                <div
                  className={`mx-auto w-full ${
                    trainingMode === "study" ? "max-w-[980px]" : "max-w-[1120px]"
                  }`}
                >
                  <div className="mb-2 text-[12px] font-medium text-slate-400">
                    {sessionMeta.shortLabel} / {headerSubjectName}
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="text-[13px] text-slate-400">
                      Rule {selectedRuleIndex !== null ? selectedRuleIndex + 1 : 1} of{" "}
                      {filteredRules.length || rules.length}
                    </div>

                    <div className="flex items-center gap-3">
                      {trainingMode === "timed" && (
                        <div
                          className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                            remainingSeconds !== null && remainingSeconds <= 10
                              ? "border-red-200 bg-red-50 text-red-600"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {remainingSeconds !== null
                            ? `${remainingSeconds}s`
                            : `${quizConfig.timePerQuestion}s`}
                        </div>
                      )}

                      <div className="text-[13px] font-semibold text-blue-600">
                        {progressPercent}% complete
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 h-[4px] overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7C83F6)] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="mb-4">
                    <ModeSwitcher mode={mode as any} setMode={setMode as any} />
                  </div>

                  {mode === "typing" && (
                    <TypingMode
                      ruleText={selectedRule.rule_text}
                      keywords={getDisplayKeywordsForResult(result, selectedRule.keywords ?? [])}
                      title={selectedRule.title}
                      promptText={activePromptText as any}
                      defaultShowRule={shouldShowRuleByDefault(trainingMode) as any}
                      answer={typeof answer === "string" ? answer : ""}
                      setAnswer={(value) =>
                        handleTypedAnswerChange(typeof value === "string" ? value : "")
                      }
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
                      keywords={getDisplayKeywordsForResult(result, selectedRule.keywords || [])}
                      onNextRule={handleNextRule}
                      onSubmitModeAttempt={submitModeAttempt}
                      isSubmitting={isSubmitting}
                    />
                  )}

                  {mode === "buzzwords" && (
                    <BuzzwordsMode
                      ruleText={selectedRule.rule_text || ""}
                      keywords={getDisplayKeywordsForResult(result, selectedRule.keywords || [])}
                      onNextRule={handleNextRule}
                      onSubmitModeAttempt={submitModeAttempt}
                      isSubmitting={isSubmitting}
                    />
                  )}

                  {mode === "ordering" && (
                    <OrderingMode
                      ruleText={selectedRule.rule_text || ""}
                      keywords={getDisplayKeywordsForResult(result, selectedRule.keywords || [])}
                      onNextRule={handleNextRule}
                      onSubmitModeAttempt={submitModeAttempt}
                      isSubmitting={isSubmitting}
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
                      keywords={getDisplayKeywordsForResult(result, selectedRule.keywords || [])}
                      onNextRule={handleNextRule}
                      onSaveRule={handleSaveRule}
                      onSubmitModeAttempt={submitModeAttempt}
                      isSubmitting={isSubmitting}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col rounded-[16px] border border-slate-200 bg-white px-3 py-3">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Training Mode
                </div>

                <div className="mb-4 space-y-2">
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
                      <button
                        type="button"
                        key={item.title}
                        onClick={() => changeTrainingMode(item.modeValue)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                          active
                            ? "border border-blue-200 bg-blue-50"
                            : "border border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-[12px] font-semibold text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.sub}</div>
                      </button>
                    )
                  })}
                </div>

                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Session Preview
                </div>

                <div className="mb-4 rounded-[14px] border border-slate-200 bg-white p-2.5">
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
                    label="Completed"
                    value={`${completedCount}/${totalSessionRules}`}
                  />
                  <PreviewRow
                    label="Avg Score"
                    value={`${currentSessionAverage}%`}
                    blue={currentSessionAverage > 0}
                  />
                  <PreviewRow
                    label="Time/Q"
                    value={trainingMode === "timed" ? `${quizConfig.timePerQuestion}s` : "Unlimited"}
                  />
                  <PreviewRow
                    label="State"
                    value={sessionPaused ? "Paused" : "Running"}
                    noBorder
                  />
                </div>
              </div>

              <div>
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Actions
                  </div>

                  {drillFromWeakAreasFromUrl ? (
                    <button
                      type="button"
                      onClick={finishDirectWeakAreaDrill}
                      className="h-11 w-full rounded-[14px] bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800"
                    >
                      Finish Session
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={goBackToSetup}
                        className="h-10 rounded-[12px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={handlePauseSession}
                        className="h-10 rounded-[12px] border border-amber-200 bg-amber-50 text-[13px] font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        {sessionPaused ? "Resume" : "Pause"}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveActiveSession}
                        className="h-10 rounded-[12px] border border-blue-200 bg-blue-50 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() => setStopConfirmOpen(true)}
                        className="h-10 rounded-[12px] border border-rose-200 bg-rose-50 text-[13px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        )}
      </div>

      {modeSwitchRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35">
          <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-2 text-[18px] font-semibold text-slate-900">
              Switch training mode
            </div>
            <div className="mb-5 text-[13px] leading-6 text-slate-500">
              Leave <b>{trainingMode}</b> mode and switch to <b>{modeSwitchRequest}</b>?
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelModeSwitch}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModeSwitch}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {stopConfirmOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/35">
          <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-2 text-[18px] font-semibold text-slate-900">
              Stop this session?
            </div>
            <div className="mb-5 text-[13px] leading-6 text-slate-500">
              If you stop now, this unfinished session will be saved to <b>Active Sessions</b>.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStopConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmStopToActiveSession}
                className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white"
              >
                Yes, Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SetupSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <>
      <div className="mb-5">
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
          {title}
        </div>
        <div className="mt-1 text-[13px] text-slate-500">{subtitle}</div>
      </div>
      {children}
    </>
  )
}

function OptionDivider() {
  return <div className="my-5 h-px bg-slate-200" />
}

function SubjectSelectorBlock({
  title,
  count,
  subjectCards,
  quizConfig,
  applySubjectPreset,
  toggleQuizSubject,
  expandedSubjectIds,
  toggleExpandedSubject,
  topicsBySubject,
  selectedTopicIds,
  toggleTopic,
  toggleWholeSubjectOnly,
  showWeakPreset = false,
}: {
  title: string
  count: number
  subjectCards: Array<Subject & { total: number; weak: number; group: "MBE" | "MEE" }>
  quizConfig: {
    subjectIds: string[]
  }
  applySubjectPreset: (preset: "all" | "mbe" | "mee" | "weak" | "clear") => void
  toggleQuizSubject: (subjectId: string) => void
  expandedSubjectIds: string[]
  toggleExpandedSubject: (subjectId: string) => void
  topicsBySubject: Map<string, TopicOption[]>
  selectedTopicIds: string[]
  toggleTopic: (topicId: string) => void
  toggleWholeSubjectOnly: (subjectId: string) => void
  showWeakPreset?: boolean
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {title}
        </div>
        {count > 0 && (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
            {count} selected
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applySubjectPreset("all")}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600"
        >
          All
        </button>

        <button
          type="button"
          onClick={() => applySubjectPreset("mbe")}
          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700"
        >
          MBE Only
        </button>

        <button
          type="button"
          onClick={() => applySubjectPreset("mee")}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-700"
        >
          MEE Only
        </button>

        {showWeakPreset && (
          <button
            type="button"
            onClick={() => applySubjectPreset("weak")}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700"
          >
            Weak Only
          </button>
        )}

        <button
          type="button"
          onClick={() => applySubjectPreset("clear")}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-400"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {subjectCards.map((subject) => {
          const selectedWholeSubject = quizConfig.subjectIds.includes(subject.id)
          const subjectTopics = topicsBySubject.get(subject.id) ?? []
          const selectedTopicCount = subjectTopics.filter((t) =>
            selectedTopicIds.includes(t.id)
          ).length
          const expanded = expandedSubjectIds.includes(subject.id)

          const activeTone =
            subject.group === "MBE"
              ? "border-blue-200 bg-blue-50/60"
              : "border-emerald-200 bg-emerald-50/60"

          const activeText =
            subject.group === "MBE" ? "text-blue-700" : "text-emerald-700"

          return (
            <div
              key={subject.id}
              className={`overflow-hidden rounded-[14px] border transition ${
                selectedWholeSubject || selectedTopicCount > 0
                  ? activeTone
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[15px] font-semibold ${
                      selectedWholeSubject || selectedTopicCount > 0
                        ? activeText
                        : "text-slate-900"
                    }`}
                  >
                    {subject.name}
                  </div>

                  <div className="mt-1 text-[12px] text-slate-400">
                    {subject.total} rules
                    {selectedTopicCount > 0 ? ` • ${selectedTopicCount} topics selected` : ""}
                  </div>

                  {!!subject.badge_text && (
                    <div className="mt-2">
                      <div
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          subject.badge_tone === "removed"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {subject.badge_text}
                      </div>

                      {!!subject.badge_subtext && (
                        <div className="mt-1 text-[10px] leading-4 text-slate-400">
                          {subject.badge_subtext}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleWholeSubjectOnly(subject.id)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                      selectedWholeSubject
                        ? subject.group === "MBE"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {selectedWholeSubject ? "Whole ✓" : "Whole"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpandedSubject(subject.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    {expanded ? "Hide" : "Topics"}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-slate-200 px-4 py-3">
                  {subjectTopics.length === 0 ? (
                    <div className="text-[12px] text-slate-400">
                      No topics available for this subject yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subjectTopics.map((topic) => {
                        const selected = selectedTopicIds.includes(topic.id)

                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => toggleTopic(topic.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left text-[12px] font-medium transition ${
                              selected
                                ? subject.group === "MBE"
                                  ? "border-blue-300 bg-blue-100 text-blue-700"
                                  : "border-emerald-300 bg-emerald-100 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{topic.name}</span>
                            <span className="text-[10px] opacity-70">{topic.count}</span>
                            {selected && <span className="text-[11px]">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SizeBlock({
  size,
  customSize,
  setPresetSize,
  setCustomSize,
}: {
  size: number
  customSize: string
  setPresetSize: (size: number) => void
  setCustomSize: (value: string) => void
}) {
  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Session Size
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[5, 10, 20, 25].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => setPresetSize(count)}
            className={`h-10 min-w-[44px] rounded-[10px] border px-4 text-[14px] font-semibold transition ${
              size === count
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {count}
          </button>
        ))}

        <span className="ml-2 text-[13px] text-slate-400">Custom</span>

        <input
          type="number"
          min={1}
          max={200}
          value={customSize}
          onChange={(e) => setCustomSize(e.target.value)}
          className="h-10 w-[64px] rounded-[10px] border border-slate-200 bg-white px-3 text-center text-[14px] outline-none focus:border-blue-400"
        />
      </div>
    </div>
  )
}

function OrderBlock({
  order,
  options,
  onChange,
}: {
  order: SessionOrder
  options: SessionOrder[]
  onChange: (value: SessionOrder) => void
}) {
  const labelMap: Record<SessionOrder, string> = {
    sequential: "Sequential",
    random: "Random",
    weakest: "Weakest First",
  }

  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Order
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-[10px] border px-4 py-2.5 text-[14px] font-medium transition ${
              order === item
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {labelMap[item]}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterBlock({
  value,
  onChange,
}: {
  value: SessionFilter
  onChange: (value: SessionFilter) => void
}) {
  const items: { value: SessionFilter; label: string }[] = [
    { value: "all", label: "All Rules" },
    { value: "weak", label: "Weak Only" },
    { value: "untrained", label: "Untrained" },
    { value: "mastered", label: "Mastered" },
  ]

  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Rule Filter
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-[10px] border px-4 py-2.5 text-[14px] font-medium transition ${
              value === item.value
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function QuestionStyleBlock({
  value,
  onChange,
}: {
  value: SessionQuestionStyle
  onChange: (value: SessionQuestionStyle) => void
}) {
  const items: { value: SessionQuestionStyle; label: string }[] = [
    { value: "prompt", label: "Question Prompt" },
    { value: "recite", label: "Recite the Rule" },
    { value: "mixed", label: "Mixed" },
  ]

  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Question Style
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-[10px] border px-4 py-2.5 text-[14px] font-medium transition ${
              value === item.value
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PreviewRow({
  label,
  value,
  blue = false,
  noBorder = false,
}: {
  label: string
  value: string
  blue?: boolean
  noBorder?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 text-[12px] ${
        noBorder ? "" : "border-b border-slate-200"
      }`}
    >
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-semibold ${blue ? "text-blue-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  )
}

function ModeTypeCard({
  active,
  tone,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean
  tone: "study" | "quiz" | "timed" | "weak"
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  const toneMap = {
    study: {
      glow: "from-blue-400/25 via-blue-300/10 to-transparent",
      border: "border-blue-300",
      bg: "bg-[linear-gradient(160deg,#EFF6FF_0%,#FFFFFF_60%)]",
      icon: "border-blue-200 bg-blue-50 text-blue-600",
      title: "text-blue-700",
      dot: "bg-blue-500",
      ring: "shadow-[0_8px_30px_rgba(59,130,246,0.16)]",
    },
    quiz: {
      glow: "from-violet-400/25 via-violet-300/10 to-transparent",
      border: "border-violet-300",
      bg: "bg-[linear-gradient(160deg,#F5F3FF_0%,#FFFFFF_60%)]",
      icon: "border-violet-200 bg-violet-50 text-violet-600",
      title: "text-violet-700",
      dot: "bg-violet-500",
      ring: "shadow-[0_8px_30px_rgba(139,92,246,0.16)]",
    },
    timed: {
      glow: "from-cyan-400/25 via-cyan-300/10 to-transparent",
      border: "border-cyan-300",
      bg: "bg-[linear-gradient(160deg,#ECFEFF_0%,#FFFFFF_60%)]",
      icon: "border-cyan-200 bg-cyan-50 text-cyan-700",
      title: "text-cyan-700",
      dot: "bg-cyan-500",
      ring: "shadow-[0_8px_30px_rgba(6,182,212,0.16)]",
    },
    weak: {
      glow: "from-amber-400/25 via-amber-300/10 to-transparent",
      border: "border-amber-300",
      bg: "bg-[linear-gradient(160deg,#FFFBEB_0%,#FFFFFF_60%)]",
      icon: "border-amber-200 bg-amber-50 text-amber-700",
      title: "text-amber-700",
      dot: "bg-amber-500",
      ring: "shadow-[0_8px_30px_rgba(245,158,11,0.16)]",
    },
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[14px] border px-4 py-4 text-left transition ${
        active
          ? `${toneMap.border} ${toneMap.bg} ${toneMap.ring}`
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_8px_26px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -top-12 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-gradient-to-b ${toneMap.glow} blur-3xl ${active ? "opacity-100" : "opacity-0"} transition`}
      />
      <div
        className={`pointer-events-none absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${toneMap.dot} ${active ? "opacity-100" : "opacity-0"} transition`}
      />

      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] border ${
          active ? toneMap.icon : "border-slate-200 bg-slate-50 text-slate-500"
        } transition`}
      >
        {icon}
      </div>

      <div
        className={`text-[14px] font-semibold tracking-[-0.02em] ${
          active ? toneMap.title : "text-slate-900"
        }`}
      >
        {title}
      </div>

      <div className="mt-1 text-[11px] leading-4 text-slate-400">{description}</div>
    </button>
  )
}

function HistoryDetail({ item }: { item: SessionHistoryItem }) {
  const scoreColor =
    item.finalScore === null
      ? "text-slate-500"
      : item.finalScore >= 70
        ? "text-emerald-600"
        : "text-amber-600"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${getHistoryModeTone(item.mode)}`}
          >
            {getHistoryModeLabel(item.mode)} Mode
          </div>

          <div className="mt-4 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
            {item.mode === "timed"
              ? "Finished in time!"
              : item.mode === "weak_focus"
                ? `${item.improvedCount} rules improved.`
                : item.mode === "study"
                  ? "Session finished."
                  : "Good session."}
          </div>

          <div className="mt-1 text-[13px] text-slate-500">
            {item.subjectName} • {item.completedCount} rules completed •{" "}
            {formatDateLabel(item.createdAt)}
          </div>
        </div>

        <div className="flex h-[94px] w-[94px] items-center justify-center rounded-full border-[6px] border-slate-100 border-t-amber-500 text-center">
          <div>
            <div className={`text-[18px] font-bold ${scoreColor}`}>
              {item.mode === "study"
                ? "✓"
                : item.mode === "weak_focus"
                  ? `${item.improvedCount}/${item.totalQuestions}`
                  : `${item.finalScore ?? 0}%`}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {item.mode === "study"
                ? "Done"
                : item.mode === "weak_focus"
                  ? "Improved"
                  : "Score"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniStatCard
          label={item.mode === "timed" ? "Total Time" : "Rules Completed"}
          value={
            item.mode === "timed"
              ? formatTimeShort(item.totalTimeSec)
              : String(item.completedCount)
          }
          sub={
            item.mode === "timed"
              ? `Target ${formatTimeShort(item.targetTimeSec ?? 0)}`
              : `of ${item.totalQuestions} in session`
          }
          dot="bg-blue-500"
        />

        <MiniStatCard
          label={item.mode === "timed" ? "Avg / Rule" : "Best Rule"}
          value={
            item.mode === "timed"
              ? formatTimeShort(item.avgTimePerRuleSec)
              : `${item.bestRule?.score ?? 0}%`
          }
          sub={
            item.mode === "timed"
              ? `across ${item.completedCount} rules`
              : item.bestRule?.title ?? "—"
          }
          dot="bg-emerald-500"
        />

        <MiniStatCard
          label={
            item.mode === "timed"
              ? "Finished In Time"
              : item.mode === "weak_focus"
                ? "Improved"
                : "Worst Rule"
          }
          value={
            item.mode === "timed"
              ? item.finishedInTime
                ? "Yes"
                : "No"
              : item.mode === "weak_focus"
                ? String(item.improvedCount)
                : `${item.worstRule?.score ?? 0}%`
          }
          sub={
            item.mode === "timed"
              ? item.finishedInTime
                ? "Within budget"
                : "Over budget"
              : item.mode === "weak_focus"
                ? "scored ≥ 70%"
                : item.worstRule?.title ?? "—"
          }
          dot="bg-amber-500"
        />

        <MiniStatCard
          label="Missed Keywords"
          value={String(item.missedKeywords.length)}
          sub="across all rules"
          dot="bg-rose-500"
        />
      </div>

      {item.missedKeywords.length > 0 && (
        <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Missed Keywords
          </div>
          <div className="flex flex-wrap gap-2">
            {item.missedKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[13px] font-semibold text-rose-600"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Rule Breakdown
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-500">
              {item.rules.length}
            </span>
          </div>

          <div className="space-y-3">
            {item.rules.map((rule) => {
              const tone =
                rule.score >= 80
                  ? "border-emerald-300 bg-emerald-50"
                  : rule.score >= 60
                    ? "border-amber-300 bg-amber-50"
                    : "border-rose-300 bg-rose-50"

              const scoreTone =
                rule.score >= 80
                  ? "text-emerald-600"
                  : rule.score >= 60
                    ? "text-amber-600"
                    : "text-rose-600"

              const sub =
                rule.missedKeywords.length > 0
                  ? `Missed: ${rule.missedKeywords.join(", ")}`
                  : "All keywords matched"

              return (
                <div
                  key={rule.ruleId}
                  className={`flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3 ${tone}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-900">
                      {rule.title}
                    </div>
                    <div className="truncate text-[12px] text-slate-500">{sub}</div>
                  </div>
                  <span className={`text-[13px] font-bold ${scoreTone}`}>{rule.score}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white p-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Score Distribution
          </div>

          <div className="space-y-3">
            {item.rules.map((rule) => {
              const barTone =
                rule.score >= 80
                  ? "bg-emerald-500"
                  : rule.score >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"

              const scoreTone =
                rule.score >= 80
                  ? "text-emerald-600"
                  : rule.score >= 60
                    ? "text-amber-600"
                    : "text-rose-600"

              return (
                <div key={rule.ruleId}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="truncate text-[13px] text-slate-700">{rule.title}</div>
                    <div className={`text-[13px] font-bold ${scoreTone}`}>{rule.score}%</div>
                  </div>
                  <div className="h-[6px] rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barTone}`}
                      style={{ width: `${Math.max(4, rule.score)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStatCard({
  label,
  value,
  sub,
  dot,
}: {
  label: string
  value: string
  sub: string
  dot: string
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-4">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="text-[18px] font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{sub}</div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading...</div>}>
      <RuleTrainingPageContent />
    </Suspense>
  )
}

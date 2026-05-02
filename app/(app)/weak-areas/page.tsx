"use client"

import { useEffect, useMemo, useState, Suspense} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type TrapItem = {
  title: string
  explanation: string
}

type WeakAreaItem = {
  id?: string | number
  ruleId?: string | number
  subject?: string
  topic?: string
  subtopic?: string
  accuracy?: number
  attempts?: number
  rule?: string
  title?: string
  trend?: "up" | "down"
  needsPractice?: boolean
  priority?: number
  ruleText?: string
  promptQuestion?: string
  applicationExample?: string
  commonTrap?: string
  howToApply?: string[]
  commonTraps?: TrapItem[]
  examTip?: string
  mastery?: number
}

type WeakAreasApiResponse = {
  weakAreas?: WeakAreaItem[]
  count?: number
  error?: string
}

type ModalTab = "rule" | "apply" | "traps" | "tip"

function safeText(value: unknown) {
  return String(value ?? "").trim()
}

function getRuleId(item: WeakAreaItem) {
  return safeText(item.ruleId || item.id)
}

function getRuleTitle(item: WeakAreaItem) {
  return safeText(item.title || item.rule || "Untitled Rule")
}

function getAccuracy(item: WeakAreaItem) {
  return Math.max(0, Math.min(100, Number(item.accuracy ?? 0)))
}

function getAttempts(item: WeakAreaItem) {
  return Math.max(0, Number(item.attempts ?? 0))
}

function getPriority(item: WeakAreaItem) {
  return Number(item.priority ?? 0)
}

function getAccuracyTone(accuracy: number) {
  if (accuracy >= 70) {
    return {
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      text: "text-emerald-600",
      bar: "bg-emerald-500",
      label: "Improving",
    }
  }

  if (accuracy >= 40) {
    return {
      pill: "bg-amber-50 text-amber-700 ring-amber-100",
      text: "text-amber-600",
      bar: "bg-amber-500",
      label: "Needs work",
    }
  }

  return {
    pill: "bg-rose-50 text-rose-700 ring-rose-100",
    text: "text-rose-600",
    bar: "bg-rose-500",
    label: "Critical",
  }
}

function getTrendMeta(trend?: "up" | "down") {
  if (trend === "up") {
    return {
      label: "Improving",
      className: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      icon: <TrendingUp size={13} />,
    }
  }

  return {
    label: "Declining",
    className: "bg-rose-50 text-rose-600 ring-rose-100",
    icon: <TrendingDown size={13} />,
  }
}

function normalizeHowToApply(item: WeakAreaItem) {
  if (Array.isArray(item.howToApply) && item.howToApply.length > 0) {
    return item.howToApply.map((step) => safeText(step)).filter(Boolean)
  }

  const prompt = safeText(item.promptQuestion)
  const example = safeText(item.applicationExample)
  const subject = safeText(item.subject || "this subject")
  const topic = safeText(item.topic)

  const steps = [
    `Identify the legally significant fact that triggers this ${subject}${topic ? ` ${topic}` : ""} rule.`,
    "State the black letter rule clearly before analyzing the facts.",
    "Match each important fact to the actual rule element or requirement.",
    "Conclude directly whether the rule is satisfied, violated, or not triggered.",
  ]

  if (prompt) {
    steps.splice(1, 0, `Frame the issue the way the exam asks it: ${prompt}`)
  }

  if (example) {
    steps.push(`Use this model application pattern: ${example}`)
  }

  return steps
}

function normalizeTraps(item: WeakAreaItem): TrapItem[] {
  if (Array.isArray(item.commonTraps) && item.commonTraps.length > 0) {
    return item.commonTraps
      .map((trap, index) => ({
        title: safeText(trap?.title || `Trap ${index + 1}`),
        explanation: safeText(trap?.explanation),
      }))
      .filter((trap) => trap.explanation)
  }

  const directTrap = safeText(item.commonTrap)

  if (directTrap) {
    return [
      {
        title: "Common Trap",
        explanation: directTrap,
      },
    ]
  }

  const subject = safeText(item.subject).toLowerCase()
  const topic = safeText(item.topic).toLowerCase()
  const title = getRuleTitle(item).toLowerCase()

  if (subject.includes("criminal")) {
    if (topic.includes("homicide") || title.includes("murder") || title.includes("malice aforethought")) {
      return [
        {
          title: "Skipping mental state classification",
          explanation:
            "Students often jump to murder or manslaughter without first identifying the exact mental state supported by the facts.",
        },
        {
          title: "Blending homicide theories",
          explanation:
            "Intent to kill, serious bodily harm, depraved-heart murder, and felony murder are separate theories. Keep them separate before concluding.",
        },
      ]
    }

    if (topic.includes("search") || topic.includes("seizure")) {
      return [
        {
          title: "Starting with the remedy",
          explanation:
            "Do not start with exclusion. First analyze whether there was a search or seizure, whether it was lawful, and only then discuss suppression.",
        },
        {
          title: "Forgetting evidence-saving doctrines",
          explanation:
            "Even if police conduct was unlawful, evidence may still come in through independent source, inevitable discovery, attenuation, or good faith.",
        },
      ]
    }

    return [
      {
        title: "Wrong issue sequence",
        explanation:
          "Criminal Law and Procedure answers lose points when they skip the required order: offense or right first, rule second, facts third, conclusion last.",
      },
      {
        title: "Ignoring mens rea or constitutional trigger",
        explanation:
          "Most mistakes come from not identifying the required mental state or the constitutional protection that triggers the analysis.",
      },
    ]
  }

  if (subject.includes("civil procedure")) {
    if (topic.includes("personal jurisdiction") || title.includes("fairness")) {
      return [
        {
          title: "Skipping minimum contacts",
          explanation:
            "Fairness factors do not replace minimum contacts. They are analyzed only after minimum contacts are established.",
        },
        {
          title: "Treating inconvenience as enough",
          explanation:
            "A defendant's burden must be severe. Ordinary travel cost or inconvenience usually does not defeat jurisdiction.",
        },
      ]
    }

    return [
      {
        title: "Mixing procedural doctrines",
        explanation:
          "Civil Procedure issues often look similar. Keep jurisdiction, venue, service, pleading, discovery, joinder, and preclusion separate.",
      },
      {
        title: "Missing timing requirements",
        explanation:
          "Many Civil Procedure rules turn on timing. Always check whether the motion, objection, service, or filing was made on time.",
      },
    ]
  }

  if (subject.includes("business associations")) {
    if (topic.includes("agency")) {
      return [
        {
          title: "Blending authority doctrines",
          explanation:
            "Actual authority, apparent authority, ratification, and estoppel are different. Do not mix the principal-to-agent analysis with the principal-to-third-party analysis.",
        },
        {
          title: "Forgetting agent liability",
          explanation:
            "After deciding whether the principal is bound, separately ask whether the agent is personally liable based on disclosure and authority.",
        },
      ]
    }

    if (topic.includes("partnership")) {
      return [
        {
          title: "Assuming every partner act binds the partnership",
          explanation:
            "A partner generally binds the partnership only for ordinary-course acts. Extraordinary acts usually require authorization.",
        },
        {
          title: "Confusing outside liability with internal rights",
          explanation:
            "A partner may be liable to a third party even though the partner later has contribution or indemnification rights internally.",
        },
      ]
    }

    return [
      {
        title: "Using the wrong business form",
        explanation:
          "Do not apply partnership rules to corporations or LLCs automatically. First classify the entity, then apply the correct authority and liability rules.",
      },
      {
        title: "Skipping fiduciary-duty classification",
        explanation:
          "Care, loyalty, good faith, and disclosure problems should be separated. Each duty has a different trigger and defense.",
      },
    ]
  }

  return [
    {
      title: "Element-by-element analysis",
      explanation:
        "Students often recite the rule but fail to connect the key facts to each required element before concluding.",
    },
  ]
}

function getRuleText(item: WeakAreaItem) {
  return safeText(item.ruleText || "No rule text available yet.")
}

function getExamTip(item: WeakAreaItem | null) {
  const direct = safeText(item?.examTip)

  if (direct) return direct
  if (!item) return "Focus on the rule, apply it element by element, and finish with a direct conclusion."

  const subject = safeText(item.subject).toLowerCase()
  const topic = safeText(item.topic).toLowerCase()
  const title = getRuleTitle(item).toLowerCase()

  if (subject.includes("criminal")) {
    if (topic.includes("homicide") || title.includes("malice aforethought") || title.includes("murder")) {
      return "For homicide, classify the mental state first. Do not jump to the final crime. Separate intent to kill, serious bodily harm, depraved-heart recklessness, and felony murder before applying the facts."
    }

    if (topic.includes("search") || topic.includes("seizure") || title.includes("independent source")) {
      return "For search and seizure, start with whether the Fourth Amendment applies. Then analyze the warrant, exception, exclusionary rule, and any doctrine that saves the evidence, such as independent source, inevitable discovery, or attenuation."
    }

    if (topic.includes("trial") || title.includes("prosecutorial")) {
      return "For criminal procedure trial issues, identify the constitutional right involved first. Then ask whether the government conduct prejudiced the defendant enough to affect fairness of the proceeding."
    }

    if (topic.includes("defense") || title.includes("mistake")) {
      return "For defenses, match the defense to the required mental state. Mistake of fact is strongest when it negates the mens rea required for the charged offense."
    }

    return "For Criminal Law and Procedure, begin by identifying the exact offense, defense, or constitutional protection. Then apply the mental state or procedural requirement step by step before concluding."
  }

  if (subject.includes("civil procedure")) {
    if (topic.includes("personal jurisdiction") || title.includes("fairness")) {
      return "For personal jurisdiction, do not start with fairness. First prove minimum contacts, then use fairness factors only as the second-stage reasonableness analysis."
    }

    if (topic.includes("venue")) {
      return "For venue, separate venue from subject matter jurisdiction and personal jurisdiction. Venue asks whether this federal district is a proper location for the case."
    }

    if (topic.includes("discovery")) {
      return "For discovery, identify the device first, then ask whether the request is proportional, relevant, privileged, or protected work product."
    }

    if (topic.includes("joinder")) {
      return "For joinder, identify who or what is being joined. Then check the specific rule, transaction-or-occurrence relationship, and whether subject matter jurisdiction still exists."
    }

    return "For Civil Procedure, name the procedural device first, state the governing rule, then apply timing, jurisdiction, notice, and prejudice facts carefully."
  }

  if (subject.includes("business associations")) {
    if (topic.includes("agency")) {
      return "For agency, always identify the relationship first. Then separate actual authority, apparent authority, ratification, and liability of the principal or agent."
    }

    if (topic.includes("partnership")) {
      return "For partnerships, classify the act as ordinary course or extraordinary. Ordinary-course acts may bind the partnership; extraordinary acts usually require authorization."
    }

    if (topic.includes("corporation") || title.includes("shareholder") || title.includes("director")) {
      return "For corporations, identify whether the issue belongs to shareholders, directors, officers, or the entity itself. Governance, fiduciary duty, and liability questions use different rules."
    }

    if (topic.includes("llc")) {
      return "For LLCs, check the operating agreement first. Then distinguish member-managed from manager-managed authority and avoid importing corporate rules automatically."
    }

    return "For Business Associations, classify the business form first. Agency, partnership, corporation, LLC, and LP issues use different authority, liability, and fiduciary-duty rules."
  }

  if (subject.includes("trust")) {
    return "For Trusts, identify the trustee duty involved first. Then separate validity, administration, fiduciary breach, beneficiary rights, and remedies."
  }

  return `For ${safeText(item.subject || "this subject")}, identify the precise legal issue first, state the rule cleanly, apply the facts element by element, and finish with a direct conclusion.`
}

function WeakAreasPageContent() {
  const [data, setData] = useState<WeakAreaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [apiCount, setApiCount] = useState(0)
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({})
  const [selectedRule, setSelectedRule] = useState<WeakAreaItem | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>("rule")
  const [openRuleScrollMeta, setOpenRuleScrollMeta] = useState({
    visible: false,
    top: 12,
    height: 78,
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

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

  // WEAK_AREAS_RETURN_REFRESH_FIX
  useEffect(() => {
    const completedRuleId = searchParams.get("completedRuleId")
    const completedRuleIds = searchParams.get("completedRuleIds")
    const shouldRefresh = searchParams.get("refresh") === "1"

    if (!completedRuleId && !completedRuleIds && !shouldRefresh) return

    const completedSet = new Set(
      [
        completedRuleId || "",
        ...(completedRuleIds || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ].filter(Boolean)
    )

    if (completedSet.size > 0) {
      setData((prev) =>
        prev.filter((item) => {
          const id = String(item.ruleId || item.id || "").trim()
          return !completedSet.has(id)
        })
      )
    }

    const cleanParams = new URLSearchParams(searchParams.toString())
    cleanParams.delete("completedRuleId")
    cleanParams.delete("completedRuleIds")
    cleanParams.delete("refresh")

    const cleanUrl = cleanParams.toString()
      ? `/weak-areas?${cleanParams.toString()}`
      : "/weak-areas"

    router.replace(cleanUrl)
  }, [router, searchParams])


  useEffect(() => {
    async function loadWeakAreas() {
      if (!userId) return

      try {
        setLoading(true)

        const res = await fetch(`/api/weak-areas?userId=${userId}`, {
          cache: "no-store",
        })

        const result: WeakAreasApiResponse | WeakAreaItem[] = await res.json()
        const weakAreas = Array.isArray(result)
          ? result
          : Array.isArray(result?.weakAreas)
            ? result.weakAreas
            : []

        const count = Array.isArray(result)
          ? result.length
          : typeof result?.count === "number"
            ? result.count
            : weakAreas.length

        const sorted = [...weakAreas].sort(
          (a, b) => getPriority(b) - getPriority(a)
        )

        setData(sorted)
        setApiCount(count)

        const prioritySubject = safeText(sorted[0]?.subject || "Unknown")
        const grouped = sorted.reduce<Record<string, boolean>>((acc, item) => {
          const subject = safeText(item.subject || "Unknown")
          acc[subject] = subject === prioritySubject
          return acc
        }, {})

        setOpenSubjects(grouped)
      } catch (err) {
        console.error("WEAK AREAS FETCH ERROR:", err)
        setData([])
        setApiCount(0)
      } finally {
        setLoading(false)
      }
    }

    loadWeakAreas()
  }, [userId])

  const priorityRule = useMemo(() => {
    if (!data.length) return null
    return [...data].sort((a, b) => getPriority(b) - getPriority(a))[0]
  }, [data])

  const groupedSubjects = useMemo(() => {
    const map = new Map<string, WeakAreaItem[]>()

    for (const item of data) {
      const subject = safeText(item.subject || "Unknown")
      const current = map.get(subject) || []
      current.push(item)
      map.set(subject, current)
    }

    return Array.from(map.entries())
      .map(([subject, rules]) => {
        const sortedRules = [...rules].sort(
          (a, b) => getPriority(b) - getPriority(a)
        )

        const totalAccuracy = sortedRules.reduce(
          (sum, item) => sum + getAccuracy(item),
          0
        )

        const avgAccuracy = sortedRules.length
          ? Math.round(totalAccuracy / sortedRules.length)
          : 0

        return {
          subject,
          rules: sortedRules,
          count: sortedRules.length,
          avgAccuracy,
          worstPriority: getPriority(sortedRules[0]),
        }
      })
      .sort((a, b) => b.worstPriority - a.worstPriority)
  }, [data])

  const weakAccuracy = useMemo(() => {
    if (!data.length) return 0
    return Math.round(
      data.reduce((sum, item) => sum + getAccuracy(item), 0) / data.length
    )
  }, [data])

  const criticalCount = useMemo(
    () => data.filter((item) => getAccuracy(item) < 30).length,
    [data]
  )

  function toggleSubject(subject: string) {
    setOpenSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject],
    }))
  }

  function openRule(item: WeakAreaItem, tab: ModalTab = "rule") {
    setSelectedRule(item)
    setActiveModalTab(tab)
  }

  function closeRule() {
    setSelectedRule(null)
    setActiveModalTab("rule")
  }

  function startDrill(item: WeakAreaItem | null) {
    if (!item) {
      router.push("/rule-training?mode=weak_focus&trainingMode=weak_focus")
      return
    }

    const params = new URLSearchParams()
    const ruleId = String(item.ruleId || item.id || "").trim()
    const subject = String(item.subject || "").trim()
    const topic = String(item.topic || "").trim()
    const subtopic = String(item.subtopic || "").trim()

    params.set("mode", "weak_focus")
    params.set("trainingMode", "weak_focus")
    params.set("autoStart", "1")
    params.set("drillFromWeakAreas", "1")
    params.set("returnTo", "/weak-areas")

    if (ruleId) {
      params.set("ruleId", ruleId)
      params.set("weakFocusRuleId", ruleId)
    }

    if (subject) params.set("subject", subject)
    if (topic) params.set("topic", topic)
    if (subtopic) params.set("subtopic", subtopic)

    router.push(`/rule-training?${params.toString()}`)
  }

  function updateOpenRuleScroll(event: React.UIEvent<HTMLDivElement>) {
    const element = event.currentTarget
    const trackHeight = element.clientHeight
    const contentHeight = element.scrollHeight
    const scrollTop = element.scrollTop

    if (contentHeight <= trackHeight) {
      setOpenRuleScrollMeta({
        visible: false,
        top: 12,
        height: 78,
      })
      return
    }

    const minThumbHeight = 54
    const maxThumbTravel = trackHeight - minThumbHeight - 24
    const computedThumbHeight = Math.max(
      minThumbHeight,
      Math.round((trackHeight / contentHeight) * trackHeight)
    )
    const scrollableDistance = contentHeight - trackHeight
    const thumbTravel = trackHeight - computedThumbHeight - 24
    const nextTop = 12 + Math.round((scrollTop / scrollableDistance) * Math.max(0, thumbTravel))

    setOpenRuleScrollMeta({
      visible: true,
      top: Math.min(12 + Math.max(0, maxThumbTravel), Math.max(12, nextTop)),
      height: computedThumbHeight,
    })
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5">
      <style jsx global>{`
        @keyframes priorityGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.18);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(225, 29, 72, 0.06);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(225, 29, 72, 0);
          }
        }

        .priority-soft-glow {
          animation: priorityGlow 3.2s ease-in-out infinite;
        }
      `}</style>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
            Weak Area Training
          </h1>

          <p className="mt-1.5 text-[14px] text-slate-500">
            Rules that need more attention based on accuracy and repeated performance.
          </p>
        </div>

        {!loading && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600">
            Weak areas: {apiCount}
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading weak areas...
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
          No weak areas found yet.
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[22px] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Weak Accuracy
                  </div>

                  <div className="mt-4 text-[32px] font-semibold tracking-[-0.04em] text-slate-900">
                    {weakAccuracy}%
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <Target size={20} />
                </div>
              </div>

              <div className="mt-5">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${Math.max(5, Math.min(weakAccuracy, 100))}%` }}
                />
              </div>

              <p className="mt-4 text-[13px] leading-6 text-slate-500">
                Focus on these rules first. The goal is not more reading. The goal is closing repeated mistakes.
              </p>
            </div>

            {priorityRule && (
              <div className="priority-soft-glow rounded-[22px] border border-rose-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Priority Rule
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Focus
                  </div>
                </div>

                <div className="mt-4 text-[18px] font-semibold leading-tight tracking-[-0.03em] text-slate-900">
                  {getRuleTitle(priorityRule)}
                </div>

                <div className="mt-2 text-[13px] text-slate-500">
                  {safeText(priorityRule.subject || "Unknown")}
                </div>

                <button
                  type="button"
                  onClick={() => openRule(priorityRule)}
                  className="mt-5 h-10 w-full rounded-[14px] bg-slate-950 text-[13px] font-semibold text-white transition hover:bg-slate-800"
                >
                  Review Rule
                </button>
              </div>
            )}

            <div className="rounded-[22px] bg-white p-5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Snapshot
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-[16px] bg-slate-50 p-4">
                  <div className="text-[24px] font-semibold tracking-[-0.04em] text-slate-900">
                    {apiCount}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    Total weak rules
                  </div>
                </div>

                <div className="rounded-[16px] bg-rose-50 p-4">
                  <div className="text-[24px] font-semibold tracking-[-0.04em] text-rose-600">
                    {criticalCount}
                  </div>
                  <div className="mt-1 text-[12px] text-rose-600">
                    Critical
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="rounded-[24px] bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
                  Rules to Review
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Grouped by subject. Open one subject at a time and drill the weakest rules first.
                </p>
              </div>

              <div className="rounded-full bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-500">
                {apiCount} rules
              </div>
            </div>

            <div className="space-y-2.5 p-4">
              {groupedSubjects.map((group) => {
                const isOpen = !!openSubjects[group.subject]
                const tone = getAccuracyTone(group.avgAccuracy)

                return (
                  <section
                    key={group.subject}
                    className="overflow-hidden rounded-[18px] bg-slate-50/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubject(group.subject)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[15px] font-semibold text-slate-900">
                            {group.subject}
                          </h3>

                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone.pill}`}>
                            {tone.label}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                          <span>{group.count} weak rules</span>
                          <span>•</span>
                          <span>Avg {group.avgAccuracy}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="hidden h-2 w-[76px] overflow-hidden rounded-full bg-slate-100 sm:block">
                          <div
                            className={`h-full rounded-full ${tone.bar}`}
                            style={{
                              width: `${Math.max(6, Math.min(group.avgAccuracy, 100))}%`,
                            }}
                          />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500">
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-slate-50/60 px-3 pb-3">
                        <div className="space-y-2">
                          {group.rules.map((item) => {
                            const accuracy = getAccuracy(item)
                            const attempts = getAttempts(item)
                            const accuracyTone = getAccuracyTone(accuracy)
                            const trendMeta = getTrendMeta(item.trend)

                            return (
                              <div
                                key={getRuleId(item) || `${group.subject}-${getRuleTitle(item)}`}
                                className="grid items-center gap-2.5 rounded-[14px] bg-white/70 px-3.5 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-[14px] font-semibold text-slate-900">
                                    {getRuleTitle(item)}
                                  </div>

                                  <div className="mt-1 truncate text-[12px] text-slate-500">
                                    {[item.topic, item.subtopic]
                                      .map((value) => safeText(value))
                                      .filter(Boolean)
                                      .join(" • ") || "No topic"}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[13px] font-semibold ${accuracyTone.text}`}
                                  >
                                    {accuracy}%
                                  </span>

                                  <div className="h-1.5 w-[52px] overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full ${accuracyTone.bar}`}
                                      style={{
                                        width: `${Math.max(6, Math.min(accuracy, 100))}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="text-[12px] text-slate-500">
                                  {attempts} {attempts === 1 ? "attempt" : "attempts"}
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                                        item.trend === "up" ? "text-emerald-600" : "text-rose-600"
                                      }`}
                                    >
                                      {trendMeta.icon}
                                      {trendMeta.label}
                                    </span>

                                  <button
                                    type="button"
                                    onClick={() => openRule(item)}
                                    className="h-8 rounded-[12px] px-3 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Open
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => startDrill(item)}
                                    className="h-8 rounded-[12px] bg-blue-600 px-3 text-[12px] font-semibold text-white transition hover:bg-blue-700"
                                  >
                                    Drill
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </main>
        </div>
      )}

      {selectedRule && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="relative flex h-[82vh] max-h-[820px] min-h-[680px] w-full max-w-[880px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeRule}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close rule modal"
            >
              <X size={19} />
            </button>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-5 pt-6">
              <div className="pr-12 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {safeText(selectedRule.subject || "Subject")} • Black Letter Law
              </div>

              <h2 className="mt-2 pr-12 text-[26px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
                {getRuleTitle(selectedRule)}
              </h2>

              <div className="mt-5 grid grid-cols-4 gap-2.5">
                <div className="rounded-[18px] bg-slate-50 px-3 py-3 text-center">
                  <div className={`text-[18px] font-semibold ${getAccuracyTone(getAccuracy(selectedRule)).text}`}>
                    {getAccuracy(selectedRule)}%
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Accuracy
                  </div>
                </div>

                <div className="rounded-[18px] bg-slate-50 px-3 py-3 text-center">
                  <div className="text-[18px] font-semibold text-slate-950">
                    {getAttempts(selectedRule)}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Attempts
                  </div>
                </div>

                  <div className="rounded-[18px] bg-slate-50 px-3 py-3 text-center">
                    <div
                      className={`mx-auto inline-flex items-center gap-1 text-[12px] font-semibold ${
                        selectedRule.trend === "up" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {getTrendMeta(selectedRule.trend).icon}
                      {getTrendMeta(selectedRule.trend).label}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Trend
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-slate-50 px-3 py-3 text-center">
                    <div className="text-[12px] font-semibold text-slate-600">
                      {selectedRule.needsPractice ? "Flagged" : "Review"}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </div>
                  </div>
              </div>

              <div className="mt-6 grid grid-cols-4 rounded-[22px] bg-slate-100 p-1">
                {[
                  { id: "rule" as ModalTab, label: "Rule" },
                  { id: "apply" as ModalTab, label: "Apply" },
                  { id: "traps" as ModalTab, label: "Traps" },
                  { id: "tip" as ModalTab, label: "Exam Tip" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModalTab(tab.id)}
                    className={`h-11 rounded-[18px] text-[14px] font-semibold transition ${
                      activeModalTab === tab.id
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div id="open-rule-modal-scroll-area" className="mt-5 h-[390px] overflow-y-scroll overscroll-contain pr-4 pb-16 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500" style={{ scrollbarWidth: "auto", scrollbarColor: "#64748b #f1f5f9" }}>
                {activeModalTab === "rule" && (
                  <div className="pb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Memorize Exactly
                      </div>
                    </div>

                    <div className="rounded-[18px] bg-yellow-50 px-5 py-4 text-[15px] leading-7 text-slate-850 ring-1 ring-yellow-100">
                      {getRuleText(selectedRule)}
                    </div>
                  </div>
                )}

                {activeModalTab === "apply" && (
                  <div className="pb-6">
                    <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                      How to Apply on the Exam
                    </div>

                    <div className="space-y-4">
                      {normalizeHowToApply(selectedRule).map((step, index) => (
                        <div
                          key={`${index}-${step}`}
                          className="grid grid-cols-[34px_minmax(0,1fr)] gap-2.5"
                        >
                          <div className="flex flex-col items-center">
                            <div className="flex h-8 w-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[13px] font-semibold leading-none text-white">
                              {index + 1}
                            </div>

                            {index < normalizeHowToApply(selectedRule).length - 1 && (
                              <div className="mt-2 h-full min-h-[24px] w-px bg-slate-200" />
                            )}
                          </div>

                          <div className="pb-1">
                            <div className="text-[15px] font-semibold text-slate-950">
                              Step {index + 1}
                            </div>

                            <div className="mt-1 rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-600">
                              {step}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {safeText(selectedRule.applicationExample) && (
                      <div id="open-rule-apply-example" className="mt-6 rounded-[18px] bg-blue-50 px-5 py-4 text-[14px] leading-6 text-slate-700 ring-1 ring-blue-100">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                          Example
                        </div>
                        {safeText(selectedRule.applicationExample)}
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === "traps" && (
                  <div className="pb-6">
                    <div className="mb-4 rounded-[16px] bg-amber-50 px-4 py-3 text-[14px] leading-6 text-amber-900 ring-1 ring-amber-100">
                      These are the mistakes that usually cost points. Read them before drilling.
                    </div>

                    <div className="space-y-2.5">
                      {normalizeTraps(selectedRule).map((trap, index) => (
                        <div
                          key={`${index}-${trap.title}`}
                          className="rounded-[17px] bg-yellow-50 text-amber-950 ring-1 ring-yellow-100"
                        >
                          <div className="flex items-center gap-2 border-b border-yellow-100 px-4 py-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-[13px] font-semibold text-white">
                              !
                            </div>

                            <div className="text-[15px] font-semibold">
                              Trap {index + 1}: {trap.title}
                            </div>
                          </div>

                          <div className="px-4 py-3 text-[14px] leading-6">
                            {trap.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeModalTab === "tip" && (
                  <div className="pb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Real Exam Tip
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
                        <Lightbulb size={14} />
                        MEE strategy
                      </div>
                    </div>

                    <div className="rounded-[18px] bg-indigo-50 px-5 py-4 text-[15px] leading-7 text-slate-800 ring-1 ring-indigo-100">
                      {getExamTip(selectedRule)}
                    </div>
                  </div>
                )}
              </div>

                {activeModalTab === "apply" && (
                  <div className="APPLY_SCROLL_TO_MORE_BUTTON -mt-2 mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const scrollArea = document.getElementById("open-rule-modal-scroll-area")
                        const example = document.getElementById("open-rule-apply-example")

                        if (!scrollArea) return

                        if (example) {
                          const targetTop = example.offsetTop - scrollArea.offsetTop - 16
                          scrollArea.scrollTo({
                            top: Math.max(0, targetTop),
                            behavior: "smooth",
                          })
                          return
                        }

                        scrollArea.scrollTo({
                          top: scrollArea.scrollHeight,
                          behavior: "smooth",
                        })
                      }}
                      className="rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[12px] font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                    >
                      Scroll for more ↓
                    </button>
                  </div>
                )}

<div className="mt-auto flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-200 bg-white pt-4">
                <button
                  type="button"
                  onClick={closeRule}
                  className="h-10 rounded-[14px] px-5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => startDrill(selectedRule)}
                  className="h-10 rounded-[14px] bg-blue-600 px-5 text-[14px] font-semibold text-white transition hover:bg-blue-700"
                >
                  Start Drill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WeakAreasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading weak areas...</div>}>
      <WeakAreasPageContent />
    </Suspense>
  )
}

"use client"

import { useEffect, useState, useMemo } from "react"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import AddRuleModal from "@/app/components/AddRuleModal"

type Keyword = {
  id: number
  keyword: string
}

type Rule = {
  id: number
  title: string
  ruleText?: string
  applicationExample?: string
  subtopic?: string
  subject?: { name?: string }
  topic?: { name?: string }
  keywords?: Keyword[]
}

const MBE_SUBJECTS = [
  "Civil Procedure",
  "Constitutional Law",
  "Contracts",
  "Criminal Law and Procedure",
  "Evidence",
  "Real Property",
  "Torts",
]

function subjectColor(subject: string) {
  switch (subject) {
    case "Contracts":
      return "bg-blue-100 text-blue-600"
    case "Torts":
      return "bg-purple-100 text-purple-600"
    case "Evidence":
      return "bg-cyan-100 text-cyan-600"
    case "Civil Procedure":
      return "bg-green-100 text-green-600"
    case "Criminal Law and Procedure":
      return "bg-red-100 text-red-600"
    case "Real Property":
      return "bg-amber-100 text-amber-600"
    case "Business Associations":
      return "bg-pink-100 text-pink-600"
    case "Family Law":
      return "bg-teal-100 text-teal-600"
    case "Trusts":
      return "bg-orange-100 text-orange-600"
    case "Secured Transactions":
      return "bg-yellow-100 text-yellow-700"
    case "Conflict of Laws":
      return "bg-slate-200 text-slate-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

function highlightBuzzwords(text: string, keywords: string[]) {
  if (!text) return ""
  if (!keywords || keywords.length === 0) return text

  let result = text
  const sorted = [...keywords].sort((a, b) => b.length - a.length)

  sorted.forEach((word) => {
    const safeWord = String(word || "").trim()
    if (!safeWord) return

    const escaped = safeWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(${escaped})`, "gi")

    result = result.replace(
      regex,
      `<span class="rounded-md bg-blue-300/60 px-2 py-[2px] text-slate-800">${"$1"}</span>`
    )
  })

  return result
}

function getScrollableParent(element: HTMLElement | null): HTMLElement | Window {
  let current = element?.parentElement ?? null

  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      current.scrollHeight > current.clientHeight

    if (canScroll) {
      return current
    }

    current = current.parentElement
  }

  return window
}

function getScrollTargetMetrics(target: HTMLElement | Window) {
  if (target === window) {
    const doc = document.documentElement
    const body = document.body
    const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0
    const scrollHeight = Math.max(
      doc.scrollHeight,
      body.scrollHeight,
      doc.offsetHeight,
      body.offsetHeight,
      doc.clientHeight
    )
    const clientHeight = window.innerHeight || doc.clientHeight || 0
    const maxScroll = Math.max(scrollHeight - clientHeight, 0)

    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      maxScroll,
    }
  }

  const scrollTop =
    target instanceof Window
      ? window.scrollY
      : target.scrollTop

  const scrollHeight =
    target instanceof Window
      ? document.documentElement.scrollHeight
      : target.scrollHeight

  const clientHeight =
    target instanceof Window
      ? window.innerHeight
      : target.clientHeight
  const maxScroll = Math.max(scrollHeight - clientHeight, 0)

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    maxScroll,
  }
}

function scrollTargetTo(target: HTMLElement | Window, top: number) {
  if (target === window) {
    window.scrollTo({
      top,
      behavior: "smooth",
    })
    return
  }

  target.scrollTo({
    top,
    behavior: "smooth",
  })
}

function FloatingScrollButtons() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function resolveTarget() {
    const root =
      document.getElementById("rule-bank-page-root") ||
      document.getElementById("__next") ||
      document.body

    return getScrollableParent(root)
  }

  function goTop() {
    const target = resolveTarget()
    scrollTargetTo(target, 0)
  }

  function goMiddle() {
    const target = resolveTarget()
    const { maxScroll } = getScrollTargetMetrics(target)
    scrollTargetTo(target, maxScroll / 2)
  }

  function goBottom() {
    const target = resolveTarget()
    const { maxScroll } = getScrollTargetMetrics(target)
    scrollTargetTo(target, maxScroll)
  }

  if (!mounted) return null

  return (
    <>
      <button
        type="button"
        onClick={goTop}
        aria-label="Go to top"
        title="Go to top"
        className="fixed right-5 top-24 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        <ArrowUp size={18} />
      </button>

      <button
        type="button"
        onClick={goMiddle}
        aria-label="Go to middle"
        title="Go to middle"
        className="fixed right-5 top-1/2 z-[9999] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition hover:bg-slate-50"
      >
        <Minus size={18} />
      </button>

      <button
        type="button"
        onClick={goBottom}
        aria-label="Go to bottom"
        title="Go to bottom"
        className="fixed bottom-6 right-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition hover:translate-y-0.5 hover:bg-slate-50"
      >
        <ArrowDown size={18} />
      </button>
    </>
  )
}

export default function RuleBankPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [search, setSearch] = useState("")
  const [examType, setExamType] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/rule-bank", { cache: "no-store" })
        const data = await res.json()

        const flattened: Rule[] = []
        const subjects = Array.isArray(data?.subjects) ? data.subjects : []

        subjects.forEach((subject: any) => {
          const topics = Array.isArray(subject?.topics) ? subject.topics : []

          topics.forEach((topic: any) => {
            const topicRules = Array.isArray(topic?.rules) ? topic.rules : []

            topicRules.forEach((rule: any) => {
              flattened.push({
                id: Number(rule?.id),
                title: String(rule?.title ?? ""),
                ruleText: String(rule?.ruleText ?? rule?.rule_text ?? ""),
                applicationExample: String(
                  rule?.applicationExample ?? rule?.application_example ?? ""
                ),
                subtopic: String(rule?.subtopic ?? ""),
                subject: {
                  name: String(subject?.name ?? ""),
                },
                topic: {
                  name: String(topic?.name ?? ""),
                },
                keywords: Array.isArray(rule?.keywords)
                  ? rule.keywords.map((k: any, index: number) => ({
                      id: Number(k?.id ?? index),
                      keyword: String(k?.keyword ?? ""),
                    }))
                  : [],
              })
            })
          })
        })

        setRules(flattened)
      } catch (error) {
        console.error("RULE BANK LOAD ERROR:", error)
        setRules([])
      }
    }

    load()
  }, [])

  const subjects = useMemo(() => {
    const unique = new Set<string>()

    rules.forEach((r) => {
      const subjectName = String(r?.subject?.name ?? "").trim()
      if (subjectName) unique.add(subjectName)
    })

    return Array.from(unique)
  }, [rules])

  const filteredRules = useMemo(() => {
    let result = [...rules]
    const q = search.trim().toLowerCase()

    if (q) {
      result = result.filter((rule) => {
        const title = String(rule?.title ?? "").toLowerCase()
        const ruleText = String(rule?.ruleText ?? "").toLowerCase()
        const subjectName = String(rule?.subject?.name ?? "").toLowerCase()
        const topicName = String(rule?.topic?.name ?? "").toLowerCase()
        const keywords = Array.isArray(rule?.keywords)
          ? rule.keywords.some((k) =>
              String(k?.keyword ?? "").toLowerCase().includes(q)
            )
          : false

        return (
          title.includes(q) ||
          ruleText.includes(q) ||
          subjectName.includes(q) ||
          topicName.includes(q) ||
          keywords
        )
      })
    }

    if (subjectFilter !== "all") {
      result = result.filter(
        (rule) => String(rule?.subject?.name ?? "") === subjectFilter
      )
    }

    if (examType === "mbe") {
      result = result.filter((rule) =>
        MBE_SUBJECTS.includes(String(rule?.subject?.name ?? ""))
      )
    }

    if (examType === "mee") {
      result = result.filter(
        (rule) => !MBE_SUBJECTS.includes(String(rule?.subject?.name ?? ""))
      )
    }

    return result
  }, [rules, search, examType, subjectFilter])

  function toggleRule(id: number) {
    if (expanded === id) {
      setExpanded(null)
    } else {
      setExpanded(id)
    }
  }

  return (
    <div id="rule-bank-page-root" className="relative p-8">
      <FloatingScrollButtons />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rule Bank</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredRules.length} rules
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Add Rule
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          placeholder="Search rules, buzzwords..."
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex overflow-hidden rounded-lg border">
          <button
            onClick={() => setExamType("all")}
            className={`px-4 py-2 text-sm ${
              examType === "all" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setExamType("mbe")}
            className={`px-4 py-2 text-sm ${
              examType === "mbe" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            MBE
          </button>

          <button
            onClick={() => setExamType("mee")}
            className={`px-4 py-2 text-sm ${
              examType === "mee" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            MEE
          </button>
        </div>

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All Subjects</option>

          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[160px_180px_1fr_300px_40px] border-b px-6 py-3 text-xs uppercase text-slate-400">
          <div>Subject</div>
          <div>Topic</div>
          <div>Rule Title</div>
          <div>Keywords</div>
          <div></div>
        </div>

        {filteredRules.map((rule) => {
          const isOpen = expanded === rule.id
          const subjectName = String(rule?.subject?.name ?? "")
          const topicName = String(rule?.topic?.name ?? "")
          const ruleText = String(rule?.ruleText ?? "")
          const keywords = Array.isArray(rule?.keywords) ? rule.keywords : []

          return (
            <div key={rule.id} className="border-b last:border-b-0">
              <div
                className="grid cursor-pointer grid-cols-[160px_180px_1fr_300px_40px] items-center px-6 py-4 hover:bg-slate-50"
                onClick={() => toggleRule(rule.id)}
              >
                <div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${subjectColor(subjectName)}`}
                  >
                    {subjectName || "Unknown"}
                  </span>
                </div>

                <div className="text-sm text-slate-500">{topicName || "—"}</div>

                <div className="text-[15px] font-medium text-slate-800">
                  {rule.title || "Untitled Rule"}
                </div>

                <div className="flex flex-wrap gap-1">
                  {keywords.slice(0, 2).map((k) => (
                    <span
                      key={k.id}
                      className="rounded bg-slate-100 px-2 py-1 font-mono text-xs tracking-tight"
                    >
                      {k.keyword}
                    </span>
                  ))}

                  {keywords.length > 2 && (
                    <span className="text-xs text-slate-400">
                      +{keywords.length - 2}
                    </span>
                  )}
                </div>

                <div className="text-slate-400">▾</div>
              </div>

              {isOpen && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-xl border bg-slate-50 p-5">
                      <div className="mb-2 text-xs uppercase text-slate-400">
                        Rule Statement
                      </div>

                      <div
                        className="text-[18px] leading-8 text-slate-800"
                        dangerouslySetInnerHTML={{
                          __html: highlightBuzzwords(
                            ruleText,
                            keywords.map((k) => String(k.keyword ?? ""))
                          ),
                        }}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        {keywords.map((k) => (
                          <span
                            key={k.id}
                            className="rounded bg-indigo-100/80 px-2 py-1 font-mono text-xs tracking-tight text-indigo-700"
                          >
                            {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-slate-50 p-5">
                      <div className="mb-2 text-xs uppercase text-slate-400">
                        Application Example
                      </div>

                      <div className="whitespace-pre-wrap text-[16px] leading-7 text-slate-700">
                        {rule.applicationExample || "No example added"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AddRuleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => window.location.reload()}
      />
    </div>
  )
}
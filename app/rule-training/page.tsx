"use client"

import { useEffect, useMemo, useState } from "react"

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
}

type Rule = {
  id: string
  title: string
  rule_text?: string
  keywords?: string[]
  topic?: string
  subtopic?: string
  avgScore?: number
}

type ResultShape = {
  score?: number
  keywordScore?: number
  similarity?: number
  matched_keywords?: string[]
  missed_keywords?: string[]
}

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
  if (MBE_SUBJECTS.has(name)) return "MBE"
  return "MEE"
}

function getSubjectBarColor(name: string): string {
  switch (name) {
    case "Contracts":
      return "#3B5BDB"
    case "Torts":
      return "#7C3AED"
    case "Evidence":
      return "#2B8DBD"
    case "Civil Procedure":
      return "#3FA76A"
    case "Criminal Law and Procedure":
      return "#D23B36"
    case "Real Property":
      return "#D4841F"
    case "Constitutional Law":
      return "#6D28D9"
    case "Business Associations":
      return "#3B5BDB"
    case "Family Law":
      return "#DB2777"
    case "Secured Transactions":
      return "#B45309"
    case "Trusts":
      return "#0F766E"
    case "Wills":
      return "#7C2D12"
    case "Conflict of Laws":
      return "#475569"
    default:
      return "#3B82F6"
  }
}

export default function Page() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null)

  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState<ResultShape | null>(null)

  const [mode, setMode] = useState("typing")
  const [mbeOpen, setMbeOpen] = useState(true)
  const [meeOpen, setMeeOpen] = useState(true)
  const [attempts, setAttempts] = useState<number[]>([])
  const [ruleSearch, setRuleSearch] = useState("")

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const selectedRule =
    selectedRuleIndex !== null ? rules[selectedRuleIndex] : null

  async function onPickSubject(subject: Subject) {
    setSelectedSubjectId(subject.id)
    setSelectedRuleIndex(null)
    setAnswer("")
    setResult(null)
    setRuleSearch("")

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
      avgScore: typeof rule.avgScore === "number" ? rule.avgScore : 0,
    }))

    setRules(normalizedRules)

    if (normalizedRules.length > 0) {
      setSelectedRuleIndex(0)
    }
  }

  useEffect(() => {
    async function loadSubjects() {
      const res = await fetch("/api/get-subjects", { cache: "no-store" })
      const data = await res.json()

      if (!Array.isArray(data)) return

      const subjectsWithCounts: Subject[] = await Promise.all(
        data.map(async (subject: Subject) => {
          try {
            const rulesRes = await fetch(
              `/api/get-rules-by-subject?subjectId=${subject.id}`,
              { cache: "no-store" }
            )
            const rulesData = await rulesRes.json()

            return {
              ...subject,
              total_rules: Array.isArray(rulesData) ? rulesData.length : 0,
              completed_rules: 0,
            }
          } catch {
            return {
              ...subject,
              total_rules: 0,
              completed_rules: 0,
            }
          }
        })
      )

      setSubjects(subjectsWithCounts)

      if (subjectsWithCounts.length > 0) {
        await onPickSubject(subjectsWithCounts[0])
      }
    }

    loadSubjects()
  }, [])

  async function onPickRule(index: number) {
    setSelectedRuleIndex(index)
    setAnswer("")
    setResult(null)
  }

  async function handleSubmit() {
    if (selectedRuleIndex === null) return

    const rule = rules[selectedRuleIndex]

    const res = await fetch("/api/submit-attempt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ruleId: rule.id,
        userAnswer: answer,
        userId: "86845c3b-19cb-497c-b9fc-c4ade7d7530b",
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

    setRules((prev) =>
      prev.map((r, i) =>
        i === selectedRuleIndex ? { ...r, avgScore: score } : r
      )
    )
  }

  function handleTryAgain() {
    setAnswer("")
    setResult(null)
  }

  function handleNextRule() {
    if (selectedRuleIndex === null) return
    const next = selectedRuleIndex + 1
    if (next < rules.length) {
      setSelectedRuleIndex(next)
      setAnswer("")
      setResult(null)
    }
  }

  function handleSaveRule() {
    alert("Save Rule will be connected to the database next.")
  }

  function handleReportRule() {
    alert("Report Rule will be sent to admin review next.")
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

  const avgColor =
    avgScore >= 80 ? "#2F855A" : avgScore >= 60 ? "#DD6B20" : "#E53E3E"

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase()
    if (!q) return rules
    return rules.filter(
      (rule) =>
        rule.title.toLowerCase().includes(q) ||
        (rule.topic ?? "").toLowerCase().includes(q) ||
        (rule.subtopic ?? "").toLowerCase().includes(q)
    )
  }, [rules, ruleSearch])

  const breadcrumb = [selectedSubject?.name, selectedRule?.topic, selectedRule?.subtopic]
    .filter(Boolean)
    .join(" › ")

  function renderSectionHeader(
    label: string,
    count: number,
    open: boolean,
    onToggle: () => void
  ) {
    return (
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 18,
          marginBottom: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            fontWeight: 700,
            color: "#94A3B8",
          }}
        >
          {label} ({count})
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#CBD5E1",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s ease",
          }}
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
    const barColor = getSubjectBarColor(subject.name)

    return (
      <div
        key={subject.id}
        onClick={() => onPickSubject(subject)}
        style={{
          padding: "9px 10px 8px 10px",
          background: active ? "#EEF4FF" : "transparent",
          borderLeft: active ? "3px solid #3B5BDB" : "3px solid transparent",
          cursor: "pointer",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? "#2D5BDB" : "#3E4C63",
              lineHeight: 1.3,
            }}
          >
            {subject.name}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94A3B8",
              whiteSpace: "nowrap",
            }}
          >
            {total}r
          </div>
        </div>

        <div
          style={{
            height: 4,
            background: "#E2E8F0",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: barColor,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px minmax(0,1fr) 320px",
        height: "100vh",
        background: "#F8FAFC",
      }}
    >
      <div
        style={{
          borderRight: "1px solid #E2E8F0",
          background: "#FFFFFF",
          overflowY: "auto",
          padding: "18px 12px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            fontWeight: 700,
            color: "#94A3B8",
            marginBottom: 12,
          }}
        >
          SUBJECTS
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

      <div
        style={{
          padding: 28,
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {!selectedRule && (
          <div style={{ marginTop: 40, opacity: 0.6 }}>
            Select a rule from the right panel
          </div>
        )}

        {selectedRule && (
          <div style={{ width: "100%", maxWidth: 860 }}>
            <div
              style={{
                marginBottom: 8,
                fontSize: 13,
                color: "#8FA0B8",
                fontWeight: 500,
              }}
            >
              {breadcrumb}
            </div>

            <div
              style={{
                fontSize: 27,
                fontWeight: 600,
                marginBottom: 14,
                color: "#17233A",
                letterSpacing: "-0.01em",
                lineHeight: 1.22,
              }}
            >
              {selectedRule.title}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <ModeSwitcher mode={mode} setMode={setMode} />

              <div
                style={{
                  fontSize: 14,
                  color: "#7A889F",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                Avg:{" "}
                <span style={{ color: avgColor, fontWeight: 700 }}>
                  {avgScore}%
                </span>{" "}
                ({attempts.length || 1}×)
              </div>
            </div>

            {mode === "typing" && (
              <TypingMode
                ruleText={selectedRule.rule_text}
                keywords={selectedRule.keywords}
                answer={answer}
                setAnswer={setAnswer}
                onSubmit={handleSubmit}
                onTryAgain={handleTryAgain}
                onNextRule={handleNextRule}
                onSaveRule={handleSaveRule}
                onReportRule={handleReportRule}
                result={result}
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
        )}
      </div>

      <div
        style={{
          borderLeft: "1px solid #E2E8F0",
          background: "#FFFFFF",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              fontWeight: 700,
              color: "#94A3B8",
              marginBottom: 12,
            }}
          >
            TRAINING MODE
          </div>

          <div style={{ marginBottom: 18 }}>
            {[
              { title: "Study", sub: "Full rule shown", active: true },
              { title: "Quiz", sub: "Score only", active: false },
              { title: "Timed", sub: "Beat the clock", active: false },
              { title: "Weak Focus", sub: "Your weak rules", active: false },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: item.active ? "1px solid #93C5FD" : "1px solid transparent",
                  background: item.active ? "#EFF6FF" : "transparent",
                  marginBottom: 6,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#17233A",
                    marginBottom: 2,
                    fontSize: 15,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#94A3B8",
                    fontWeight: 500,
                  }}
                >
                  {item.sub}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              fontWeight: 700,
              color: "#94A3B8",
              marginBottom: 10,
            }}
          >
            RULES ({rules.length})
          </div>

          <input
            value={ruleSearch}
            onChange={(e) => setRuleSearch(e.target.value)}
            placeholder="Search rules"
            style={{
              width: "100%",
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #D7DEE9",
              outline: "none",
              fontSize: 14,
              color: "#334155",
              background: "#FFFFFF",
            }}
          />
        </div>

        <div
          style={{
            overflowY: "auto",
            minHeight: 0,
            paddingRight: 2,
          }}
        >
          {filteredRules.map((rule) => {
            const actualIndex = rules.findIndex((r) => r.id === rule.id)
            const active = selectedRuleIndex === actualIndex
            const scoreValue = rule.avgScore ?? 0
            const scoreColor =
              scoreValue >= 80 ? "#2F855A" : scoreValue >= 60 ? "#DD6B20" : "#E53E3E"

            return (
              <div
                key={rule.id}
                onClick={() => onPickRule(actualIndex)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: active ? "1px solid #93C5FD" : "1px solid #E2E8F0",
                  background: active ? "#EFF6FF" : "#FFFFFF",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#94A3B8",
                    marginBottom: 4,
                  }}
                >
                  #{actualIndex + 1}
                </div>

                <div
                  style={{
                    fontWeight: 600,
                    color: "#1E293B",
                    marginBottom: 3,
                    lineHeight: 1.32,
                    fontSize: 14,
                  }}
                >
                  {rule.title}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#94A3B8",
                    marginBottom: 5,
                    fontWeight: 500,
                  }}
                >
                  {[rule.topic, rule.subtopic].filter(Boolean).join(" · ") || "General"}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: scoreColor,
                  }}
                >
                  {scoreValue}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
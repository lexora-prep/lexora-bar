"use client"

import { useEffect, useMemo, useState } from "react"

type Result = {
  score?: number
  matched_keywords?: string[]
  missed_keywords?: string[]
  keywordScore?: number
  similarity?: number
}

type ReportPayload = {
  reason: string
  details: string
}

type Props = {
  ruleText?: string
  keywords?: string[]
  title?: string
  promptText?: string
  defaultShowRule?: boolean
  answer?: string
  setAnswer: (v: string) => void
  onSubmit: () => void
  onTryAgain?: () => void
  onNextRule?: () => void
  onSaveRule?: () => void
  onReportRule?: (payload: ReportPayload) => void | Promise<void>
  result?: Result | null
  trainingMode?: string
  isSubmitting?: boolean
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeText(text: unknown) {
  if (typeof text !== "string") return ""

  return text
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function answerContainsKeyword(answer: unknown, keyword: unknown) {
  const normalizedAnswer = normalizeText(answer)
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword) return false

  const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i")
  return regex.test(normalizedAnswer)
}

function highlightInRule(text: string, keywords: string[] = []) {
  if (!text) return ""

  let html = text
  const safeKeywords = keywords.filter(
    (kw) => typeof kw === "string" && kw.trim().length > 0
  )
  const sortedKeywords = [...safeKeywords].sort((a, b) => b.length - a.length)

  sortedKeywords.forEach((kw) => {
    const regex = new RegExp(`(${escapeRegex(kw)})`, "gi")
    html = html.replace(
      regex,
      `<span style="color:#4F46E5;font-weight:600;text-decoration:underline;text-underline-offset:4px;">$1</span>`
    )
  })

  return html
}

function buildQuestion(title?: string) {
  const cleanTitle = typeof title === "string" ? title.trim() : ""

  if (!cleanTitle) return "What is the rule for this doctrine?"

  return `What is the rule for ${cleanTitle}?`
}

function MiniTextButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        fontSize: 12,
        fontWeight: 700,
        color: disabled ? "#94A3B8" : "#475569",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  )
}

function MiniButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 36,
        minWidth: primary ? 98 : 82,
        padding: primary ? "0 16px" : "0 14px",
        borderRadius: 12,
        border: primary ? "none" : "1px solid #CBD5E1",
        background: primary ? (disabled ? "#A5B4FC" : "#3157D6") : "#FFFFFF",
        color: primary ? "#FFFFFF" : "#334155",
        fontWeight: 700,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}

export default function TypingMode({
  ruleText,
  keywords = [],
  title,
  promptText,
  defaultShowRule = true,
  answer,
  setAnswer,
  onSubmit,
  onTryAgain,
  onNextRule,
  onSaveRule,
  onReportRule,
  result,
  isSubmitting,
}: Props) {
  const safeAnswer = typeof answer === "string" ? answer : ""
  const safeKeywords = Array.isArray(keywords)
    ? keywords.filter((kw): kw is string => typeof kw === "string")
    : []

  const [showModal, setShowModal] = useState(true)
  const [showRule, setShowRule] = useState(defaultShowRule)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("incorrect_rule")
  const [reportDetails, setReportDetails] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  useEffect(() => {
    setShowModal(true)
  }, [result?.score, ruleText])

  useEffect(() => {
    setShowRule(defaultShowRule)
    setReportOpen(false)
    setReportReason("incorrect_rule")
    setReportDetails("")
    setReportSubmitting(false)
  }, [title, ruleText, defaultShowRule])

  const score = result?.score ?? null
  const similarityPercent = result?.similarity ?? 0
  const questionText = promptText?.trim() || buildQuestion(title)

  const liveMatchedKeywords = useMemo(() => {
    return safeKeywords.filter((kw) => answerContainsKeyword(safeAnswer, kw))
  }, [safeAnswer, safeKeywords])

  const resultMatchedKeywords = useMemo(() => {
    if (Array.isArray(result?.matched_keywords)) {
      return result.matched_keywords.filter(
        (kw): kw is string => typeof kw === "string" && kw.trim().length > 0
      )
    }
    return []
  }, [result])

  const resultMissedKeywords = useMemo(() => {
    if (Array.isArray(result?.missed_keywords)) {
      return result.missed_keywords.filter(
        (kw): kw is string => typeof kw === "string" && kw.trim().length > 0
      )
    }
    return []
  }, [result])

  const keywordPercent =
    typeof result?.keywordScore === "number"
      ? result.keywordScore
      : safeKeywords.length > 0
        ? Math.round((liveMatchedKeywords.length / safeKeywords.length) * 100)
        : 0

  const headlineText =
    score === null
      ? ""
      : score >= 90
        ? "Excellent recall"
        : score >= 70
          ? "Good effort"
          : "Needs review"

  const headlineColor =
    score === null
      ? "#334155"
      : score >= 70
        ? "#166534"
        : "#B91C1C"

  const resultBg =
    score === null
      ? "#FFFFFF"
      : score >= 70
        ? "#F0FDF4"
        : "#FEF2F2"

  const resultBorder =
    score === null
      ? "#E2E8F0"
      : score >= 70
        ? "#BBF7D0"
        : "#FECACA"

  async function submitReport() {
    if (!onReportRule) return

    setReportSubmitting(true)

    try {
      await onReportRule({
        reason: reportReason,
        details: reportDetails.trim(),
      })

      setReportOpen(false)
      setReportReason("incorrect_rule")
      setReportDetails("")
    } finally {
      setReportSubmitting(false)
    }
  }

  return (
    <div className="mt-0">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <MiniTextButton onClick={onNextRule}>Skip</MiniTextButton>
          <MiniTextButton onClick={() => setShowRule((prev) => !prev)}>
            {showRule ? "Hide Rule" : "Show Rule"}
          </MiniTextButton>
        </div>
      </div>

      <div
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#94A3B8",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Question
        </div>

        <div
          style={{
            display: "inline-block",
            fontSize: 17,
            lineHeight: 1.55,
            fontWeight: 700,
            color: "#0F172A",
            background: "linear-gradient(180deg, transparent 58%, #EFF6FF 58%)",
            paddingRight: 4,
          }}
        >
          {questionText}
        </div>
      </div>

      {showRule && ruleText && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 14,
            border: "1.5px solid #DBEAFE",
            background: "#F8FAFF",
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#94A3B8",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Rule to Memorize
          </div>

          <div
            style={{
              fontSize: 15,
              lineHeight: 1.85,
              color: "#334155",
              fontWeight: 400,
            }}
            dangerouslySetInnerHTML={{
              __html: highlightInRule(ruleText, safeKeywords),
            }}
          />
        </div>
      )}

      <div
        style={{
          border: "1.5px solid #E2E8F0",
          borderRadius: 14,
          overflow: "hidden",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px 10px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#94A3B8",
              textTransform: "uppercase",
            }}
          >
            Your Answer
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#94A3B8",
            }}
          >
            {safeAnswer.length} characters
          </div>
        </div>

        <textarea
          value={safeAnswer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!isSubmitting}
          placeholder="Type the rule from memory..."
          style={{
            width: "100%",
            minHeight: 170,
            border: "none",
            padding: 18,
            fontSize: 15,
            lineHeight: 1.7,
            resize: "none",
            outline: "none",
            background: "transparent",
            color: "#0F172A",
            opacity: isSubmitting ? 0.75 : 1,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            borderTop: "1px solid #F1F5F9",
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <MiniButton onClick={onSaveRule}>Save</MiniButton>
            <MiniButton onClick={() => setReportOpen(true)}>Report</MiniButton>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginLeft: "auto",
            }}
          >
            <MiniButton primary onClick={onSubmit} disabled={!!isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </MiniButton>
            <MiniButton onClick={onNextRule}>Next</MiniButton>
          </div>
        </div>
      </div>

      {safeAnswer.trim().length > 0 && liveMatchedKeywords.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {liveMatchedKeywords.map((keyword) => (
            <span
              key={keyword}
              style={{
                borderRadius: 999,
                border: "1px solid #BFDBFE",
                background: "#EFF6FF",
                color: "#2563EB",
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      {reportOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1250,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(560px, calc(100vw - 24px))",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 22,
              boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: 12,
              }}
            >
              Report rule
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#64748B",
                marginBottom: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Problem category
            </div>

            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 14,
                border: "1px solid #CBD5E1",
                padding: "0 12px",
                fontSize: 14,
                color: "#0F172A",
                outline: "none",
                marginBottom: 14,
                background: "#FFFFFF",
              }}
            >
              <option value="incorrect_rule">Incorrect rule</option>
              <option value="wrong_keywords">Wrong keywords</option>
              <option value="typo_formatting">Typo or formatting</option>
              <option value="duplicate_content">Duplicate content</option>
              <option value="other_issue">Other issue</option>
            </select>

            <div
              style={{
                fontSize: 12,
                color: "#64748B",
                marginBottom: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Details
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Explain what is wrong with the rule..."
              style={{
                width: "100%",
                minHeight: 130,
                borderRadius: 16,
                border: "1px solid #CBD5E1",
                padding: 14,
                fontSize: 14,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                background: "#FFFFFF",
                color: "#0F172A",
              }}
            />

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <MiniButton onClick={() => setReportOpen(false)}>
                Cancel
              </MiniButton>

              <MiniButton
                primary
                onClick={submitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? "Submitting..." : "Send report"}
              </MiniButton>
            </div>
          </div>
        </div>
      )}

      {score !== null && showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.28)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 1200,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(720px, calc(100vw - 24px))",
              background: "#FFFFFF",
              border: `1px solid ${resultBorder}`,
              borderRadius: 22,
              boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                minHeight: 220,
              }}
            >
              <div
                style={{
                  padding: 20,
                  background: resultBg,
                  borderRight: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: headlineColor,
                    marginBottom: 10,
                  }}
                >
                  {score}%
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: headlineColor,
                    marginBottom: 10,
                  }}
                >
                  {headlineText}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#64748B",
                    marginBottom: 14,
                  }}
                >
                  Keyword match {keywordPercent}% • Similarity {similarityPercent}%
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid #BBF7D0",
                    background: "#ECFDF5",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {resultMatchedKeywords.length} / {safeKeywords.length} keywords
                </div>
              </div>

              <div style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "#94A3B8",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  Keywords Found
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 14,
                  }}
                >
                  {resultMatchedKeywords.length > 0 ? (
                    resultMatchedKeywords.map((kw, i) => (
                      <span
                        key={`${kw}-${i}`}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#EEF2FF",
                          color: "#1D4ED8",
                          border: "1px solid #93C5FD",
                        }}
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>None</span>
                  )}
                </div>

                {resultMissedKeywords.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        color: "#94A3B8",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Missing Keywords
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      {resultMissedKeywords.map((kw, i) => (
                        <span
                          key={`${kw}-${i}`}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#FEF2F2",
                            color: "#B91C1C",
                            border: "1px solid #FECACA",
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {ruleText && (
                  <div
                    style={{
                      borderTop: "1px solid #E2E8F0",
                      paddingTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        color: "#94A3B8",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Correct Rule
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: "#0F172A",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: highlightInRule(ruleText, safeKeywords),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: 12,
                borderTop: "1px solid #E2E8F0",
                background: "#FFFFFF",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MiniButton onClick={onTryAgain}>Try Again</MiniButton>
                <MiniButton onClick={onSaveRule}>Save</MiniButton>
                <MiniButton onClick={() => setReportOpen(true)}>Report</MiniButton>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MiniButton onClick={() => setShowModal(false)}>Close</MiniButton>
                <MiniButton primary onClick={onNextRule}>Next</MiniButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
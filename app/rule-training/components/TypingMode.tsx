"use client"

import { useEffect, useMemo, useState } from "react"

type Result = {
  score?: number
  matched_keywords?: string[]
  missed_keywords?: string[]
  keywordScore?: number
  similarity?: number
}

type Props = {
  ruleText?: string
  keywords?: string[]
  title?: string
  answer?: string
  setAnswer: (v: string) => void
  onSubmit: () => void
  onTryAgain?: () => void
  onNextRule?: () => void
  onSaveRule?: () => void
  onReportRule?: () => void
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
  const safeKeywords = keywords.filter((kw) => typeof kw === "string" && kw.trim().length > 0)
  const sortedKeywords = [...safeKeywords].sort((a, b) => b.length - a.length)

  sortedKeywords.forEach((kw) => {
    const regex = new RegExp(`(${escapeRegex(kw)})`, "gi")
    html = html.replace(
      regex,
      `<span style="text-decoration:underline; text-underline-offset:4px;">$1</span>`
    )
  })

  return html
}

export default function TypingMode({
  ruleText,
  keywords = [],
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
  const [showModal, setShowModal] = useState(true)
  const [showRule, setShowRule] = useState(true)

  const safeAnswer = typeof answer === "string" ? answer : ""
  const safeKeywords = Array.isArray(keywords)
    ? keywords.filter((kw): kw is string => typeof kw === "string")
    : []

  useEffect(() => {
    setShowModal(true)
  }, [result?.score, ruleText])

  const score = result?.score ?? null
  const similarityPercent = result?.similarity ?? 0

  const liveMatchedKeywords = useMemo(() => {
    return safeKeywords.filter((kw) => answerContainsKeyword(safeAnswer, kw))
  }, [safeAnswer, safeKeywords])

  const missingKeywords = useMemo(() => {
    return safeKeywords.filter((kw) => !answerContainsKeyword(safeAnswer, kw))
  }, [safeAnswer, safeKeywords])

  const keywordPercent =
    safeKeywords.length > 0
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
        ? "#2F855A"
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

  return (
    <div className="mt-1">
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setShowRule((prev) => !prev)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#475569",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {showRule ? "Hide Rule" : "Show Rule"}
        </button>
      </div>

      {showRule && ruleText && (
        <div
          style={{
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#94A3B8",
              marginBottom: 8,
            }}
          >
            RULE TO MEMORIZE
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
          paddingTop: 4,
        }}
      >
        <textarea
          value={safeAnswer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!isSubmitting}
          placeholder="Type the rule from memory..."
          style={{
            width: "100%",
            minHeight: 210,
            border: "1.5px solid #BFDBFE",
            borderRadius: 24,
            padding: 22,
            fontSize: 15,
            lineHeight: 1.7,
            resize: "none",
            outline: "none",
            background: "rgba(255,255,255,0.75)",
            color: "#0F172A",
            opacity: isSubmitting ? 0.75 : 1,
            boxShadow: "0 8px 24px rgba(148,163,184,0.08)",
          }}
        />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#94A3B8",
            }}
          >
            {safeAnswer.length} characters
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setAnswer("")}
              style={{
                padding: "10px 18px",
                borderRadius: 16,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#64748B",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Skip
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!!isSubmitting}
              style={{
                padding: "10px 22px",
                borderRadius: 16,
                border: "none",
                background: isSubmitting ? "#A78BFA" : "#3157D6",
                color: "white",
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 10px 24px rgba(49,87,214,0.22)",
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Rule"}
            </button>
          </div>
        </div>
      </div>

      {safeAnswer.trim().length > 0 && liveMatchedKeywords.length > 0 && (
        <div
          style={{
            marginTop: 14,
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
                fontWeight: 500,
              }}
            >
              {keyword}
            </span>
          ))}
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
                  {liveMatchedKeywords.length} / {safeKeywords.length} keywords
                </div>
              </div>

              <div style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#94A3B8",
                    marginBottom: 8,
                  }}
                >
                  KEYWORDS FOUND
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {liveMatchedKeywords.length > 0 ? (
                    liveMatchedKeywords.map((kw, i) => (
                      <span
                        key={i}
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

                {missingKeywords.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "#94A3B8",
                        marginBottom: 8,
                      }}
                    >
                      MISSING KEYWORDS
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                      {missingKeywords.map((kw, i) => (
                        <span
                          key={i}
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
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "#94A3B8",
                        marginBottom: 8,
                      }}
                    >
                      CORRECT RULE
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
                padding: 14,
                borderTop: "1px solid #E2E8F0",
                background: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={onTryAgain}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Try Again
                </button>

                <button
                  onClick={onSaveRule}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>

                <button
                  onClick={onReportRule}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Report
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#64748B",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>

                <button
                  onClick={onNextRule}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    background: "#6D28D9",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Next Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
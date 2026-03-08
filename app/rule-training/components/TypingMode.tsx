"use client"

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
  answer: string
  setAnswer: (v: string) => void
  onSubmit: () => void
  onTryAgain?: () => void
  onNextRule?: () => void
  onSaveRule?: () => void
  onReportRule?: () => void
  result?: Result | null
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function answerContainsKeyword(answer: string, keyword: string) {
  const normalizedAnswer = normalizeText(answer)
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword) return false
  return normalizedAnswer.includes(normalizedKeyword)
}

function colorForKeyword(index: number) {
  const palette = [
    { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
    { bg: "#EDE9FE", text: "#7C3AED", border: "#C4B5FD" },
    { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
    { bg: "#FEF3C7", text: "#D97706", border: "#FCD34D" },
    { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
  ]
  return palette[index % palette.length]
}

function highlightKeywords(text: string, keywords: string[] = []) {
  if (!text) return ""

  let html = text

  keywords.forEach((kw, index) => {
    const color = colorForKeyword(index)
    const regex = new RegExp(`(${escapeRegex(kw)})`, "gi")

    html = html.replace(
      regex,
      `<span style="
        background:${color.bg};
        color:${color.text};
        border:1px solid ${color.border};
        padding:2px 8px;
        border-radius:8px;
        font-weight:600;
      ">$1</span>`
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
}: Props) {
  const score = result?.score ?? null
  const matched = result?.matched_keywords ?? []
  const missed = result?.missed_keywords ?? []

  const borderColor =
    score === null ? "#CBD5E1" : score >= 70 ? "#38A169" : "#E53E3E"

  const resultBorder =
    score === null ? "#E2E8F0" : score >= 70 ? "#BBF7D0" : "#FECACA"

  const resultBg =
    score === null ? "#FFFFFF" : score >= 70 ? "#F0FDF4" : "#FEF2F2"

  const headlineColor =
    score === null ? "#334155" : score >= 70 ? "#2F855A" : "#DC2626"

  const headlineText =
    score === null
      ? ""
      : score >= 90
      ? "Excellent recall"
      : score >= 70
      ? "Good effort"
      : "Needs review"

  const frontendMatchedCount = keywords.filter((kw) =>
    answerContainsKeyword(answer, kw)
  ).length

  const keywordPercent =
    keywords.length > 0
      ? Math.round((frontendMatchedCount / keywords.length) * 100)
      : 0

  const similarityPercent = result?.similarity ?? 0

  return (
    <div style={{ marginTop: 10 }}>
      {ruleText && (
        <div
          style={{
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
            padding: 18,
            borderRadius: 16,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#1D4ED8",
              marginBottom: 10,
            }}
          >
            RULE TO MEMORIZE
          </div>

          <div
            style={{
              fontSize: 17,
              lineHeight: 1.8,
              color: "#1E40AF",
              fontWeight: 500,
            }}
          >
            {ruleText}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#94A3B8",
              marginBottom: 8,
            }}
          >
            KEYWORDS
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {keywords.map((kw, i) => {
              const matchedNow =
                score === null ? false : answerContainsKeyword(answer, kw)

              const bg =
                score === null
                  ? "#F8FAFC"
                  : matchedNow
                  ? "#DCFCE7"
                  : "#FEE2E2"

              const text =
                score === null
                  ? "#64748B"
                  : matchedNow
                  ? "#166534"
                  : "#991B1B"

              const border =
                score === null
                  ? "#E2E8F0"
                  : matchedNow
                  ? "#86EFAC"
                  : "#FCA5A5"

              return (
                <span
                  key={i}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: bg,
                    color: text,
                    border: `1px solid ${border}`,
                  }}
                >
                  {score !== null ? (matchedNow ? "✓ " : "✕ ") : ""}
                  {kw}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type the rule from memory. Include all key terms..."
        style={{
          width: "100%",
          minHeight: 180,
          border: `2px solid ${borderColor}`,
          borderRadius: 18,
          padding: 18,
          fontSize: 16,
          lineHeight: 1.6,
          resize: "vertical",
          outline: "none",
          background: "#FFFFFF",
        }}
      />

      {score === null && (
        <button
          onClick={onSubmit}
          style={{
            marginTop: 18,
            padding: "14px 26px",
            borderRadius: 14,
            border: "none",
            background: "#3B5BDB",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Submit Rule
        </button>
      )}

      {score !== null && (
        <>
          <div
            style={{
              marginTop: 28,
              padding: 24,
              borderRadius: 18,
              border: `1px solid ${resultBorder}`,
              background: resultBg,
            }}
          >
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: headlineColor,
                  lineHeight: 1,
                  minWidth: 72,
                }}
              >
                {score}%
              </div>

              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: headlineColor,
                    marginBottom: 4,
                  }}
                >
                  {headlineText}
                </div>

                <div
                  style={{
                    fontSize: 15,
                    color: "#64748B",
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                >
                  Keywords: {keywordPercent}% • Word similarity: {similarityPercent}%
                  <br />
                  {frontendMatchedCount}/{keywords.length} key terms found
                </div>
              </div>
            </div>

            {(missed.length > 0 || frontendMatchedCount < keywords.length) && (
              <div style={{ marginTop: 10, marginBottom: 18 }}>
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#B91C1C",
                  }}
                >
                  Missing keywords:
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {keywords
                    .filter((kw) => !answerContainsKeyword(answer, kw))
                    .map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          background: "#FEE2E2",
                          color: "#991B1B",
                          border: "1px solid #FCA5A5",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {ruleText && (
              <div
                style={{
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#94A3B8",
                    marginBottom: 12,
                  }}
                >
                  CORRECT RULE
                </div>

                <div
                  style={{
                    border: "1px solid #CBD5E1",
                    borderRadius: 14,
                    padding: 18,
                    background: "#FFFFFF",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#94A3B8",
                      marginBottom: 12,
                    }}
                  >
                    LEGAL KEYWORDS HIGHLIGHTED
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.9,
                      color: "#0F172A",
                      marginBottom: 16,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightKeywords(ruleText, keywords),
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    {keywords.map((kw, i) => {
                      const color = colorForKeyword(i)

                      return (
                        <span
                          key={i}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {kw}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onTryAgain}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ↺ Try Again
            </button>

            <button
              onClick={onSaveRule}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ☆ Save
            </button>

            <button
              onClick={onReportRule}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⚑ Report Rule
            </button>

            <button
              onClick={onNextRule}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: "#3B5BDB",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Next Rule →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
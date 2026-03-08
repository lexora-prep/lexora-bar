"use client"

import { useEffect, useState } from "react"

type Props = {
  ruleText: string
  keywords: string[]
  onNextRule: () => void
}

const colors = [
  { bg: "#DBEAFE", border: "#93C5FD", text: "#1D4ED8" },
  { bg: "#EDE9FE", border: "#C4B5FD", text: "#7C3AED" },
  { bg: "#DCFCE7", border: "#A7F3D0", text: "#059669" },
  { bg: "#FEF3C7", border: "#FCD34D", text: "#D97706" },
]

export default function BuzzwordsMode({
  ruleText,
  keywords,
  onNextRule,
}: Props) {
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [reviewed, setReviewed] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState("")
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    setRevealed(new Array(keywords.length).fill(false))
    setReviewed(false)
    setReportOpen(false)
    setReportText("")
    setReportSent(false)
  }, [ruleText, keywords])

  function reveal(index: number) {
    if (reviewed) return
    const copy = [...revealed]
    copy[index] = true
    setRevealed(copy)
  }

  function markReviewed() {
    setReviewed(true)
    setRevealed(new Array(keywords.length).fill(true))
  }

  function reviewAgain() {
    setRevealed(new Array(keywords.length).fill(false))
    setReviewed(false)
    setReportOpen(false)
    setReportText("")
    setReportSent(false)
  }

  async function sendReport() {
    if (!reportText.trim()) return

    try {
      await fetch("/api/report-rule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "buzzwords",
          ruleText,
          keywords,
          message: reportText.trim(),
        }),
      })
      setReportSent(true)
      setReportText("")
    } catch (e) {
      console.error(e)
    }
  }

  function buildSentence() {
    let text = ruleText

    keywords.forEach((kw, i) => {
      text = text.replace(kw, `__KW_${i}__`)
    })

    const parts = text.split(/(__KW_\d+__)/g)

    return parts.map((part, i) => {
      const match = part.match(/__KW_(\d+)__/)

      if (!match) return <span key={i}>{part}</span>

      const index = Number(match[1])
      const style = colors[index % colors.length]
      const isRevealed = revealed[index]

      return (
        <span
          key={i}
          onClick={() => reveal(index)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 40,
            padding: "4px 12px",
            margin: "0 4px",
            borderRadius: 10,
            border: `2px solid ${style.border}`,
            background: style.bg,
            color: isRevealed ? style.text : "transparent",
            fontWeight: 700,
            fontSize: 15,
            cursor: reviewed ? "default" : "pointer",
            userSelect: "none",
            transition: "all 0.15s ease",
            verticalAlign: "baseline",
          }}
        >
          {isRevealed ? keywords[index] : "_ _ _ _ _ _ _ _"}
        </span>
      )
    })
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          border: "1px solid #CBD5E1",
          borderRadius: 16,
          padding: 26,
          background: "#FFFFFF",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            color: "#94A3B8",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          LEGAL KEYWORDS HIGHLIGHTED
        </div>

        <div
          style={{
            fontSize: 18,
            lineHeight: 2,
            color: "#1E293B",
            fontWeight: 500,
          }}
        >
          {buildSentence()}
        </div>
      </div>

      {!reviewed && (
        <button
          onClick={markReviewed}
          style={{
            background: "#3451D1",
            color: "white",
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Mark as Reviewed
        </button>
      )}

      {reviewed && (
        <>
          <div
            style={{
              marginTop: 22,
              border: "1px solid #A7F3D0",
              background: "#F0FDF4",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#059669",
                marginBottom: 14,
              }}
            >
              Excellent recall!! ✓
            </div>

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
                  letterSpacing: "0.1em",
                  color: "#94A3B8",
                  marginBottom: 14,
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
                    letterSpacing: "0.1em",
                    color: "#94A3B8",
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  LEGAL KEYWORDS HIGHLIGHTED
                </div>

                <div
                  style={{
                    fontSize: 18,
                    lineHeight: 2,
                    color: "#1E293B",
                    fontWeight: 500,
                  }}
                >
                  {keywords.map((_, i) => null) && buildSentence()}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={reviewAgain}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ↺ Review Again
              </button>

              <button
                onClick={onNextRule}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#3451D1",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Next Rule →
              </button>
            </div>

            <button
              onClick={() => setReportOpen((v) => !v)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ⚑ Report
            </button>
          </div>

          {reportOpen && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                borderRadius: 14,
                padding: 16,
                maxWidth: 620,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 10,
                }}
              >
                Report an issue with this question
              </div>

              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Tell the admin what is wrong with this question..."
                style={{
                  width: "100%",
                  minHeight: 110,
                  border: "1px solid #CBD5E1",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  resize: "vertical",
                  outline: "none",
                  color: "#1E293B",
                }}
              />

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={sendReport}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: "#3451D1",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Send report
                </button>

                {reportSent && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    Report sent.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
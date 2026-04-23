"use client"

import { useEffect, useState } from "react"

type Props = {
  ruleId?: string
  title: string
  subject?: string
  topic?: string
  subtopic?: string
  ruleText: string
  keywords: string[]
  onNextRule?: () => void
  onSaveRule?: () => void
}

type ReviewResult = "knew" | "missed" | null

export default function FlashcardMode({
  ruleId,
  title,
  subject,
  topic,
  subtopic,
  ruleText,
  keywords,
  onNextRule,
  onSaveRule,
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult>(null)

  useEffect(() => {
    setRevealed(false)
    setReviewResult(null)
  }, [ruleId])

  function handleReveal() {
    if (reviewResult !== null) return
    setRevealed(true)
  }

  async function record(result: "knew" | "missed") {
    try {
      await fetch("/api/record-flashcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ruleId,
          result,
          mode: "flashcard",
        }),
      })
    } catch (e) {
      console.error(e)
    }

    setReviewResult(result)
  }

  function handleTryAgain() {
    setRevealed(false)
    setReviewResult(null)
  }

  function handleNext() {
    setRevealed(false)
    setReviewResult(null)
    onNextRule?.()
  }

  const pathParts = [subject, topic, subtopic].filter(Boolean)
  const pathText = pathParts.join(" · ")

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 13,
          color: "#A1A1AA",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Click the card to reveal the rule
      </div>

      <div style={{ position: "relative", minHeight: 320 }}>
        <div
          onClick={handleReveal}
          style={{
            position: "relative",
            width: "100%",
            minHeight: 320,
            cursor: reviewResult === null ? "pointer" : "default",
          }}
        >
          <div
            style={{
              position: revealed ? "absolute" : "relative",
              inset: revealed ? 0 : undefined,
              opacity: revealed ? 0 : 1,
              transform: revealed ? "translateY(10px) scale(0.985)" : "translateY(0) scale(1)",
              pointerEvents: revealed ? "none" : "auto",
              transition: "opacity 0.32s ease, transform 0.32s ease",
              borderRadius: 24,
              border: "1px solid #E2E8F0",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
              padding: "38px 48px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 320,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  color: "#A1A1AA",
                  fontWeight: 700,
                  marginBottom: 18,
                }}
              >
                QUESTION
              </div>

              <div
                style={{
                  fontSize: 17,
                  lineHeight: 1.72,
                  fontWeight: 400,
                  color: "#334155",
                }}
              >
                What rule applies here for {title}?
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#A1A1AA",
                fontSize: 12,
              }}
            >
              <span>{pathText}</span>
              <span>• Click to reveal</span>
            </div>
          </div>

          <div
            style={{
              position: revealed ? "relative" : "absolute",
              inset: revealed ? undefined : 0,
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0) scale(1)" : "translateY(12px) scale(0.985)",
              pointerEvents: revealed ? "auto" : "none",
              transition: "opacity 0.32s ease, transform 0.32s ease",
              borderRadius: 24,
              border: "1px solid #BFDBFE",
              background:
                "linear-gradient(180deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.96) 100%)",
              boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 320,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "#94A3B8",
                  marginBottom: 12,
                }}
              >
                RULE
              </div>

              <div
                style={{
                  fontSize: 17,
                  lineHeight: 1.72,
                  fontWeight: 400,
                  color: "#334155",
                  marginBottom: 18,
                }}
              >
                {ruleText}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      color: "#2563EB",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {revealed && reviewResult === null && (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <button
            onClick={() => record("missed")}
            style={{
              height: 44,
              borderRadius: 14,
              border: "1.5px solid #FCA5A5",
              background: "#FEF2F2",
              color: "#DC2626",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✗ Missed It
          </button>

          <button
            onClick={() => record("knew")}
            style={{
              height: 44,
              borderRadius: 14,
              border: "1.5px solid #93C5FD",
              background: "#EFF6FF",
              color: "#1D4ED8",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✓ Knew It
          </button>
        </div>
      )}

      {reviewResult !== null && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleTryAgain}
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: 14,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>

          <button
            onClick={onSaveRule}
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: 14,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>

          <button
            onClick={handleNext}
            style={{
              height: 40,
              padding: "0 20px",
              borderRadius: 14,
              border: "none",
              background: "#3157D6",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Next Rule
          </button>
        </div>
      )}
    </div>
  )
}
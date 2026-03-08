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
  const [flipped, setFlipped] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult>(null)

  useEffect(() => {
    setFlipped(false)
    setReviewResult(null)
  }, [ruleId])

  function handleFlip() {
    if (reviewResult !== null) return
    setFlipped(true)
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
    setFlipped(false)
    setReviewResult(null)
  }

  function handleNext() {
    setFlipped(false)
    setReviewResult(null)
    onNextRule?.()
  }

  const pathParts = [subject, topic, subtopic].filter(Boolean)
  const pathText = pathParts.join(" · ")

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ perspective: "1400px" }}>
        <div
          onClick={handleFlip}
          style={{
            position: "relative",
            width: "100%",
            height: 270,
            transformStyle: "preserve-3d",
            transition: "transform 0.65s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            cursor: reviewResult === null ? "pointer" : "default",
          }}
        >
          {/* FRONT */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              borderRadius: 28,
              background: "linear-gradient(180deg, #0A1535 0%, #0B1738 100%)",
              color: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "36px 40px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.14em",
                color: "#9CA3AF",
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              CLICK TO REVEAL
            </div>

            <div
              style={{
                fontSize: 16,
                color: "#60A5FA",
                fontWeight: 500,
                marginBottom: 18,
              }}
            >
              {pathText}
            </div>

            <div
              style={{
                fontSize: 31,
                lineHeight: 1.22,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
              }}
            >
              {title}
            </div>
          </div>

          {/* BACK */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderRadius: 28,
              background: "#ECFDF5",
              border: "2px solid #A7F3D0",
              padding: "28px 32px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  color: "#047857",
                  marginBottom: 14,
                }}
              >
                RULE
              </div>

              <div
                style={{
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: "#1E293B",
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
                      background: "#D1FAE5",
                      border: "1px solid #A7F3D0",
                      color: "#065F46",
                      fontSize: 13,
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

      {flipped && reviewResult === null && (
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
              height: 42,
              borderRadius: 12,
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
              height: 42,
              borderRadius: 12,
              border: "1.5px solid #86EFAC",
              background: "#ECFDF5",
              color: "#15803D",
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
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Try Again
          </button>

          <button
            onClick={onSaveRule}
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ☆ Save
          </button>

          <button
            onClick={handleNext}
            style={{
              height: 40,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#3157D6",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Next Rule →
          </button>
        </div>
      )}
    </div>
  )
}
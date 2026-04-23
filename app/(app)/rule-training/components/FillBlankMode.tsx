"use client"

import { useEffect, useMemo, useState } from "react"

type Props = {
  ruleText: string
  keywords: string[]
  onNextRule: () => void
}

function normalizeText(text: unknown) {
  if (typeof text !== "string") return ""

  return text
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function countWords(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) return 1
  return normalized.split(" ").length
}

function isCorrectAnswer(userValue: unknown, correctValue: unknown) {
  return normalizeText(userValue) === normalizeText(correctValue)
}

function buildSafeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) return []
  return keywords.filter(
    (kw): kw is string => typeof kw === "string" && kw.trim().length > 0
  )
}

export default function FillBlankMode({
  ruleText,
  keywords,
  onNextRule,
}: Props) {
  const safeRuleText = typeof ruleText === "string" ? ruleText : ""
  const safeKeywords = useMemo(() => buildSafeKeywords(keywords), [keywords])

  const [answers, setAnswers] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    setAnswers(new Array(safeKeywords.length).fill(""))
    setChecked(false)
    setFocusedIndex(null)
  }, [safeRuleText, safeKeywords])

  function updateAnswer(index: number, value: string) {
    const copy = [...answers]
    copy[index] = value
    setAnswers(copy)
  }

  function handleSubmit() {
    setChecked(true)
    setFocusedIndex(null)
  }

  function handleTryAgain() {
    setAnswers(new Array(safeKeywords.length).fill(""))
    setChecked(false)
    setFocusedIndex(null)
  }

  const allCorrect =
    safeKeywords.length > 0 &&
    safeKeywords.every((keyword, index) => isCorrectAnswer(answers[index], keyword))

  const missingKeywords = safeKeywords.filter((keyword, index) => {
    return !isCorrectAnswer(answers[index], keyword)
  })

  function getBlankWidth(keyword: string) {
    const words = countWords(keyword)
    const len = keyword.length

    if (words >= 3) return Math.min(240, Math.max(120, len * 7))
    if (words === 2) return Math.min(180, Math.max(92, len * 6))
    return Math.min(120, Math.max(60, len * 5.5))
  }

  function getColors(index: number, answerValue: string, keyword: string) {
    const isFocused = focusedIndex === index
    const currentIsCorrect = isCorrectAnswer(answerValue, keyword)
    const hasValue = normalizeText(answerValue).length > 0

    if (!checked && isFocused) {
      return {
        text: "#8B5CF6",
        line: "#A78BFA",
        hint: "#B8B8B8",
      }
    }

    if (checked && currentIsCorrect) {
      return {
        text: "#2563EB",
        line: "#93C5FD",
        hint: "#B8B8B8",
      }
    }

    if (checked && !currentIsCorrect && hasValue) {
      return {
        text: "#DC2626",
        line: "#FCA5A5",
        hint: "#B8B8B8",
      }
    }

    return {
      text: "#374151",
      line: "#CBD5E1",
      hint: "#B8B8B8",
    }
  }

  function buildSentence() {
    let text = safeRuleText

    safeKeywords.forEach((kw, i) => {
      text = text.replace(kw, `__BLANK_${i}__`)
    })

    const parts = text.split(/(__BLANK_\d+__)/g)

    return parts.map((part, i) => {
      const match = part.match(/__BLANK_(\d+)__/)

      if (!match) {
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        )
      }

      const index = Number(match[1])
      const keyword = safeKeywords[index] ?? ""
      const answerValue = answers[index] ?? ""
      const words = countWords(keyword)
      const width = getBlankWidth(keyword)
      const colors = getColors(index, answerValue, keyword)

      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            position: "relative",
            width,
            margin: "0 14px",
            verticalAlign: "baseline",
            paddingTop: 20,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -2,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 11,
              lineHeight: 1,
              color: colors.hint,
              fontWeight: 500,
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            {words} word{words > 1 ? "s" : ""}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "flex-end",
              justifyContent: "center",
              width: "100%",
              minHeight: 28,
              borderBottom: `1px solid ${colors.line}`,
              paddingBottom: 2,
              verticalAlign: "baseline",
            }}
          >
            <input
              value={answerValue}
              disabled={checked}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((prev) => (prev === index ? null : prev))}
              onChange={(e) => updateAnswer(index, e.target.value)}
              placeholder=""
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                boxShadow: "none",
                padding: 0,
                margin: 0,
                textAlign: "center",
                fontSize: 13,
                lineHeight: "18px",
                fontWeight: 500,
                color: colors.text,
                height: 18,
              }}
            />
          </span>
        </span>
      )
    })
  }

  return (
    <div style={{ marginTop: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          fontWeight: 700,
          color: "#B8B8B8",
          marginBottom: 18,
          textTransform: "uppercase",
        }}
      >
        Fill in the blanks
      </div>

      <div
        style={{
          fontSize: 17,
          lineHeight: 2.2,
          color: "#334155",
          fontWeight: 400,
          marginBottom: 22,
        }}
      >
        {buildSentence()}
      </div>

      <div
        style={{
          borderTop: "1px solid #ECECEC",
          paddingTop: 16,
          marginTop: 8,
        }}
      >
        <div
          style={{
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
              color: "#B3B3B3",
              fontWeight: 400,
            }}
          >
            {!checked
              ? "Fill all blanks to submit"
              : allCorrect
                ? "All blanks correct"
                : "Review the missed blanks"}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {!checked ? (
              <>
                <button
                  type="button"
                  onClick={() => setAnswers(new Array(safeKeywords.length).fill(""))}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1px solid #D9D9D9",
                    background: "#FFFFFF",
                    color: "#8A8A8A",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "none",
                    background: "#3157D6",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Check Answers
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTryAgain}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1px solid #D9D9D9",
                    background: "#FFFFFF",
                    color: "#6B7280",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={onNextRule}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "none",
                    background: "#3157D6",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Next Rule
                </button>
              </>
            )}
          </div>
        </div>

        {checked && !allCorrect && missingKeywords.length > 0 && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {missingKeywords.map((keyword) => (
              <span
                key={keyword}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid #FECACA",
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
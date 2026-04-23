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

function buildSafeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) return []
  return keywords.filter(
    (kw): kw is string => typeof kw === "string" && kw.trim().length > 0
  )
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function BuzzwordsMode({
  ruleText,
  keywords,
  onNextRule,
}: Props) {
  const safeRuleText = typeof ruleText === "string" ? ruleText : ""
  const safeKeywords = useMemo(() => buildSafeKeywords(keywords), [keywords])

  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const distractors = [
      "jurisdiction",
      "venue",
      "due process",
      "standing",
      "res judicata",
      "consideration",
      "hearsay",
      "strict scrutiny",
      "mens rea",
      "discovery cutoff",
      "case management",
      "minimum contacts",
      "forum selection",
      "substantial performance",
    ]

    const filteredDistractors = distractors.filter(
      (item) =>
        !safeKeywords.some(
          (kw) => normalizeText(kw) === normalizeText(item)
        )
    )

    const mixed = shuffleArray([
      ...safeKeywords,
      ...filteredDistractors.slice(0, Math.max(3, 8 - safeKeywords.length)),
    ])

    setOptions(mixed)
    setSelected([])
    setChecked(false)
  }, [safeKeywords, safeRuleText])

  function toggleKeyword(keyword: string) {
    if (checked) return

    setSelected((prev) =>
      prev.some((item) => normalizeText(item) === normalizeText(keyword))
        ? prev.filter((item) => normalizeText(item) !== normalizeText(keyword))
        : [...prev, keyword]
    )
  }

  function handleCheck() {
    setChecked(true)
  }

  function handleSkip() {
    setSelected([])
    setChecked(false)
  }

  function handleTryAgain() {
    setSelected([])
    setChecked(false)
  }

  function isCorrectKeyword(keyword: string) {
    return safeKeywords.some(
      (item) => normalizeText(item) === normalizeText(keyword)
    )
  }

  function isSelected(keyword: string) {
    return selected.some(
      (item) => normalizeText(item) === normalizeText(keyword)
    )
  }

  function getChipStyle(keyword: string): React.CSSProperties {
    const selectedNow = isSelected(keyword)
    const correct = isCorrectKeyword(keyword)

    if (!checked) {
      if (selectedNow) {
        return {
          border: "1px solid #A78BFA",
          background: "#F5F3FF",
          color: "#7C3AED",
        }
      }

      return {
        border: "1px solid #D9D9D9",
        background: "#FFFFFF",
        color: "#3F3F46",
      }
    }

    if (selectedNow && correct) {
      return {
        border: "1px solid #93C5FD",
        background: "#EFF6FF",
        color: "#2563EB",
      }
    }

    if (selectedNow && !correct) {
      return {
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        color: "#DC2626",
      }
    }

    if (!selectedNow && correct) {
      return {
        border: "1px solid #BFDBFE",
        background: "#F8FBFF",
        color: "#2563EB",
      }
    }

    return {
      border: "1px solid #E5E7EB",
      background: "#FFFFFF",
      color: "#A1A1AA",
    }
  }

  const correctSelections = selected.filter((item) => isCorrectKeyword(item))
  const missedKeywords = safeKeywords.filter((item) => !isSelected(item))
  const allCorrect =
    checked &&
    missedKeywords.length === 0 &&
    selected.length === safeKeywords.length

  return (
    <div style={{ marginTop: 0 }}>
      <div
        style={{
          fontSize: 17,
          lineHeight: 1.72,
          color: "#334155",
          fontWeight: 400,
          marginBottom: 20,
        }}
      >
        {safeRuleText}
      </div>

      <div
        style={{
          borderTop: "1px solid #ECECEC",
          paddingTop: 18,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#666672",
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          Select all keywords that belong to this rule.
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 26,
          }}
        >
          {options.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => toggleKeyword(keyword)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                cursor: checked ? "default" : "pointer",
                transition: "all 0.15s ease",
                ...getChipStyle(keyword),
              }}
            >
              {keyword}
            </button>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid #ECECEC",
            paddingTop: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "#A1A1AA",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Selected
          </div>

          {selected.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selected.map((keyword) => (
                <span
                  key={keyword}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: "1px solid #C4B5FD",
                    background: "#F5F3FF",
                    color: "#7C3AED",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "#A1A1AA",
              }}
            >
              None yet
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #ECECEC",
            paddingTop: 16,
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
              color: "#A1A1AA",
            }}
          >
            {selected.length} selected
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {!checked ? (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
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
                  onClick={handleCheck}
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
                  Check Selection
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

        {checked && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {allCorrect ? (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #BFDBFE",
                  background: "#EFF6FF",
                  color: "#2563EB",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Correct selection
              </span>
            ) : (
              <>
                {correctSelections.length > 0 && (
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid #BFDBFE",
                      background: "#EFF6FF",
                      color: "#2563EB",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {correctSelections.length} correct
                  </span>
                )}

                {missedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid #FECACA",
                      background: "#FEF2F2",
                      color: "#B91C1C",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Missed: {keyword}
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
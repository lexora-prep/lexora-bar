"use client"

import { useEffect, useMemo, useState } from "react"

type SubmitPayload = {
  userAnswer: string
  score: number
  matchedKeywords: string[]
  missedKeywords: string[]
  keywordScore: number
  similarity: number
}

type Props = {
  ruleText: string
  keywords: string[]
  onNextRule: () => void
  onSubmitModeAttempt?: (payload: SubmitPayload) => void | Promise<void>
  isSubmitting?: boolean
}

function normalizeText(text: unknown) {
  if (typeof text !== "string") return ""

  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function splitRuleIntoFragments(ruleText: string) {
  const cleaned = (ruleText || "").replace(/\s+/g, " ").trim()
  if (!cleaned) return []

  const commaParts = cleaned
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  let fragments: string[] = []

  if (commaParts.length >= 4) {
    fragments = commaParts
  } else {
    const words = cleaned.split(" ").filter(Boolean)
    const targetParts = Math.min(5, Math.max(4, Math.ceil(words.length / 5)))
    const chunkSize = Math.ceil(words.length / targetParts)

    for (let i = 0; i < words.length; i += chunkSize) {
      fragments.push(words.slice(i, i + chunkSize).join(" "))
    }
  }

  fragments = fragments.map((part) => part.trim()).filter(Boolean)

  if (fragments.length > 5) {
    const merged = [...fragments]
    while (merged.length > 5) {
      const last = merged.pop() ?? ""
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${last}`.trim()
    }
    fragments = merged
  }

  return fragments
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const RULE_TEXT_STYLE: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.72,
  fontWeight: 400,
  color: "#334155",
}

export default function OrderingMode({
  ruleText,
  keywords,
  onNextRule,
  onSubmitModeAttempt,
  isSubmitting = false,
}: Props) {
  const correctFragments = useMemo(() => splitRuleIntoFragments(ruleText), [ruleText])

  const [items, setItems] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (correctFragments.length <= 1) {
      setItems(correctFragments)
      setChecked(false)
      setDragIndex(null)
      setDragOverIndex(null)
      setScore(0)
      return
    }

    const shuffled = shuffleArray(correctFragments)
    const sameOrder =
      shuffled.length === correctFragments.length &&
      shuffled.every((item, index) => item === correctFragments[index])

    setItems(sameOrder ? [...shuffled].reverse() : shuffled)
    setChecked(false)
    setDragIndex(null)
    setDragOverIndex(null)
    setScore(0)
  }, [correctFragments])

  async function handleCheck() {
    const correctPositions = items.filter(
      (item, index) => normalizeText(item) === normalizeText(correctFragments[index])
    ).length

    const nextScore =
      correctFragments.length > 0
        ? Math.round((correctPositions / correctFragments.length) * 100)
        : 0

    const fullText = items.join(" ")
    const safeKeywords = Array.isArray(keywords) ? keywords : []
    const matchedKeywords = safeKeywords.filter((kw) =>
      normalizeText(fullText).includes(normalizeText(kw))
    )

    setScore(nextScore)
    setChecked(true)

    await onSubmitModeAttempt?.({
      userAnswer: fullText,
      score: nextScore,
      matchedKeywords,
      missedKeywords: [],
      keywordScore: matchedKeywords.length > 0 ? 100 : 0,
      similarity: nextScore,
    })
  }

  function handleTryAgain() {
    if (correctFragments.length <= 1) {
      setItems(correctFragments)
      setChecked(false)
      setScore(0)
      return
    }

    const reshuffled = shuffleArray(correctFragments)
    const sameOrder =
      reshuffled.length === correctFragments.length &&
      reshuffled.every((item, index) => item === correctFragments[index])

    setItems(sameOrder ? [...reshuffled].reverse() : reshuffled)
    setChecked(false)
    setDragIndex(null)
    setDragOverIndex(null)
    setScore(0)
  }

  function moveItem(from: number, to: number) {
    if (checked) return
    if (from === to) return

    const next = [...items]
    const draggedItem = next[from]
    next.splice(from, 1)
    next.splice(to, 0, draggedItem)
    setItems(next)
  }

  function handleDragStart(index: number) {
    if (checked) return
    setDragIndex(index)
  }

  function handleDragEnter(index: number) {
    if (checked) return
    setDragOverIndex(index)
  }

  function handleDrop(index: number) {
    if (checked) return
    if (dragIndex === null) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    moveItem(dragIndex, index)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function itemState(item: string, index: number) {
    if (!checked) return "default"
    return normalizeText(item) === normalizeText(correctFragments[index])
      ? "correct"
      : "wrong"
  }

  const allCorrect =
    checked &&
    items.length === correctFragments.length &&
    items.every(
      (item, index) => normalizeText(item) === normalizeText(correctFragments[index])
    )

  return (
    <div style={{ marginTop: 0 }}>
      <div
        style={{
          fontSize: 13,
          color: "#666672",
          marginBottom: 16,
          fontWeight: 400,
        }}
      >
        Drag the fragments into the correct order to reconstruct the rule.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item, index) => {
          const state = itemState(item, index)
          const isDragging = dragIndex === index
          const isDragOver = dragOverIndex === index && dragIndex !== index

          let border = "1px solid #D9D9D9"
          let background = "#FFFFFF"
          let numberBorder = "1px solid #D4D4D8"
          let numberColor = "#A1A1AA"

          if (state === "correct") {
            border = "1px solid #93C5FD"
            background = "#EFF6FF"
            numberBorder = "1px solid #3B82F6"
            numberColor = "#2563EB"
          } else if (state === "wrong") {
            border = "1px solid #FECACA"
            background = "#FEF2F2"
            numberBorder = "1px solid #EF4444"
            numberColor = "#DC2626"
          } else if (isDragOver) {
            border = "1px solid #A78BFA"
            background = "#F5F3FF"
          }

          return (
            <div
              key={`${item}-${index}`}
              draggable={!checked}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              style={{
                borderRadius: 12,
                padding: "9px 14px",
                display: "grid",
                gridTemplateColumns: "18px 34px minmax(0,1fr)",
                alignItems: "center",
                gap: 12,
                border,
                background,
                cursor: checked ? "default" : "grab",
                opacity: isDragging ? 0.88 : 1,
                boxShadow: isDragOver
                  ? "0 8px 20px rgba(139,92,246,0.10)"
                  : "none",
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  color: "#B3B3B3",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                ☰
              </div>

              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#FFFFFF",
                  border: numberBorder,
                  color: numberColor,
                }}
              >
                {index + 1}
              </div>

              <div
                style={{
                  ...RULE_TEXT_STYLE,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#20253A",
                }}
              >
                {item}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid #ECECEC",
          paddingTop: 16,
          marginTop: 18,
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
          {checked
            ? allCorrect
              ? `Correct order • ${score}%`
              : `Review the wrong positions • ${score}%`
            : "Drag to reorder"}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {!checked ? (
            <>
              <button
                type="button"
                onClick={handleTryAgain}
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
                disabled={isSubmitting}
                style={{
                  padding: "10px 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "#3157D6",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? "Checking..." : "Check Order"}
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
    </div>
  )
}
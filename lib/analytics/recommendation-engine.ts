export type RecommendedFocusSession = {
  ruleId: string
  subject: string
  topic: string | null
  subtopic: string | null
  ruleTitle: string
  title: string
  detail: string
  reason: string
  route: string
  reviewTimingLabel: string | null
  reviewTierLabel: string | null
  learningStatusLabel: string | null
  queueSize: number
  priority: number | null
  accuracy: number | null
  attempts: number | null
  failureStreak: number | null
  lastScore: number | null
}

type WeakFocusRuleLike = {
  id?: unknown
  ruleId?: unknown
  subject?: unknown
  topic?: unknown
  subtopic?: unknown
  rule?: unknown
  title?: unknown
  priority?: unknown
  accuracy?: unknown
  attempts?: unknown
  failureStreak?: unknown
  lastScore?: unknown
  reviewTimingLabel?: unknown
  reviewTierLabel?: unknown
  learningStatusLabel?: unknown
  recommendationReason?: unknown
  priorityReason?: unknown
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : null
}

function cleanNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

export function buildRecommendedFocusSession(
  rule: WeakFocusRuleLike | null | undefined,
  queueSize = 0
): RecommendedFocusSession | null {
  if (!rule) return null

  const ruleId = cleanText(rule.ruleId) || cleanText(rule.id)
  const subject = cleanText(rule.subject)
  const ruleTitle = cleanText(rule.rule) || cleanText(rule.title)

  if (!ruleId || !subject || !ruleTitle) {
    return null
  }

  const topic = cleanText(rule.topic)
  const subtopic = cleanText(rule.subtopic)
  const reviewTimingLabel = cleanText(rule.reviewTimingLabel)
  const reviewTierLabel = cleanText(rule.reviewTierLabel)
  const learningStatusLabel = cleanText(rule.learningStatusLabel)
  const reason =
    cleanText(rule.recommendationReason) ||
    cleanText(rule.priorityReason) ||
    `This rule is ranked first in the current weak-focus queue. Current queue size: ${queueSize}.`

  const params = new URLSearchParams()
  params.set("mode", "weak-focus")
  params.set("trainingMode", "weak_focus")
  params.set("subject", subject)
  params.set("ruleId", ruleId)

  return {
    ruleId,
    subject,
    topic,
    subtopic,
    ruleTitle,
    title: `Review ${subject} weak rules`,
    detail: [ruleTitle, reviewTierLabel, learningStatusLabel].filter(Boolean).join(" · "),
    reason,
    route: `/rule-training?${params.toString()}`,
    reviewTimingLabel,
    reviewTierLabel,
    learningStatusLabel,
    queueSize,
    priority: cleanNumber(rule.priority),
    accuracy: cleanNumber(rule.accuracy),
    attempts: cleanNumber(rule.attempts),
    failureStreak: cleanNumber(rule.failureStreak),
    lastScore: cleanNumber(rule.lastScore),
  }
}

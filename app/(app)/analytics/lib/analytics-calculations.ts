import { ALL_BLL_SUBJECTS } from "../constants"
import type {
  AnalyticsAccess,
  BLLSubjectStat,
  ChartPoint,
  RiskBuckets,
  SubjectDiagnostic,
  SubscriptionTier,
  TrendPoint,
} from "../types"

export function safeNumber(value: unknown) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) {
    return 0
  }

  return Math.max(0, Math.round(numberValue))
}

export function buildChartData(trend: TrendPoint[]): ChartPoint[] {
  return trend.map((item) => ({
    date: shortDateLabel(item.date),
    score: safeNumber(item.bll),
  }))
}

export function buildSubjectDiagnostics(
  subjects: BLLSubjectStat[]
): SubjectDiagnostic[] {
  return ALL_BLL_SUBJECTS.map((name) => {
    const subject = subjects.find((item) => item.name === name)

    return {
      name,
      accuracy: safeNumber(subject?.accuracy),
      completed: safeNumber(subject?.completed),
      total: safeNumber(subject?.total),
    }
  })
}

export function buildRiskBuckets(
  subjects: SubjectDiagnostic[]
): RiskBuckets {
  const attempted = subjects.filter((subject) => subject.completed > 0)

  return {
    safe: attempted.filter((subject) => subject.accuracy >= 80),

    maintenance: attempted.filter(
      (subject) =>
        subject.accuracy >= 70 &&
        subject.accuracy < 80
    ),

    high: attempted.filter(
      (subject) =>
        subject.accuracy >= 60 &&
        subject.accuracy < 70
    ),

    critical: attempted.filter(
      (subject) =>
        subject.accuracy > 0 &&
        subject.accuracy < 60
    ),
  }
}

export function buildConsistencyScore(chartData: ChartPoint[]) {
  const activeDays = chartData
    .filter((point) => point.score > 0)
    .slice(-7).length

  return Math.max(
    0,
    Math.min(5, Number(((activeDays / 7) * 5).toFixed(1)))
  )
}

export function buildAnalyticsAccess(params: {
  subscriptionTier: SubscriptionTier
  billingStatus: string
}): AnalyticsAccess {
  const { subscriptionTier, billingStatus } = params

  const hasActivePaidAccess =
    billingStatus === "active" ||
    billingStatus === "trialing"

  const isPremium =
    hasActivePaidAccess &&
    subscriptionTier === "premium"

  const isBLL =
    hasActivePaidAccess &&
    (
      subscriptionTier === "bll-monthly" ||
      subscriptionTier === "premium"
    )

  return {
    hasActivePaidAccess,
    isPremium,
    isBLL,
    canUseBLLAnalytics: isBLL || isPremium,
    canUsePremiumAnalytics: isPremium,
    tierLabel: isPremium
      ? "Premium"
      : isBLL
        ? "Black Letter Law"
        : "Free",
  }
}

export function getScoreMovement(params: {
  chartData: ChartPoint[]
  currentFallback: number
  previousFallback: number
}) {
  const {
    chartData,
    currentFallback,
    previousFallback,
  } = params

  const activeTrend = chartData.filter(
    (item) => item.score > 0
  )

  const currentScore =
    activeTrend.at(-1)?.score ??
    safeNumber(currentFallback)

  const previousScore =
    activeTrend.length > 1
      ? activeTrend.at(-2)?.score ?? currentScore
      : safeNumber(previousFallback)

  return {
    currentScore,
    previousScore,
    delta: currentScore - previousScore,
  }
}

export function shortDateLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function rangeLabel(range: string) {
  if (range === "today") return "Today"
  if (range === "7d") return "Last 7 days"
  if (range === "14d") return "Last 14 days"
  if (range === "30d") return "Last 30 days"
  if (range === "90d") return "Last 3 months"
  if (range === "custom") return "Custom range"

  return "All time"
}

import { prisma } from "@/lib/prisma"
import { getStrengthsWeaknessesAnalyticsSettings } from "@/lib/analytics-settings"
import { calculateMastery, normalizeMode, normalizeTrainingContext } from "@/lib/learning"
import { LEARNING_PROGRESS_SELECT, resolveLearningProgress } from "@/lib/learning/analytics"
import type {
  ProgressHistoryAnalyticsData,
  ProgressHistoryEvent,
  ProgressHistoryPoint,
  ProgressMilestone,
  ReadinessTrendPoint,
  SubjectProgressHistory,
} from "@/app/(app)/analytics/types"

type DateWindow = {
  key: string
  label: string
  startDate: Date
  endDate: Date
}

type RuleAttemptRow = {
  id: string
  rule_id: string
  score: number
  created_at: Date | null
  training_mode: string | null
  training_context: string | null
  recall_seconds: number | null
  revealed_answer: boolean
  self_reported: boolean
}

type RuleMeta = {
  id: string
  title: string
  subjectId: string | null
  subjectName: string
}

type PeriodBucket = {
  key: string
  label: string
  shortLabel: string
  start: Date
  end: Date
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: number[]) {
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length)
}


function calculateAttemptReadiness(attempts: RuleAttemptRow[]) {
  if (attempts.length === 0) return null

  const byRule = new Map<string, RuleAttemptRow[]>()
  for (const attempt of attempts) {
    const rows = byRule.get(attempt.rule_id) ?? []
    rows.push(attempt)
    byRule.set(attempt.rule_id, rows)
  }

  const calculationTime = attempts
    .map((attempt) => attempt.created_at?.getTime() ?? 0)
    .reduce((latest, value) => Math.max(latest, value), 0)
  const now = calculationTime > 0 ? new Date(calculationTime) : new Date()

  const masteryScores = Array.from(byRule.values()).map((rows) =>
    calculateMastery(
      rows.map((attempt) => ({
        score: attempt.score,
        mode: normalizeMode(attempt.training_mode),
        trainingContext: normalizeTrainingContext(attempt.training_context),
        recallSeconds: attempt.recall_seconds,
        createdAt: attempt.created_at,
        revealedAnswer: attempt.revealed_answer,
        selfReported: attempt.self_reported,
      })),
      now
    ).mastery
  )

  return average(masteryScores)
}

function startOfLocalDay(date: Date, timezoneOffset: number) {
  const shifted = new Date(date.getTime() - timezoneOffset * 60_000)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() + timezoneOffset * 60_000)
}

function endOfLocalDay(date: Date, timezoneOffset: number) {
  const start = startOfLocalDay(date, timezoneOffset)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1)
  return end
}

function parseLocalDate(
  value: string,
  timezoneOffset: number,
  useEndOfDay: boolean
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const timestamp =
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      useEndOfDay ? 23 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 999 : 0
    ) +
    timezoneOffset * 60_000

  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getDateWindow(params: {
  range: string
  start: string | null
  end: string | null
  timezoneOffset: number
}): DateWindow {
  const { range, start, end, timezoneOffset } = params
  const now = new Date()

  if (range === "custom" && start && end) {
    const startDate = parseLocalDate(start, timezoneOffset, false)
    const endDate = parseLocalDate(end, timezoneOffset, true)

    if (startDate && endDate && startDate <= endDate) {
      return {
        key: "custom",
        label: `${start} to ${end}`,
        startDate,
        endDate,
      }
    }
  }

  const dayCount =
    range === "today"
      ? 1
      : range === "7d"
        ? 7
        : range === "14d"
          ? 14
          : range === "90d"
            ? 90
            : 30

  const startCursor = new Date(now)
  startCursor.setUTCDate(startCursor.getUTCDate() - (dayCount - 1))

  return {
    key: range,
    label:
      range === "today"
        ? "Today"
        : range === "7d"
          ? "Last 7 days"
          : range === "14d"
            ? "Last 14 days"
            : range === "90d"
              ? "Last 90 days"
              : "Last 30 days",
    startDate: startOfLocalDay(startCursor, timezoneOffset),
    endDate: endOfLocalDay(now, timezoneOffset),
  }
}

function buildFourPeriods(startDate: Date, endDate: Date): PeriodBucket[] {
  const totalMs = Math.max(1, endDate.getTime() - startDate.getTime() + 1)
  const periodMs = Math.ceil(totalMs / 4)

  return Array.from({ length: 4 }, (_, index) => {
    const start = new Date(startDate.getTime() + periodMs * index)
    const calculatedEnd = new Date(
      Math.min(endDate.getTime(), start.getTime() + periodMs - 1)
    )

    return {
      key: `period-${index + 1}`,
      label: `${formatShortDate(start)}–${formatShortDate(calculatedEnd)}`,
      shortLabel:
        index === 3
          ? "Current"
          : index === 2
            ? "Previous"
            : `${4 - index} periods ago`,
      start,
      end: calculatedEnd,
    }
  })
}

function inWindow(date: Date | null, start: Date, end: Date) {
  return Boolean(date && date >= start && date <= end)
}

function buildPeriodPoints(
  attempts: RuleAttemptRow[],
  periods: PeriodBucket[]
): ProgressHistoryPoint[] {
  return periods.map((period) => {
    const periodAttempts = attempts.filter((attempt) =>
      inWindow(attempt.created_at, period.start, period.end)
    )

    return {
      key: period.key,
      label: period.label,
      shortLabel: period.shortLabel,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      score: calculateAttemptReadiness(periodAttempts),
      attempts: periodAttempts.length,
    }
  })
}

function firstCompletionDate(
  attempts: RuleAttemptRow[],
  requiredDistinctRules: number
) {
  if (requiredDistinctRules <= 0) return null

  const seen = new Set<string>()

  for (const attempt of attempts) {
    seen.add(attempt.rule_id)
    if (seen.size >= requiredDistinctRules && attempt.created_at) {
      return attempt.created_at
    }
  }

  return null
}

function firstReadinessDate(attempts: RuleAttemptRow[], threshold: number) {
  const byRule = new Map<string, RuleAttemptRow[]>()
  const masteryByRule = new Map<string, number>()

  for (const attempt of attempts) {
    const rows = byRule.get(attempt.rule_id) ?? []
    rows.push(attempt)
    byRule.set(attempt.rule_id, rows)

    const mastery = calculateMastery(
      rows.map((row) => ({
        score: row.score,
        mode: normalizeMode(row.training_mode),
        trainingContext: normalizeTrainingContext(row.training_context),
        recallSeconds: row.recall_seconds,
        createdAt: row.created_at,
        revealedAnswer: row.revealed_answer,
        selfReported: row.self_reported,
      })),
      attempt.created_at ?? new Date()
    ).mastery
    masteryByRule.set(attempt.rule_id, mastery)

    const readiness = average(Array.from(masteryByRule.values()))
    if (readiness !== null && readiness >= threshold && attempt.created_at) {
      return attempt.created_at
    }
  }

  return null
}

function buildMilestones(params: {
  allAttempts: RuleAttemptRow[]
  totalAvailableRules: number
  masteredRules: Array<{ updatedAt: Date; ruleId: string }>
  currentReadiness: number | null
}): ProgressMilestone[] {
  const {
    allAttempts,
    totalAvailableRules,
    masteredRules,
    currentReadiness,
  } = params

  const attemptedRuleCount = new Set(
    allAttempts.map((attempt) => attempt.rule_id)
  ).size

  const completionPercentage =
    totalAvailableRules > 0
      ? (attemptedRuleCount / totalAvailableRules) * 100
      : 0

  const threshold25 = Math.max(1, Math.ceil(totalAvailableRules * 0.25))
  const threshold50 = Math.max(1, Math.ceil(totalAvailableRules * 0.5))
  const threshold75 = Math.max(1, Math.ceil(totalAvailableRules * 0.75))

  const date25 = firstCompletionDate(allAttempts, threshold25)
  const date50 = firstCompletionDate(allAttempts, threshold50)
  const date75 = firstCompletionDate(allAttempts, threshold75)
  const readiness60 = firstReadinessDate(allAttempts, 60)

  const mastered100Date =
    masteredRules.length >= 100
      ? masteredRules
          .slice()
          .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[99]
          ?.updatedAt ?? null
      : null

  const milestones: ProgressMilestone[] = [
    {
      key: "rules-25",
      status: date25 ? "completed" : "locked",
      label: "Completed 25% of available BLL rules",
      detail: date25
        ? "You built meaningful coverage across the rule library."
        : `${attemptedRuleCount} of ${threshold25} distinct rules attempted.`,
      date: date25 ? date25.toISOString() : null,
    },
    {
      key: "mastered-100",
      status: mastered100Date ? "completed" : "locked",
      label: "Mastered first 100 rules",
      detail: mastered100Date
        ? "One hundred rules met the configured mastery standard."
        : `${masteredRules.length} of 100 rules currently meet the mastery standard.`,
      date: mastered100Date ? mastered100Date.toISOString() : null,
    },
    {
      key: "readiness-60",
      status: readiness60 ? "completed" : "locked",
      label: "Reached 60% recorded readiness",
      detail: readiness60
        ? "Your cumulative recorded rule score reached 60%."
        : `Current recorded readiness is ${currentReadiness ?? 0}%.`,
      date: readiness60 ? readiness60.toISOString() : null,
    },
    {
      key: "rules-50",
      status: date50 ? "completed" : "locked",
      label: "Completed 50% of available BLL rules",
      detail: date50
        ? "You reached halfway coverage of the active rule library."
        : `${attemptedRuleCount} of ${threshold50} distinct rules attempted.`,
      date: date50 ? date50.toISOString() : null,
    },
  ]

  const nextGoal =
    completionPercentage < 25
      ? {
          label: "Next goal: Complete 25% of available BLL rules",
          detail: `${attemptedRuleCount} of ${threshold25} distinct rules attempted.`,
        }
      : completionPercentage < 50
        ? {
            label: "Next goal: Complete 50% of available BLL rules",
            detail: `${attemptedRuleCount} of ${threshold50} distinct rules attempted.`,
          }
        : completionPercentage < 75
          ? {
              label: "Next goal: Complete 75% of available BLL rules",
              detail: `${attemptedRuleCount} of ${threshold75} distinct rules attempted.`,
            }
          : currentReadiness !== null && currentReadiness < 75
            ? {
                label: "Next goal: Reach 75% recorded readiness",
                detail: `Current recorded readiness is ${currentReadiness}%.`,
              }
            : {
                label: "Next goal: Maintain confirmed mastery",
                detail: "Continue scoring new attempts to keep mastery current.",
              }

  milestones.push({
    key: "next-goal",
    status: "in_progress",
    label: nextGoal.label,
    detail: nextGoal.detail,
    date: null,
  })

  return milestones
}

function buildSubjectProgress(params: {
  selectedAttempts: RuleAttemptRow[]
  periods: PeriodBucket[]
  ruleMap: Map<string, RuleMeta>
}): SubjectProgressHistory[] {
  const { selectedAttempts, periods, ruleMap } = params
  const subjectMap = new Map<
    string,
    { subjectId: string | null; subjectName: string; attempts: RuleAttemptRow[] }
  >()

  for (const attempt of selectedAttempts) {
    const rule = ruleMap.get(attempt.rule_id)
    const subjectName = rule?.subjectName || "Unassigned subject"
    const subjectId = rule?.subjectId ?? null
    const key = subjectId || subjectName
    const current = subjectMap.get(key) ?? {
      subjectId,
      subjectName,
      attempts: [],
    }

    current.attempts.push(attempt)
    subjectMap.set(key, current)
  }

  return Array.from(subjectMap.values())
    .map((subject) => {
      const periodData = periods.map((period) => {
        const attempts = subject.attempts.filter((attempt) =>
          inWindow(attempt.created_at, period.start, period.end)
        )

        return {
          key: period.key,
          label: period.label,
          score: calculateAttemptReadiness(attempts),
          attempts: attempts.length,
        }
      })

      const scoredPeriods = periodData.filter(
        (period) => period.score !== null
      )
      const first = scoredPeriods[0]?.score ?? null
      const last = scoredPeriods[scoredPeriods.length - 1]?.score ?? null

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        periods: periodData,
        change:
          first !== null && last !== null && scoredPeriods.length >= 2
            ? last - first
            : null,
      }
    })
    .sort((a, b) => {
      const aAttempts = a.periods.reduce((sum, period) => sum + period.attempts, 0)
      const bAttempts = b.periods.reduce((sum, period) => sum + period.attempts, 0)
      return bAttempts - aAttempts || a.subjectName.localeCompare(b.subjectName)
    })
}

function buildRollingTrend(
  attempts: RuleAttemptRow[],
  days: number | "all",
  timezoneOffset: number
): ReadinessTrendPoint[] {
  const datedAttempts = attempts
    .filter((attempt): attempt is RuleAttemptRow & { created_at: Date } =>
      Boolean(attempt.created_at)
    )
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())

  if (datedAttempts.length === 0) return []

  const end = endOfLocalDay(new Date(), timezoneOffset)
  const start =
    days === "all"
      ? startOfLocalDay(datedAttempts[0].created_at, timezoneOffset)
      : startOfLocalDay(
          new Date(end.getTime() - (days - 1) * 86_400_000),
          timezoneOffset
        )

  const filtered = datedAttempts.filter((attempt) =>
    inWindow(attempt.created_at, start, end)
  )

  if (filtered.length === 0) return []

  const activeDays = Array.from(
    new Set(
      filtered.map((attempt) =>
        formatDateKey(
          new Date(attempt.created_at.getTime() - timezoneOffset * 60_000)
        )
      )
    )
  ).sort()

  return activeDays.map((dayKey) => {
    const dayEnd = parseLocalDate(dayKey, timezoneOffset, true) ?? end
    const rollingStart = new Date(dayEnd.getTime() - 7 * 86_400_000 + 1)
    const rollingRows = filtered.filter(
      (attempt) =>
        attempt.created_at >= rollingStart && attempt.created_at <= dayEnd
    )

    return {
      date: dayEnd.toISOString(),
      label: formatShortDate(dayEnd),
      score: calculateAttemptReadiness(rollingRows) ?? 0,
      attempts: rollingRows.length,
    }
  })
}

function buildRecentHistory(params: {
  selectedAttempts: RuleAttemptRow[]
  ruleMap: Map<string, RuleMeta>
  studySessions: Array<{
    id: string
    mode: string
    endedAt: Date | null
    durationSeconds: number | null
    ruleAttempts: number
    flashcards: number
    correctAnswers: number
  }>
  flashcardSessions: Array<{
    id: string
    mode: string
    completed_at: Date | null
    card_count: number
  }>
}): ProgressHistoryEvent[] {
  const { selectedAttempts, ruleMap, studySessions, flashcardSessions } = params
  const priorByRule = new Map<string, RuleAttemptRow>()
  const attemptEvents: ProgressHistoryEvent[] = []

  for (const attempt of selectedAttempts) {
    if (!attempt.created_at) continue
    const rule = ruleMap.get(attempt.rule_id)
    const previous = priorByRule.get(attempt.rule_id)
    const improved = Boolean(previous && attempt.score > previous.score)

    attemptEvents.push({
      id: `attempt-${attempt.id}`,
      type: improved ? "rule_improved" : "rule_completed",
      title: improved ? "Rule accuracy improved" : "Rule training completed",
      detail: improved
        ? `${rule?.title ?? "Rule"} improved from ${previous?.score ?? 0}% to ${attempt.score}%.`
        : `${rule?.title ?? "Rule"} completed at ${attempt.score}% in ${attempt.training_mode ?? "rule training"} mode.`,
      timestamp: attempt.created_at.toISOString(),
      subjectName: rule?.subjectName ?? null,
      ruleId: attempt.rule_id,
      score: attempt.score,
      previousScore: previous?.score ?? null,
    })

    priorByRule.set(attempt.rule_id, attempt)
  }

  const sessionEvents: ProgressHistoryEvent[] = studySessions
    .filter((session) => session.endedAt)
    .map((session) => ({
      id: `study-${session.id}`,
      type: "study_session" as const,
      title: "Study session completed",
      detail: `${session.mode} session completed${session.ruleAttempts > 0 ? ` with ${session.ruleAttempts} rule attempts` : ""}${session.durationSeconds ? ` in ${Math.max(1, Math.round(session.durationSeconds / 60))} minutes` : ""}.`,
      timestamp: session.endedAt!.toISOString(),
      subjectName: null,
      ruleId: null,
      score: null,
      previousScore: null,
    }))

  const flashcardEvents: ProgressHistoryEvent[] = flashcardSessions
    .filter((session) => session.completed_at)
    .map((session) => ({
      id: `flashcards-${session.id}`,
      type: "flashcards" as const,
      title: "Flashcards reviewed",
      detail: `${session.card_count} flashcards completed in ${session.mode} mode.`,
      timestamp: session.completed_at!.toISOString(),
      subjectName: null,
      ruleId: null,
      score: null,
      previousScore: null,
    }))

  return [...attemptEvents, ...sessionEvents, ...flashcardEvents]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 100)
}

function calculateActiveDayStreak(
  attempts: RuleAttemptRow[],
  timezoneOffset: number
) {
  const days = Array.from(
    new Set(
      attempts
        .filter((attempt) => attempt.created_at)
        .map((attempt) =>
          formatDateKey(
            new Date(
              attempt.created_at!.getTime() - timezoneOffset * 60_000
            )
          )
        )
    )
  ).sort().reverse()

  if (days.length === 0) return 0

  let streak = 1
  let cursor = new Date(`${days[0]}T00:00:00.000Z`)

  for (let index = 1; index < days.length; index += 1) {
    const expected = new Date(cursor)
    expected.setUTCDate(expected.getUTCDate() - 1)

    if (days[index] !== formatDateKey(expected)) break
    streak += 1
    cursor = expected
  }

  return streak
}

export async function buildProgressHistoryAnalytics(params: {
  userId: string
  range: string
  start: string | null
  end: string | null
  timezoneOffset: number
}): Promise<ProgressHistoryAnalyticsData> {
  const { userId, range, start, end, timezoneOffset } = params
  const selectedWindow = getDateWindow({
    range,
    start,
    end,
    timezoneOffset,
  })

  const selectedDuration =
    selectedWindow.endDate.getTime() - selectedWindow.startDate.getTime() + 1
  const previousStart = new Date(selectedWindow.startDate.getTime() - selectedDuration)
  const previousEnd = new Date(selectedWindow.startDate.getTime() - 1)

  const [
    allAttempts,
    progressRows,
    analyticsSubjects,
    studySessions,
    flashcardSessions,
    settings,
  ] = await Promise.all([
    prisma.user_rule_attempts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        rule_id: true,
        score: true,
        created_at: true,
        training_mode: true,
        training_context: true,
        recall_seconds: true,
        revealed_answer: true,
        self_reported: true,
      },
    }),
    prisma.user_rule_progress.findMany({
      where: { user_id: userId },
      select: {
        rule_id: true,
        updated_at: true,
        ...LEARNING_PROGRESS_SELECT,
      },
    }),
    prisma.subjects.findMany({
      where: { show_in_analytics: true },
      select: { id: true },
    }),
    prisma.studySession.findMany({
      where: {
        userId,
        endedAt: {
          gte: selectedWindow.startDate,
          lte: selectedWindow.endDate,
        },
      },
      orderBy: { endedAt: "desc" },
      take: 30,
      select: {
        id: true,
        mode: true,
        endedAt: true,
        durationSeconds: true,
        ruleAttempts: true,
        flashcards: true,
        correctAnswers: true,
      },
    }),
    prisma.flashcard_sessions.findMany({
      where: {
        user_id: userId,
        completed_at: {
          gte: selectedWindow.startDate,
          lte: selectedWindow.endDate,
        },
      },
      orderBy: { completed_at: "desc" },
      take: 30,
      select: {
        id: true,
        mode: true,
        completed_at: true,
        card_count: true,
      },
    }),
    getStrengthsWeaknessesAnalyticsSettings(),
  ])

  const ruleIds = Array.from(new Set(allAttempts.map((attempt) => attempt.rule_id)))
  const rules = ruleIds.length
    ? await prisma.rules.findMany({
        where: { id: { in: ruleIds } },
        select: {
          id: true,
          title: true,
          subject_id: true,
          subjects: {
            select: {
              name: true,
            },
          },
        },
      })
    : []

  const analyticsSubjectIds = analyticsSubjects.map((subject) => subject.id)
  const totalAvailableRules = analyticsSubjectIds.length
    ? await prisma.rules.count({
        where: {
          is_active: true,
          subject_id: { in: analyticsSubjectIds },
        },
      })
    : 0

  const ruleMap = new Map<string, RuleMeta>(
    rules.map((rule) => [
      rule.id,
      {
        id: rule.id,
        title: rule.title,
        subjectId: rule.subject_id,
        subjectName: rule.subjects?.name ?? "Unassigned subject",
      },
    ])
  )

  const selectedAttempts = allAttempts.filter((attempt) =>
    inWindow(attempt.created_at, selectedWindow.startDate, selectedWindow.endDate)
  )
  const previousAttempts = allAttempts.filter((attempt) =>
    inWindow(attempt.created_at, previousStart, previousEnd)
  )

  const currentReadiness = calculateAttemptReadiness(selectedAttempts)
  const previousReadiness = calculateAttemptReadiness(previousAttempts)
  const periodChange =
    currentReadiness !== null && previousReadiness !== null
      ? currentReadiness - previousReadiness
      : null

  const periods = buildFourPeriods(
    selectedWindow.startDate,
    selectedWindow.endDate
  )
  const overallProgress = buildPeriodPoints(selectedAttempts, periods)
  const subjectProgress = buildSubjectProgress({
    selectedAttempts,
    periods,
    ruleMap,
  })

  const masteredRules = progressRows
    .filter((row) => {
      const learning = resolveLearningProgress(row)
      return learning.isMastered || (
        !learning.usesLearningEngine &&
        learning.attempts >= settings.confirmedRuleAttempts &&
        learning.mastery >= settings.correctScoreThreshold
      )
    })
    .map((row) => ({
      ruleId: row.rule_id,
      updatedAt: row.updated_at,
    }))

  const attemptedRules = new Set(allAttempts.map((attempt) => attempt.rule_id)).size
  const completionPercentage =
    totalAvailableRules > 0
      ? round(clamp((attemptedRules / totalAvailableRules) * 100, 0, 100), 1)
      : null
  const activeDayStreak = calculateActiveDayStreak(allAttempts, timezoneOffset)

  const readinessTrend = {
    "7d": buildRollingTrend(allAttempts, 7, timezoneOffset),
    "14d": buildRollingTrend(allAttempts, 14, timezoneOffset),
    "30d": buildRollingTrend(allAttempts, 30, timezoneOffset),
    all: buildRollingTrend(allAttempts, "all", timezoneOffset),
  }

  const recentHistory = buildRecentHistory({
    selectedAttempts,
    ruleMap,
    studySessions,
    flashcardSessions,
  })

  const weeklyScores = overallProgress
    .map((point) => point.score)
    .filter((score): score is number => score !== null)
  const weeklyChanges = weeklyScores.slice(1).map(
    (score, index) => score - weeklyScores[index]
  )
  const averageWeeklyChange = average(weeklyChanges)
  const strongestImprovingSubject = subjectProgress
    .filter((subject) => subject.change !== null)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0]

  const status =
    currentReadiness === null
      ? "insufficient"
      : periodChange === null || Math.abs(periodChange) < 1
        ? "stable"
        : periodChange > 0
          ? "improving"
          : "declining"

  const lowestSubject = subjectProgress
    .map((subject) => ({
      ...subject,
      latestScore:
        subject.periods
          .slice()
          .reverse()
          .find((period) => period.score !== null)?.score ?? null,
    }))
    .filter(
      (subject): subject is typeof subject & { latestScore: number } =>
        subject.latestScore !== null
    )
    .sort((a, b) => a.latestScore - b.latestScore)[0]

  const recommendedAction =
    status === "improving"
      ? lowestSubject
        ? `Keep your current study rhythm and reinforce ${lowestSubject.subjectName}, your lowest current subject at ${lowestSubject.latestScore}%.`
        : "Keep your current study rhythm and add another scored session to confirm the improvement."
      : status === "declining"
        ? lowestSubject
          ? `Start with ${lowestSubject.subjectName} and complete a focused scored recall session before broad review.`
          : "Review the lowest-scoring rules and complete a focused scored recall session."
        : status === "stable"
          ? activeDayStreak > 0
            ? `Maintain the ${activeDayStreak}-day active streak and add a scored session in the weakest subject.`
            : "Complete another scored session to create a clearer direction of change."
          : "Complete scored rule attempts before a personalized action can be calculated."

  const evidence = [
    currentReadiness === null
      ? null
      : `Current recorded readiness: ${currentReadiness}%.`,
    periodChange === null
      ? null
      : `Change versus the preceding period: ${periodChange > 0 ? "+" : ""}${periodChange} points.`,
    strongestImprovingSubject?.subjectName
      ? `Strongest measured subject improvement: ${strongestImprovingSubject.subjectName}.`
      : null,
    `${selectedAttempts.length} scored attempt${selectedAttempts.length === 1 ? "" : "s"} in ${selectedWindow.label.toLowerCase()}.`,
  ].filter((item): item is string => Boolean(item))

  const improvement = {
    status,
    title:
      status === "improving"
        ? "Your recorded performance is improving."
        : status === "declining"
          ? "Your recent performance needs focused review."
          : status === "stable"
            ? "Your recorded performance is stable."
            : "More scored activity is needed.",
    message:
      status === "improving"
        ? strongestImprovingSubject?.subjectName
          ? `${strongestImprovingSubject.subjectName} produced the strongest measured improvement in the selected period.`
          : "Your current recorded score is higher than the preceding comparison period."
        : status === "declining"
          ? lowestSubject
            ? `${lowestSubject.subjectName} is currently the lowest measured subject at ${lowestSubject.latestScore}%.`
            : "The current recorded score is below the preceding comparison period."
          : status === "stable"
            ? "The measured change is smaller than one percentage point, so the direction is currently stable."
            : "There are not enough scored attempts to calculate a reliable direction yet.",
    periodChange,
    averageWeeklyChange,
    activeDayStreak,
    strongestImprovingSubject:
      strongestImprovingSubject?.subjectName ?? null,
    recommendedAction,
    evidence,
  } satisfies ProgressHistoryAnalyticsData["improvement"]

  return {
    range: {
      key: selectedWindow.key,
      label: selectedWindow.label,
      start: selectedWindow.startDate.toISOString(),
      end: selectedWindow.endDate.toISOString(),
    },
    summary: {
      currentReadiness,
      previousReadiness,
      change: periodChange,
      totalScoredAttempts: selectedAttempts.length,
      attemptedRules,
      totalAvailableRules,
      completionPercentage,
      masteredRules: masteredRules.length,
      activeDayStreak,
    },
    overallProgress,
    milestones: buildMilestones({
      allAttempts,
      totalAvailableRules,
      masteredRules,
      currentReadiness,
    }),
    subjectProgress,
    readinessTrend,
    recentHistory,
    improvement,
  }
}

export function buildProgressCsv(data: ProgressHistoryAnalyticsData) {
  const rows: string[][] = [
    ["Lexora Progress History"],
    ["Range", data.range.label],
    ["Current readiness", data.summary.currentReadiness?.toString() ?? "Unavailable"],
    ["Previous readiness", data.summary.previousReadiness?.toString() ?? "Unavailable"],
    ["Change", data.summary.change?.toString() ?? "Unavailable"],
    ["Scored attempts", String(data.summary.totalScoredAttempts)],
    ["Distinct rules attempted", String(data.summary.attemptedRules)],
    ["Available rules", String(data.summary.totalAvailableRules)],
    ["Completion percentage", data.summary.completionPercentage?.toString() ?? "Unavailable"],
    ["Mastered rules", String(data.summary.masteredRules)],
    [],
    ["Subject", ...data.overallProgress.map((period) => period.label), "Change"],
  ]

  for (const subject of data.subjectProgress) {
    rows.push([
      subject.subjectName,
      ...subject.periods.map((period) => period.score?.toString() ?? ""),
      subject.change?.toString() ?? "",
    ])
  }

  rows.push([], ["Recent history"])
  rows.push(["Timestamp", "Type", "Title", "Detail"])
  for (const event of data.recentHistory) {
    rows.push([event.timestamp, event.type, event.title, event.detail])
  }

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n")
}

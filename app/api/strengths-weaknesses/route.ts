import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { getStrengthsWeaknessesAnalyticsSettings } from "@/lib/analytics-settings"
import { LEARNING_PROGRESS_SELECT, resolveLearningProgress } from "@/lib/learning/analytics"


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function percentage(part: number, total: number, digits = 0) {
  if (total <= 0) return null
  return round(clamp((part / total) * 100, 0, 100), digits)
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

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const timestamp =
    Date.UTC(
      year,
      month - 1,
      day,
      useEndOfDay ? 23 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 59 : 0,
      useEndOfDay ? 999 : 0
    ) +
    timezoneOffset * 60_000

  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getDateWindow(params: {
  range: string
  start: string | null
  end: string | null
  timezoneOffset: number
}) {
  const { range, start, end, timezoneOffset } = params
  const now = new Date()

  if (range === "custom" && start && end) {
    const startDate = parseLocalDate(start, timezoneOffset, false)
    const endDate = parseLocalDate(end, timezoneOffset, true)

    if (startDate && endDate && startDate <= endDate) {
      return { startDate, endDate, label: `${start} to ${end}` }
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
    startDate: startOfLocalDay(startCursor, timezoneOffset),
    endDate: endOfLocalDay(now, timezoneOffset),
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
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
}

function getPriority(
  accuracy: number,
  thresholds: {
    critical: number
    high: number
  }
) {
  if (accuracy < thresholds.critical) return "critical" as const
  if (accuracy < thresholds.high) return "high" as const
  return "moderate" as const
}

function buildRecommendation(params: {
  accuracy: number
  latestScore: number
  accuracyChange: number | null
  trend: "new" | "improving" | "declining" | "stable"
  needsPractice: boolean
  missedBuzzwords: Array<{ text: string; count: number }>
  correctScoreThreshold: number
}) {
  const {
    accuracy,
    latestScore,
    accuracyChange,
    trend,
    needsPractice,
    missedBuzzwords,
    correctScoreThreshold,
  } = params
  const repeated = missedBuzzwords
    .filter((item) => item.count >= 2)
    .slice(0, 3)

  if (trend === "improving" && latestScore >= correctScoreThreshold) {
    const changeText =
      accuracyChange === null
        ? ""
        : ` by ${Math.abs(accuracyChange)} percentage ${
            Math.abs(accuracyChange) === 1 ? "point" : "points"
          }`

    return `Improving${changeText}. Complete one more scored recall session to confirm the gain.`
  }

  if (repeated.length > 0) {
    return `Review the repeatedly missed elements: ${repeated
      .map((item) => item.text)
      .join(", ")}.`
  }

  if (accuracy < 40) {
    return "Rebuild the rule from its elements, then complete a scored active-recall session."
  }

  if (accuracy < 50) {
    return "Review the rule and its exceptions, then complete a targeted scored recall session."
  }

  if (needsPractice) {
    return "Complete another focused weak-area session and compare the new scored result."
  }

  return "Reinforce this rule with another scored recall session."
}


function formatSignedChange(value: number | null) {
  if (value === null) return "no prior baseline"
  if (value > 0) return `+${value} percentage points`
  if (value < 0) return `${value} percentage points`
  return "0 percentage points"
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "30d"
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    const rawTimezoneOffset = Number(
      searchParams.get("timezoneOffset") ?? 0
    )

    const timezoneOffset = clamp(
      Number.isFinite(rawTimezoneOffset) ? rawTimezoneOffset : 0,
      -840,
      840
    )

    const { startDate, endDate, label } = getDateWindow({
      range,
      start,
      end,
      timezoneOffset,
    })

    const analyticsSettings =
      await getStrengthsWeaknessesAnalyticsSettings()

    const {
      correctScoreThreshold,
      confirmedSubjectAttempts,
      confirmedRuleAttempts,
      strongSubjectThreshold,
      weakSubjectThreshold,
      weakRuleThreshold,
      criticalPriorityThreshold,
      highPriorityThreshold,
    } = analyticsSettings

    const attempts = await prisma.user_rule_attempts.findMany({
      where: {
        user_id: user.id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        rule_id: true,
        score: true,
        missed_buzzwords: true,
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    })

    const ruleIds = Array.from(
      new Set(attempts.map((attempt) => attempt.rule_id))
    )

    const [rules, customRules, progressRows] = await Promise.all([
      prisma.rules.findMany({
        where: {
          id: { in: ruleIds },
          is_active: true,
        },
        select: {
          id: true,
          title: true,
          subject_id: true,
          subjects: {
            select: {
              name: true,
              show_in_analytics: true,
            },
          },
          topics: {
            select: { name: true },
          },
          subtopics: {
            select: { name: true },
          },
        },
      }),
      prisma.user_rules.findMany({
        where: {
          id: { in: ruleIds },
          user_id: user.id,
        },
        select: {
          id: true,
          title: true,
          subject_id: true,
          topics: {
            select: {
              name: true,
              subjects: {
                select: { name: true },
              },
            },
          },
          subtopics: {
            select: { name: true },
          },
        },
      }),
      prisma.user_rule_progress.findMany({
        where: {
          user_id: user.id,
          rule_id: { in: ruleIds },
        },
        select: {
          rule_id: true,
          last_reviewed: true,
          ...LEARNING_PROGRESS_SELECT,
        },
      }),
    ])

    type RuleMeta = {
      id: string
      title: string
      subjectId: string | null
      subjectName: string
      topicName: string
      subtopicName: string
      showInAnalytics: boolean
    }

    const ruleMeta = new Map<string, RuleMeta>()

    for (const rule of rules) {
      ruleMeta.set(rule.id, {
        id: rule.id,
        title: rule.title,
        subjectId: rule.subject_id ?? null,
        subjectName: rule.subjects?.name || "Unknown subject",
        topicName: rule.topics?.name || "",
        subtopicName: rule.subtopics?.name || "",
        showInAnalytics: rule.subjects?.show_in_analytics !== false,
      })
    }

    for (const rule of customRules) {
      if (ruleMeta.has(rule.id)) continue

      ruleMeta.set(rule.id, {
        id: rule.id,
        title: rule.title,
        subjectId: rule.subject_id ?? null,
        subjectName:
          rule.topics?.subjects?.name || "Custom rule",
        topicName: rule.topics?.name || "",
        subtopicName: rule.subtopics?.name || "",
        showInAnalytics: true,
      })
    }

    const progressMap = new Map<
      string,
      {
        isWeak: boolean
        mastery: number
        confidence: number
        status: string
        usesLearningEngine: boolean
      }
    >()

    for (const row of progressRows) {
      const learning = resolveLearningProgress(row)
      progressMap.set(row.rule_id, {
        isWeak: learning.isWeak,
        mastery: learning.mastery,
        confidence: learning.confidence,
        status: learning.status,
        usesLearningEngine: learning.usesLearningEngine,
      })
    }

    type RuleAggregate = {
      ruleId: string
      title: string
      subjectId: string | null
      subjectName: string
      topicName: string
      subtopicName: string
      attempts: number
      correct: number
      incorrect: number
      scoreTotal: number
      scores: number[]
      missedBuzzwords: Map<string, number>
      needsPractice: boolean
      mastery: number
      masteryConfidence: number
      learningStatus: string
      usesLearningEngine: boolean
      lastAttemptAt: Date | null
    }

    const ruleAggregates = new Map<string, RuleAggregate>()

    for (const attempt of attempts) {
      const meta = ruleMeta.get(attempt.rule_id)
      if (!meta || !meta.showInAnalytics) continue

      const progress = progressMap.get(attempt.rule_id)
      const existing = ruleAggregates.get(attempt.rule_id) ?? {
        ruleId: attempt.rule_id,
        title: meta.title,
        subjectId: meta.subjectId,
        subjectName: meta.subjectName,
        topicName: meta.topicName,
        subtopicName: meta.subtopicName,
        attempts: 0,
        correct: 0,
        incorrect: 0,
        scoreTotal: 0,
        scores: [],
        missedBuzzwords: new Map<string, number>(),
        needsPractice: Boolean(progress?.isWeak),
        mastery: Number(progress?.mastery ?? 0),
        masteryConfidence: Number(progress?.confidence ?? 0),
        learningStatus: progress?.status ?? "UNTRAINED",
        usesLearningEngine: Boolean(progress?.usesLearningEngine),
        lastAttemptAt: null,
      }

      const score = clamp(Number(attempt.score ?? 0), 0, 100)
      const isCorrect = score >= correctScoreThreshold

      existing.attempts += 1
      existing.scoreTotal += score
      existing.scores.push(score)

      if (isCorrect) existing.correct += 1
      else existing.incorrect += 1

      for (const buzzword of toStringArray(attempt.missed_buzzwords)) {
        existing.missedBuzzwords.set(
          buzzword,
          (existing.missedBuzzwords.get(buzzword) ?? 0) + 1
        )
      }

      if (
        attempt.created_at &&
        (!existing.lastAttemptAt ||
          attempt.created_at > existing.lastAttemptAt)
      ) {
        existing.lastAttemptAt = attempt.created_at
      }

      ruleAggregates.set(attempt.rule_id, existing)
    }

    type SubjectAggregate = {
      subjectId: string | null
      subjectName: string
      attempts: number
      correct: number
      scoreTotal: number
      ruleIds: Set<string>
    }

    const subjectAggregates = new Map<string, SubjectAggregate>()

    for (const rule of ruleAggregates.values()) {
      const key = rule.subjectId || rule.subjectName
      const existing = subjectAggregates.get(key) ?? {
        subjectId: rule.subjectId,
        subjectName: rule.subjectName,
        attempts: 0,
        correct: 0,
        scoreTotal: 0,
        ruleIds: new Set<string>(),
      }

      existing.attempts += rule.attempts
      existing.correct += rule.correct
      existing.scoreTotal += rule.scoreTotal
      existing.ruleIds.add(rule.ruleId)
      subjectAggregates.set(key, existing)
    }

    const classifiedSubjects = Array.from(subjectAggregates.values())
      .filter((subject) => subject.attempts > 0)
      .map((subject) => ({
        subjectId: subject.subjectId,
        name: subject.subjectName,
        attempts: subject.attempts,
        correctAttempts: subject.correct,
        accuracy: round(subject.scoreTotal / subject.attempts, 0),
        attemptedRules: subject.ruleIds.size,
        confidence:
          subject.attempts >= confirmedSubjectAttempts
            ? ("confirmed" as const)
            : ("early" as const),
      }))

    const strengths = classifiedSubjects
      .filter(
        (subject) => subject.accuracy >= strongSubjectThreshold
      )
      .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)

    const weakSubjects = classifiedSubjects
      .filter((subject) => subject.accuracy < weakSubjectThreshold)
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)

    const totalScoredAttempts = Array.from(ruleAggregates.values()).reduce(
      (sum, rule) => sum + rule.attempts,
      0
    )

    const totalIncorrectAttempts = Array.from(ruleAggregates.values()).reduce(
      (sum, rule) => sum + rule.incorrect,
      0
    )

    const totalScoreDeficit = Array.from(ruleAggregates.values()).reduce(
      (sum, rule) =>
        sum + rule.scores.reduce((ruleSum, score) => ruleSum + (100 - score), 0),
      0
    )

    const weaknesses = Array.from(ruleAggregates.values())
      .filter((rule) => {
        if (rule.attempts <= 0) return false

        const accuracy = round(rule.scoreTotal / rule.attempts, 0)
        return rule.usesLearningEngine
          ? rule.needsPractice
          : accuracy < weakRuleThreshold || rule.needsPractice
      })
      .map((rule) => {
        const accuracy = round(rule.scoreTotal / rule.attempts, 0)
        const averageScore = accuracy
        const latestScore = rule.scores[rule.scores.length - 1] ?? 0
        const previousScores = rule.scores.slice(0, -1)
        const previousAccuracy =
          previousScores.length > 0
            ? round(
                previousScores.reduce((sum, score) => sum + score, 0) /
                  previousScores.length,
                0
              )
            : null
        const accuracyChange =
          previousAccuracy === null ? null : accuracy - previousAccuracy
        const trend =
          accuracyChange === null
            ? ("new" as const)
            : accuracyChange > 0
              ? ("improving" as const)
              : accuracyChange < 0
                ? ("declining" as const)
                : ("stable" as const)
        const scoreDeficit = rule.scores.reduce(
          (sum, score) => sum + (100 - score),
          0
        )
        const impactMagnitude = round(
          scoreDeficit / Math.max(totalScoredAttempts, 1),
          1
        )
        const missShare =
          percentage(scoreDeficit, totalScoreDeficit, 1) ?? 0
        const missedBuzzwords = Array.from(
          rule.missedBuzzwords.entries()
        )
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))

        const priorityScore = round(
          missShare * 0.65 + (100 - accuracy) * 0.35,
          2
        )

        return {
          ruleId: rule.ruleId,
          title: rule.title,
          subjectId: rule.subjectId,
          subjectName: rule.subjectName,
          topicName: rule.topicName,
          subtopicName: rule.subtopicName,
          attempts: rule.attempts,
          correctAttempts: rule.correct,
          incorrectAttempts: rule.incorrect,
          accuracy,
          averageScore,
          latestScore,
          previousAccuracy,
          accuracyChange,
          trend,
          scoreDeficit: round(scoreDeficit, 1),
          impactPercentage: -impactMagnitude,
          missSharePercentage: missShare,
          priorityScore,
          priority: getPriority(accuracy, {
            critical: criticalPriorityThreshold,
            high: highPriorityThreshold,
          }),
          needsPractice: rule.needsPractice,
          mastery: rule.mastery,
          missedBuzzwords: missedBuzzwords.slice(0, 5),
          recommendation: buildRecommendation({
            accuracy,
            latestScore,
            accuracyChange,
            trend,
            needsPractice: rule.needsPractice,
            missedBuzzwords,
            correctScoreThreshold,
          }),
          lastAttemptAt: rule.lastAttemptAt?.toISOString() ?? null,
          confidence:
            rule.attempts >= confirmedRuleAttempts
              ? ("confirmed" as const)
              : ("early" as const),
        }
      })
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          a.accuracy - b.accuracy ||
          b.attempts - a.attempts
      )
      .map((item, index) => ({
        ...item,
        priorityRank: index + 1,
      }))

    const displayedWeakDeficit = weaknesses.reduce(
      (sum, item) => sum + item.scoreDeficit,
      0
    )

    const topThreeDeficit = weaknesses
      .slice(0, 3)
      .reduce((sum, item) => sum + item.scoreDeficit, 0)

    const weaknessImpact = {
      displayedWeakMisses: weaknesses.reduce(
        (sum, item) => sum + item.incorrectAttempts,
        0
      ),
      totalIncorrectAttempts,
      displayedWeakDeficit: round(displayedWeakDeficit, 1),
      totalScoreDeficit: round(totalScoreDeficit, 1),
      shareOfRecordedMisses:
        percentage(displayedWeakDeficit, totalScoreDeficit, 0),
      topThreeShareOfRecordedMisses:
        percentage(topThreeDeficit, totalScoreDeficit, 0),
    }

    const priorityFocus = weaknesses.slice(0, 3)

    const subjectWeaknessCounts = new Map<string, number>()
    for (const item of weaknesses) {
      subjectWeaknessCounts.set(
        item.subjectName,
        (subjectWeaknessCounts.get(item.subjectName) ?? 0) + 1
      )
    }

    const topWeakSubject = Array.from(subjectWeaknessCounts.entries())
      .map(([subjectName, count]) => ({ subjectName, count }))
      .sort((a, b) => b.count - a.count || a.subjectName.localeCompare(b.subjectName))[0]

    const allMissedBuzzwords = new Map<string, number>()
    for (const item of weaknesses) {
      for (const buzzword of item.missedBuzzwords) {
        allMissedBuzzwords.set(
          buzzword.text,
          (allMissedBuzzwords.get(buzzword.text) ?? 0) + buzzword.count
        )
      }
    }

    const topMissedBuzzword = Array.from(allMissedBuzzwords.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))[0]

    const whyTopicsMatter: Array<{
      key: string
      title: string
      text: string
    }> = []

    if (weaknesses[0]) {
      whyTopicsMatter.push({
        key: "largest-miss-share",
        title: "Largest contribution to the recorded performance gap",
        text: `${weaknesses[0].title} accounts for ${weaknesses[0].missSharePercentage}% of the recorded performance gap in this date range.`,
      })

      if (weaknesses[0].trend === "improving") {
        whyTopicsMatter.push({
          key: "recent-improvement",
          title: "Recent improvement",
          text: `The latest score was ${weaknesses[0].latestScore}%. The cumulative average increased from ${weaknesses[0].previousAccuracy ?? "—"}% to ${weaknesses[0].accuracy}% (${formatSignedChange(weaknesses[0].accuracyChange)}).`,
        })
      }
    }

    if (topWeakSubject) {
      whyTopicsMatter.push({
        key: "subject-concentration",
        title: "Weakness concentration",
        text: `${topWeakSubject.subjectName} contains ${topWeakSubject.count} of the tracked weak ${
          topWeakSubject.count === 1 ? "rule" : "rules"
        }.`,
      })
    }

    if (topMissedBuzzword) {
      whyTopicsMatter.push({
        key: "missed-buzzword",
        title: "Repeatedly missed element",
        text: `“${topMissedBuzzword.text}” was missed ${topMissedBuzzword.count} ${
          topMissedBuzzword.count === 1 ? "time" : "times"
        } across the displayed weak rules.`,
      })
    } else if (weaknesses[0]) {
      whyTopicsMatter.push({
        key: "repeat-attempts",
        title: "Repeated difficulty",
        text: `${weaknesses[0].title} has ${weaknesses[0].incorrectAttempts} incorrect ${
          weaknesses[0].incorrectAttempts === 1 ? "attempt" : "attempts"
        } across ${weaknesses[0].attempts} scored attempts.`,
      })
    }

    const nextBestAction = weaknesses[0]
      ? {
          ...weaknesses[0],
          reason:
            weaknesses[0].trend === "improving"
              ? `${weaknesses[0].title} is improving: the latest score was ${weaknesses[0].latestScore}% and the cumulative average changed by ${formatSignedChange(weaknesses[0].accuracyChange)}.`
              : `${weaknesses[0].title} ranks first because it combines ${weaknesses[0].accuracy}% average score with ${weaknesses[0].missSharePercentage}% of the recorded performance gap.`,
        }
      : null

    const coachingNote = nextBestAction
      ? {
          summary:
            nextBestAction.trend === "improving"
              ? `${nextBestAction.title} is improving. The latest score was ${nextBestAction.latestScore}%, compared with a previous average of ${nextBestAction.previousAccuracy ?? "—"}%, bringing the current average to ${nextBestAction.accuracy}%.`
              : `Begin with ${nextBestAction.title}. It currently has the highest calculated weakness priority in the selected date range.`,
          steps: [
            nextBestAction.missedBuzzwords.length > 0
              ? `Review the missed elements: ${nextBestAction.missedBuzzwords
                  .slice(0, 3)
                  .map((item) => item.text)
                  .join(", ")}.`
              : "Review the rule elements and exceptions before the next attempt.",
            nextBestAction.trend === "improving"
              ? `Complete one more scored recall session for ${nextBestAction.title} to confirm the improvement.`
              : `Complete a scored weak-focus session for ${nextBestAction.title}.`,
            `Current trend: ${nextBestAction.trend}. Latest score: ${nextBestAction.latestScore}%.`,
          ],
        }
      : null

    return NextResponse.json({
      range: {
        key: range,
        label,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      thresholds: {
        correctScore: correctScoreThreshold,
        minimumSubjectAttempts: 1,
        minimumRuleAttempts: 1,
        confirmedSubjectAttempts: confirmedSubjectAttempts,
        confirmedRuleAttempts: confirmedRuleAttempts,
        strongSubjectAccuracy: strongSubjectThreshold,
        weakSubjectAccuracy: weakSubjectThreshold,
        weakRuleAccuracy: weakRuleThreshold,
        criticalPriorityAccuracy: criticalPriorityThreshold,
        highPriorityAccuracy: highPriorityThreshold,
      },
      summary: {
        strongSubjectCount: strengths.length,
        weakSubjectCount: weakSubjects.length,
        highPriorityRuleCount: weaknesses.filter(
          (item) => item.priority === "critical" || item.priority === "high"
        ).length,
        totalScoredAttempts,
        totalIncorrectAttempts,
      },
      strengths,
      weakSubjects,
      weaknesses,
      weaknessImpact,
      priorityFocus,
      whyTopicsMatter: whyTopicsMatter.slice(0, 3),
      nextBestAction,
      coachingNote,
    })
  } catch (error) {
    console.error("STRENGTHS WEAKNESSES ANALYTICS ERROR:", error)

    return NextResponse.json(
      { error: "Strengths and weaknesses analytics could not be loaded." },
      { status: 500 }
    )
  }
}

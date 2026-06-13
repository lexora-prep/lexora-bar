import React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import ExcelJS from "exceljs"
import {
  Circle,
  Document,
  Image,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"
import { buildProgressHistoryAnalytics } from "@/lib/progress-history-analytics"
import { getStrengthsWeaknessesAnalyticsSettings } from "@/lib/analytics-settings"
import type {
  ProgressHistoryAnalyticsData,
  ProgressHistoryEvent,
  ProgressHistoryPoint,
  ProgressMilestone,
  SubjectProgressHistory,
} from "@/app/(app)/analytics/types"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

const h = React.createElement

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 38,
    fontSize: 8,
    color: "#17203f",
    fontFamily: "Helvetica",
    backgroundColor: "#fbfbfe",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  brand: { fontSize: 17, color: "#5b21b6", letterSpacing: 0.5 },
  reportTitle: { fontSize: 12.5, marginTop: 3, color: "#11163c" },
  reportRange: { marginTop: 2, color: "#64748b", fontSize: 7 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    color: "#6d28d9",
    fontSize: 6.8,
  },
  muted: { color: "#64748b" },
  metricsRow: { flexDirection: "row", gap: 7, marginBottom: 9 },
  metricCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 0.6,
    borderColor: "#e5e7ef",
    borderRadius: 9,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  metricLabel: { color: "#64748b", fontSize: 6.5 },
  metricValue: { marginTop: 3, fontSize: 15, color: "#11163c" },
  metricContext: { marginTop: 2.5, color: "#94a3b8", fontSize: 5.8, lineHeight: 1.2 },
  section: {
    borderWidth: 0.6,
    borderColor: "#e5e7ef",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 10.5, color: "#11163c", marginBottom: 2 },
  sectionSubtitle: { color: "#64748b", fontSize: 6.5, marginBottom: 7 },
  decisionBand: {
    flexDirection: "row",
    borderWidth: 0.6,
    borderColor: "#ddd6fe",
    borderRadius: 10,
    backgroundColor: "#faf8ff",
    padding: 9,
    marginBottom: 8,
    gap: 8,
  },
  decisionColumn: { flexGrow: 1, flexBasis: 0 },
  decisionLabel: { color: "#7c3aed", fontSize: 6.2, marginBottom: 3 },
  decisionValue: { color: "#11163c", fontSize: 8.2, lineHeight: 1.3 },
  twoColumn: { flexDirection: "row", gap: 8 },
  half: { flexGrow: 1, flexBasis: 0 },
  insightBox: {
    borderRadius: 9,
    backgroundColor: "#ecfdf5",
    borderWidth: 0.6,
    borderColor: "#bbf7d0",
    padding: 9,
  },
  insightTitle: { fontSize: 10, color: "#047857" },
  insightText: { marginTop: 4, color: "#46516f", lineHeight: 1.35 },
  actionBox: {
    marginTop: 6,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    padding: 7,
    borderWidth: 0.5,
    borderColor: "#d1fae5",
  },
  evidenceRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef1f6",
    paddingVertical: 4,
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef1f6",
    paddingVertical: 4.3,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f5f3ff",
    color: "#7c3aed",
    textAlign: "center",
    paddingTop: 5,
    fontSize: 6.2,
    marginRight: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f3ff",
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef1f6",
    paddingVertical: 4.4,
    paddingHorizontal: 4,
  },
  subjectName: { width: "30%" },
  subjectMetric: { width: "14%", textAlign: "center" },
  subjectStatus: { width: "14%", textAlign: "center" },
  historyDate: { width: "16%", color: "#64748b" },
  historyType: { width: "21%", color: "#11163c" },
  historyDetail: { width: "63%", color: "#46516f" },
  milestoneRow: {
    flexDirection: "row",
    paddingVertical: 4.2,
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef1f6",
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2.5, marginRight: 6 },
  methodology: {
    borderRadius: 7,
    backgroundColor: "#f8fafc",
    padding: 7,
    color: "#64748b",
    fontSize: 6.2,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#94a3b8",
    fontSize: 5.9,
  },
  watermark: {
    position: "absolute",
    top: "44%",
    left: "12%",
    width: "76%",
    textAlign: "center",
    fontSize: 29,
    color: "#7c3aed",
    opacity: 0.028,
    transform: "rotate(-28deg)",
  },
})

type ReportIdentity = {
  name: string
  email: string
  generatedAtLabel: string
  generatedAtIso: string
  reportId: string
}

type SubjectSnapshot = {
  subject: SubjectProgressHistory
  current: number | null
  previous: number | null
  attempts: number
  change: number | null
  status: "Improving" | "Declining" | "Stable" | "Early data"
}

function formatLocalDateTime(date: Date, timezoneOffset: number) {
  const shifted = new Date(date.getTime() - timezoneOffset * 60_000)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(shifted)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function signedPoints(value: number | null) {
  if (value === null) return "Unavailable"
  return `${value > 0 ? "+" : ""}${value} pts`
}

function metricCard(label: string, value: string, context: string, key: string) {
  return h(
    View,
    { style: styles.metricCard, key },
    h(Text, { style: styles.metricLabel }, label),
    h(Text, { style: styles.metricValue }, value),
    h(Text, { style: styles.metricContext }, context)
  )
}

function chartGeometry(
  points: Array<{ score: number | null }>,
  width: number,
  height: number,
  padding = 14
) {
  const valid = points
    .map((point, index) => ({ index, score: point.score }))
    .filter((point): point is { index: number; score: number } => point.score !== null)

  if (valid.length === 0) {
    return { linePath: "", areaPath: "", dots: [] as Array<{ x: number; y: number; score: number }> }
  }

  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2
  const divisor = Math.max(1, points.length - 1)
  const dots = valid.map((point) => ({
    x: padding + (point.index / divisor) * usableWidth,
    y: padding + (1 - point.score / 100) * usableHeight,
    score: point.score,
  }))
  const linePath = dots
    .map((dot, index) => `${index === 0 ? "M" : "L"} ${dot.x.toFixed(2)} ${dot.y.toFixed(2)}`)
    .join(" ")
  const areaPath = `${linePath} L ${dots[dots.length - 1].x.toFixed(2)} ${(height - padding).toFixed(2)} L ${dots[0].x.toFixed(2)} ${(height - padding).toFixed(2)} Z`

  return { linePath, areaPath, dots }
}

function progressChart(
  points: Array<{ score: number | null; shortLabel?: string; label?: string }>,
  key: string,
  height = 104,
  showLabels = true
) {
  const width = 500
  const geometry = chartGeometry(points, width, height)

  if (!geometry.linePath) {
    return h(
      View,
      { style: { height: 62, alignItems: "center", justifyContent: "center" }, key },
      h(Text, { style: styles.muted }, "More scored history is required for this chart.")
    )
  }

  return h(
    Svg,
    { width: "100%", height, key },
    ...[0, 25, 50, 75, 100].map((value) => {
      const y = 14 + (1 - value / 100) * (height - 28)
      return h(Line, {
        key: `grid-${value}`,
        x1: 14,
        y1: y,
        x2: width - 14,
        y2: y,
        stroke: "#eef1f6",
        strokeWidth: 0.65,
      })
    }),
    h(Path, { d: geometry.areaPath, fill: "#ede9fe", opacity: 0.72 }),
    h(Path, {
      d: geometry.linePath,
      fill: "none",
      stroke: "#7c3aed",
      strokeWidth: 2.15,
    }),
    ...geometry.dots.map((dot, index) =>
      h(
        React.Fragment,
        { key: `dot-${index}` },
        h(Circle, {
          cx: dot.x,
          cy: dot.y,
          r: index === geometry.dots.length - 1 ? 3.4 : 2.6,
          fill: "#ffffff",
          stroke: "#7c3aed",
          strokeWidth: index === geometry.dots.length - 1 ? 1.7 : 1.2,
        }),
        showLabels
          ? h(Text, {
              x: dot.x - 7,
              y: Math.max(8, dot.y - 7),
              style: { fontSize: 5.4, fill: "#4c1d95" },
            }, `${Math.round(dot.score)}%`)
          : null
      )
    )
  )
}

function reportChrome(identity: ReportIdentity) {
  return [
    h(Text, { style: styles.watermark, fixed: true, key: "wm" }, "LEXORA - PRIVATE PERFORMANCE REPORT"),
    h(
      View,
      { style: styles.footer, fixed: true, key: "footer" },
      h(
        Text,
        null,
        `${identity.name} · ${identity.email} · ${identity.generatedAtLabel} · ${identity.reportId}`
      ),
      h(Text, {
        render: ({ pageNumber, totalPages }) => `Lexora Progress Report · Page ${pageNumber} of ${totalPages}`,
      })
    ),
  ]
}

function reportHeader(title: string, rangeLabel: string, badge: string) {
  return h(
    View,
    { style: styles.header },
    h(
      View,
      null,
      h(Text, { style: styles.brand }, "LEXORA"),
      h(Text, { style: styles.reportTitle }, title),
      h(Text, { style: styles.reportRange }, rangeLabel)
    ),
    h(Text, { style: styles.badge }, badge)
  )
}

function eventTypeLabel(event: ProgressHistoryEvent) {
  if (event.type === "rule_improved") return "Accuracy improved"
  if (event.type === "rule_completed") return "Rule training"
  if (event.type === "study_session") return "Study session"
  return "Flashcards"
}

function compactEventDetail(event: ProgressHistoryEvent) {
  const score = event.score === null ? "" : ` · ${event.score}%`
  const subject = event.subjectName ? `${event.subjectName} · ` : ""
  return `${subject}${event.title}${score}`.replace(/\s+/g, " ").trim()
}

function getSubjectSnapshot(subject: SubjectProgressHistory): SubjectSnapshot {
  const populated = subject.periods.filter((period) => period.score !== null)
  const currentPeriod = [...subject.periods].reverse().find((period) => period.score !== null) ?? null
  const priorPeriods = currentPeriod
    ? subject.periods.slice(0, subject.periods.indexOf(currentPeriod)).filter((period) => period.score !== null)
    : []
  const previousPeriod = priorPeriods[priorPeriods.length - 1] ?? null
  const current = currentPeriod?.score ?? null
  const previous = previousPeriod?.score ?? null
  const attempts = currentPeriod?.attempts ?? populated.reduce((sum, period) => sum + period.attempts, 0)
  const change = current !== null && previous !== null ? Math.round(current - previous) : subject.change
  const status: SubjectSnapshot["status"] =
    attempts < 3
      ? "Early data"
      : change !== null && change >= 5
        ? "Improving"
        : change !== null && change <= -5
          ? "Declining"
          : "Stable"
  return { subject, current, previous, attempts, change, status }
}

function selectSubjectSnapshots(data: ProgressHistoryAnalyticsData) {
  const all = data.subjectProgress.map(getSubjectSnapshot)
  const strongest = all
    .filter((item) => item.current !== null)
    .sort((a, b) => Number(b.current) - Number(a.current))
    .slice(0, 3)
  const weakest = all
    .filter((item) => item.current !== null)
    .sort((a, b) => Number(a.current) - Number(b.current))
    .slice(0, 3)
  const improving = all
    .filter((item) => item.change !== null && item.change > 0)
    .sort((a, b) => Number(b.change) - Number(a.change))
    .slice(0, 2)

  const unique = new Map<string, SubjectSnapshot>()
  for (const item of [...weakest, ...strongest, ...improving]) {
    unique.set(item.subject.subjectId ?? item.subject.subjectName, item)
  }
  return [...unique.values()].slice(0, 8)
}

function getPrioritySubjects(data: ProgressHistoryAnalyticsData) {
  return data.subjectProgress
    .map(getSubjectSnapshot)
    .filter((item) => item.current !== null)
    .sort((a, b) => Number(a.current) - Number(b.current))
    .slice(0, 3)
}

function getImprovingSubjects(data: ProgressHistoryAnalyticsData) {
  return data.subjectProgress
    .map(getSubjectSnapshot)
    .filter((item) => item.change !== null && item.change > 0)
    .sort((a, b) => Number(b.change) - Number(a.change))
    .slice(0, 3)
}

function selectMilestones(milestones: ProgressMilestone[]) {
  const completed = milestones.filter((item) => item.status === "completed").slice(-3)
  const active = milestones.find((item) => item.status === "in_progress")
  const next = milestones.find((item) => item.status === "locked")
  return [...completed, ...(active ? [active] : []), ...(next ? [next] : [])].slice(0, 5)
}

function buildPdfDocument(data: ProgressHistoryAnalyticsData, identity: ReportIdentity) {
  const selectedSubjects = selectSubjectSnapshots(data)
  const prioritySubjects = getPrioritySubjects(data)
  const improvingSubjects = getImprovingSubjects(data)
  const recentEvents = data.recentHistory.slice(0, 5)
  const milestones = selectMilestones(data.milestones)
  const eventCounts = data.recentHistory.reduce<Record<string, number>>((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1
    return counts
  }, {})

  const weakest = prioritySubjects[0]
  const strongestImprovement = improvingSubjects[0]
  const currentReadiness = data.summary.currentReadiness
  const previousReadiness = data.summary.previousReadiness

  const currentPosition =
    currentReadiness === null
      ? "Readiness is not yet available for this range."
      : previousReadiness === null
        ? `Current recorded readiness is ${currentReadiness}%.`
        : `Readiness moved from ${previousReadiness}% to ${currentReadiness}% (${signedPoints(data.summary.change)}).`
  const primaryCause = weakest?.current !== null
    ? `${weakest.subject.subjectName} is the lowest measured subject at ${weakest.current}%.`
    : "No subject has enough measured activity to identify a primary cause."
  const nextAction = data.improvement.recommendedAction || "Complete another scored active-recall session."

  const pageOne = h(
    Page,
    { size: "A4", style: styles.page },
    ...reportChrome(identity),
    reportHeader("Black Letter Law Progress Report", data.range.label, "Recorded performance data"),
    h(
      View,
      { style: styles.metricsRow },
      metricCard(
        "Current readiness",
        currentReadiness === null ? "—" : `${currentReadiness}%`,
        previousReadiness === null ? "No prior comparison available" : `Previous: ${previousReadiness}%`,
        "readiness"
      ),
      metricCard(
        "Trend",
        data.summary.change === null ? "—" : signedPoints(data.summary.change),
        data.summary.change === null ? "Awaiting comparable history" : "Versus preceding equivalent period",
        "trend"
      ),
      metricCard(
        "Study evidence",
        String(data.summary.totalScoredAttempts),
        `${data.summary.activeDayStreak} day active streak`,
        "evidence"
      ),
      metricCard(
        "Coverage",
        `${data.summary.attemptedRules}/${data.summary.totalAvailableRules}`,
        data.summary.completionPercentage === null ? "Completion unavailable" : `${data.summary.completionPercentage}% attempted`,
        "coverage"
      )
    ),
    h(
      View,
      { style: styles.decisionBand, wrap: false },
      h(
        View,
        { style: styles.decisionColumn },
        h(Text, { style: styles.decisionLabel }, "CURRENT POSITION"),
        h(Text, { style: styles.decisionValue }, currentPosition)
      ),
      h(
        View,
        { style: styles.decisionColumn },
        h(Text, { style: styles.decisionLabel }, "PRIMARY CAUSE"),
        h(Text, { style: styles.decisionValue }, primaryCause)
      ),
      h(
        View,
        { style: styles.decisionColumn },
        h(Text, { style: styles.decisionLabel }, "NEXT BEST ACTION"),
        h(Text, { style: styles.decisionValue }, nextAction)
      )
    ),
    h(
      View,
      { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionTitle }, "Overall Progress"),
      h(Text, { style: styles.sectionSubtitle }, "Recorded readiness across equal periods in the selected range."),
      progressChart(data.overallProgress, "overall", 103, true)
    ),
    h(
      View,
      { style: styles.twoColumn, wrap: false },
      h(
        View,
        { style: styles.half },
        h(
          View,
          { style: styles.section },
          h(Text, { style: styles.sectionTitle }, "What Improved"),
          h(Text, { style: styles.sectionSubtitle }, "Largest positive measured subject changes."),
          ...(improvingSubjects.length > 0
            ? improvingSubjects.map((item, index) =>
                h(
                  View,
                  { style: styles.miniRow, key: item.subject.subjectName },
                  h(Text, { style: styles.rankBadge }, String(index + 1)),
                  h(
                    View,
                    { style: { width: "61%" } },
                    h(Text, { style: { color: "#11163c" } }, item.subject.subjectName),
                    h(Text, { style: [styles.muted, { marginTop: 1 }] }, `${item.attempts} current-period attempts`)
                  ),
                  h(Text, { style: { width: "29%", textAlign: "right", color: "#059669" } }, signedPoints(item.change))
                )
              )
            : [h(Text, { style: styles.muted, key: "no-improvement" }, "No confirmed positive subject change is available yet.")])
        )
      ),
      h(
        View,
        { style: styles.half },
        h(
          View,
          { style: styles.section },
          h(Text, { style: styles.sectionTitle }, "What Needs Attention"),
          h(Text, { style: styles.sectionSubtitle }, "Lowest measured subjects in the selected range."),
          ...(prioritySubjects.length > 0
            ? prioritySubjects.map((item, index) =>
                h(
                  View,
                  { style: styles.miniRow, key: item.subject.subjectName },
                  h(Text, { style: styles.rankBadge }, String(index + 1)),
                  h(
                    View,
                    { style: { width: "61%" } },
                    h(Text, { style: { color: "#11163c" } }, item.subject.subjectName),
                    h(Text, { style: [styles.muted, { marginTop: 1 }] }, `${item.attempts} current-period attempts | ${item.status}`)
                  ),
                  h(Text, { style: { width: "29%", textAlign: "right", color: "#e11d48" } }, `${item.current}%`)
                )
              )
            : [h(Text, { style: styles.muted, key: "no-priority" }, "No measured priority subject is available yet.")])
        )
      )
    ),
    h(
      View,
      { style: [styles.section, { marginTop: 0 }], wrap: false },
      h(Text, { style: styles.sectionTitle }, "Performance Assessment"),
      h(Text, { style: styles.sectionSubtitle }, "Evidence-based interpretation of the selected period."),
      h(
        View,
        { style: styles.twoColumn },
        h(
          View,
          { style: [styles.half, styles.insightBox] },
          h(Text, { style: styles.insightTitle }, data.improvement.title),
          h(Text, { style: styles.insightText }, data.improvement.message),
          h(
            View,
            { style: styles.actionBox },
            h(Text, { style: { color: "#047857", fontSize: 6.6 } }, "Recommended next action"),
            h(Text, { style: { marginTop: 3, color: "#30395a", lineHeight: 1.35 } }, nextAction)
          )
        ),
        h(
          View,
          { style: styles.half },
          ...data.improvement.evidence.slice(0, 4).map((item, index) =>
            h(
              View,
              { style: styles.evidenceRow, key: `evidence-${index}` },
              h(Text, { style: { width: "7%", color: "#10b981" } }, "•"),
              h(Text, { style: { width: "93%", color: "#46516f" } }, item)
            )
          )
        )
      )
    )
  )

  const pageTwo = h(
    Page,
    { size: "A4", style: styles.page },
    ...reportChrome(identity),
    reportHeader("Evidence and Detailed Progress", data.range.label, "Supporting evidence"),
    h(
      View,
      { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionTitle }, "Readiness Trend"),
      h(Text, { style: styles.sectionSubtitle }, "Rolling readiness based only on recorded scored attempts."),
      progressChart(data.readinessTrend["30d"], "trend", 100, false),
      h(
        Text,
        { style: { marginTop: 4, color: "#46516f", fontSize: 6.6 } },
        data.summary.change === null
          ? "A preceding-period comparison is not available yet."
          : `The selected period finished at ${currentReadiness ?? "—"}% readiness, ${signedPoints(data.summary.change)} versus the preceding period.`
      )
    ),
    h(
      View,
      { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionTitle }, "Subject Performance"),
      h(Text, { style: styles.sectionSubtitle }, "Strongest, weakest, and most improved measured subjects. Limited evidence is marked as early data."),
      h(
        View,
        { style: styles.tableHeader },
        h(Text, { style: styles.subjectName }, "Subject"),
        h(Text, { style: styles.subjectMetric }, "Current"),
        h(Text, { style: styles.subjectMetric }, "Previous"),
        h(Text, { style: styles.subjectMetric }, "Change"),
        h(Text, { style: styles.subjectMetric }, "Attempts"),
        h(Text, { style: styles.subjectStatus }, "Status")
      ),
      ...selectedSubjects.map((item) =>
        h(
          View,
          { style: styles.tableRow, key: item.subject.subjectId ?? item.subject.subjectName, wrap: false },
          h(Text, { style: styles.subjectName }, item.subject.subjectName),
          h(Text, { style: styles.subjectMetric }, item.current === null ? "—" : `${item.current}%`),
          h(Text, { style: styles.subjectMetric }, item.previous === null ? "—" : `${item.previous}%`),
          h(Text, { style: styles.subjectMetric }, item.change === null ? "—" : signedPoints(item.change)),
          h(Text, { style: styles.subjectMetric }, String(item.attempts)),
          h(Text, { style: styles.subjectStatus }, item.status)
        )
      )
    ),
    h(
      View,
      { style: styles.twoColumn, wrap: false },
      h(
        View,
        { style: styles.half },
        h(
          View,
          { style: styles.section },
          h(Text, { style: styles.sectionTitle }, "Study Activity Summary"),
          h(Text, { style: styles.sectionSubtitle }, "Recorded activity by type in the selected range."),
          ...[
            ["Rule-training events", eventCounts.rule_completed ?? 0],
            ["Accuracy improvements", eventCounts.rule_improved ?? 0],
            ["Study sessions", eventCounts.study_session ?? 0],
            ["Flashcard events", eventCounts.flashcards ?? 0],
            ["Active-day streak", data.summary.activeDayStreak],
          ].map(([label, value]) =>
            h(
              View,
              { style: styles.evidenceRow, key: String(label) },
              h(Text, { style: { width: "75%", color: "#46516f" } }, String(label)),
              h(Text, { style: { width: "25%", textAlign: "right", color: "#11163c" } }, String(value))
            )
          )
        )
      ),
      h(
        View,
        { style: styles.half },
        h(
          View,
          { style: styles.section },
          h(Text, { style: styles.sectionTitle }, "Milestones"),
          h(Text, { style: styles.sectionSubtitle }, "Completed, current, and next meaningful milestone."),
          ...milestones.map((milestone) =>
            h(
              View,
              { style: styles.milestoneRow, key: milestone.key },
              h(View, {
                style: [
                  styles.dot,
                  {
                    backgroundColor:
                      milestone.status === "completed"
                        ? "#10b981"
                        : milestone.status === "in_progress"
                          ? "#8b5cf6"
                          : "#cbd5e1",
                  },
                ],
              }),
              h(
                View,
                { style: { width: "73%" } },
                h(Text, { style: { color: "#11163c" } }, milestone.label),
                h(Text, { style: [styles.muted, { marginTop: 1 }] }, milestone.detail)
              ),
              h(
                Text,
                { style: { width: "21%", textAlign: "right", color: "#94a3b8", fontSize: 6 } },
                milestone.date ? shortDate(milestone.date) : ""
              )
            )
          )
        )
      )
    ),
    h(
      View,
      { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionTitle }, "Latest Meaningful Activity"),
      h(Text, { style: styles.sectionSubtitle }, `Showing the latest ${recentEvents.length} of ${data.recentHistory.length} recorded events. Full history is available in Excel.`),
      h(
        View,
        { style: styles.tableHeader },
        h(Text, { style: styles.historyDate }, "Date"),
        h(Text, { style: styles.historyType }, "Activity"),
        h(Text, { style: styles.historyDetail }, "Recorded result")
      ),
      ...recentEvents.map((event) =>
        h(
          View,
          { style: styles.tableRow, key: event.id, wrap: false },
          h(Text, { style: styles.historyDate }, shortDate(event.timestamp)),
          h(Text, { style: styles.historyType }, eventTypeLabel(event)),
          h(Text, { style: styles.historyDetail }, compactEventDetail(event))
        )
      )
    ),
    h(
      View,
      { style: styles.methodology, wrap: false },
      h(Text, { style: { color: "#11163c", marginBottom: 3 } }, "How this report is calculated"),
      h(
        Text,
        null,
        "Readiness and subject results are calculated from recorded scored rule attempts in the selected period. Results may change as additional activity is recorded. Subjects with limited attempts are marked as early data. This report is not a prediction of bar-exam performance."
      )
    )
  )

  return h(
    Document,
    {
      title: `Lexora Progress Report - ${data.range.label}`,
      author: identity.name,
      subject: "Lexora recorded progress, readiness, evidence, and next action",
      keywords: `Lexora, progress history, readiness, analytics, ${identity.reportId}`,
      creator: "Lexora Progress Analytics",
      producer: "Lexora",
      language: "en-US",
    },
    pageOne,
    pageTwo
  )
}


type PremiumAttempt = {
  id: string
  ruleId: string
  score: number
  mode: string
  createdAt: Date
}

type PremiumRuleMeta = {
  id: string
  title: string
  subjectName: string
  topicName: string
}

type PremiumSubjectStat = {
  name: string
  attempts: number
  accuracy: number
  previousAccuracy: number | null
  change: number | null
  confidence: "early" | "confirmed"
}

type PremiumRulePriority = {
  title: string
  subjectName: string
  topicName: string
  attempts: number
  accuracy: number
  missedElement: string | null
}

type PremiumModeStat = {
  mode: string
  attempts: number
  accuracy: number
}

type PremiumSupplement = {
  currentAttempts: PremiumAttempt[]
  previousAttempts: PremiumAttempt[]
  rules: Map<string, PremiumRuleMeta>
  subjects: PremiumSubjectStat[]
  weakRules: PremiumRulePriority[]
  modes: PremiumModeStat[]
  activeDays: number
  heatmap: Array<{ date: Date; count: number }>
}

const REPORT_COLORS = {
  violet: "#5b21b6",
  violetBright: "#6d28d9",
  violetSoft: "#ede9fe",
  violetPale: "#f7f4ff",
  navy: "#13183f",
  slate: "#52627f",
  border: "#dfe3ed",
  borderSoft: "#edf0f5",
  green: "#0f9f6e",
  greenSoft: "#e9fbf4",
  red: "#df3b4c",
  redSoft: "#fff0f2",
  amber: "#f59e0b",
  blue: "#3b82f6",
  teal: "#22b8a7",
  gray: "#cbd5e1",
}

const premiumStyles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    color: REPORT_COLORS.navy,
    fontFamily: "Helvetica",
    fontSize: 6.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1.2,
    borderBottomColor: REPORT_COLORS.violet,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", width: "72%" },
  logoShield: {
    width: 44,
    height: 48,
    borderWidth: 2,
    borderColor: REPORT_COLORS.violet,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoMark: { fontSize: 21, color: REPORT_COLORS.violet, fontFamily: "Helvetica-Bold" },
  brandName: { fontSize: 7.2, letterSpacing: 3.2, color: REPORT_COLORS.navy, marginTop: 2 },
  eyebrow: { fontSize: 6.1, color: REPORT_COLORS.violet, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  mainTitle: { fontSize: 18.5, fontFamily: "Helvetica-Bold", marginTop: 4, color: REPORT_COLORS.navy },
  mainSubtitle: { fontSize: 7.1, color: REPORT_COLORS.slate, marginTop: 3 },
  metadata: { width: "25%", paddingLeft: 10, borderLeftWidth: 0.6, borderLeftColor: REPORT_COLORS.border },
  metadataLabel: { fontSize: 5.2, color: "#8793aa", marginTop: 2.3 },
  metadataValue: { fontSize: 6.1, color: REPORT_COLORS.navy, fontFamily: "Helvetica-Bold", marginTop: 0.8 },
  sectionLabel: { fontSize: 6.2, color: REPORT_COLORS.violet, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 5 },
  overviewRow: { flexDirection: "row", gap: 6, marginBottom: 7 },
  kpi: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 58,
    borderWidth: 0.55,
    borderColor: REPORT_COLORS.border,
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  kpiIcon: { fontSize: 14, color: REPORT_COLORS.violet, marginBottom: 3 },
  kpiValue: { fontSize: 14.5, fontFamily: "Helvetica-Bold", color: REPORT_COLORS.navy },
  kpiLabel: { fontSize: 6.1, color: REPORT_COLORS.navy, marginTop: 1.5 },
  kpiDelta: { fontSize: 5.4, color: REPORT_COLORS.green, marginTop: 2.5 },
  scoreCard: {
    width: 120,
    minHeight: 58,
    borderWidth: 0.55,
    borderColor: REPORT_COLORS.border,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  twoCol: { flexDirection: "row", gap: 7, marginBottom: 7 },
  wide: { width: "54%" },
  narrow: { width: "46%" },
  panel: { borderWidth: 0.55, borderColor: REPORT_COLORS.border, backgroundColor: "#ffffff", padding: 7 },
  panelTitle: { fontSize: 7.2, color: REPORT_COLORS.navy, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  panelSubtitle: { fontSize: 5.4, color: REPORT_COLORS.slate, marginBottom: 5 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3.2 },
  legendDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  legendName: { width: "56%", color: REPORT_COLORS.navy },
  legendValue: { width: "22%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  legendCount: { width: "22%", textAlign: "right", color: REPORT_COLORS.slate },
  triple: { flexDirection: "row", gap: 7, marginBottom: 7 },
  third: { flexGrow: 1, flexBasis: 0 },
  strengthTitle: { color: REPORT_COLORS.green, fontFamily: "Helvetica-Bold", fontSize: 6.6, marginBottom: 4 },
  weaknessTitle: { color: REPORT_COLORS.red, fontFamily: "Helvetica-Bold", fontSize: 6.6, marginBottom: 4 },
  skillRow: { marginBottom: 5 },
  skillTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  barTrack: { height: 3, backgroundColor: "#edf0f5", borderRadius: 2 },
  barFill: { height: 3, borderRadius: 2 },
  heatmapWrap: { flexDirection: "row", gap: 3, alignItems: "flex-start" },
  heatmapDayLabels: { width: 16, gap: 2 },
  heatmapWeeks: { flexDirection: "row", gap: 2 },
  heatmapWeek: { gap: 2 },
  heatmapCell: { width: 8.4, height: 8.4, borderRadius: 1.4 },
  splitPanel: { flexDirection: "row", gap: 7, marginBottom: 7 },
  halfPanel: { flexGrow: 1, flexBasis: 0, borderWidth: 0.55, borderColor: REPORT_COLORS.border, backgroundColor: "#ffffff", padding: 7 },
  historyHeader: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: REPORT_COLORS.border, paddingBottom: 3, marginBottom: 2 },
  historyRow: { flexDirection: "row", borderBottomWidth: 0.35, borderBottomColor: REPORT_COLORS.borderSoft, paddingVertical: 3.2 },
  historyActivity: { width: "54%" },
  historyScore: { width: "17%", textAlign: "right" },
  historyDate: { width: "29%", textAlign: "right", color: REPORT_COLORS.slate },
  insightRow: { flexDirection: "row", marginBottom: 5 },
  insightIcon: { width: 19, height: 19, borderRadius: 10, backgroundColor: REPORT_COLORS.violetPale, color: REPORT_COLORS.violet, textAlign: "center", paddingTop: 5, marginRight: 6, fontFamily: "Helvetica-Bold" },
  insightTextWrap: { width: "88%" },
  insightTitle: { fontFamily: "Helvetica-Bold", color: REPORT_COLORS.navy, fontSize: 6.2 },
  insightText: { color: REPORT_COLORS.slate, lineHeight: 1.25, marginTop: 1 },
  recommendationRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.35, borderBottomColor: REPORT_COLORS.borderSoft, paddingVertical: 4 },
  recommendationIcon: { width: 18, color: REPORT_COLORS.violet, fontSize: 10, textAlign: "center" },
  recommendationBody: { width: "78%", paddingLeft: 4 },
  recommendationArrow: { width: "12%", textAlign: "right", color: REPORT_COLORS.slate },
  recommendationTitle: { fontFamily: "Helvetica-Bold", color: REPORT_COLORS.navy },
  recommendationText: { color: REPORT_COLORS.slate, marginTop: 1, lineHeight: 1.2 },
  quote: { fontSize: 8.6, color: REPORT_COLORS.slate, lineHeight: 1.35, marginTop: 4 },
  nextStep: { fontSize: 6.1, color: REPORT_COLORS.navy, lineHeight: 1.35, marginTop: 6 },
  footerBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
    backgroundColor: REPORT_COLORS.violet,
    color: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    fontSize: 5.1,
  },
  watermark: {
    position: "absolute",
    top: "46%",
    left: "17%",
    width: "66%",
    textAlign: "center",
    color: REPORT_COLORS.violet,
    opacity: 0.018,
    fontSize: 30,
    transform: "rotate(-28deg)",
  },
})

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`
}

function averageNumber(values: number[]) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function dateKeyAtOffset(date: Date, timezoneOffset: number) {
  const shifted = new Date(date.getTime() - timezoneOffset * 60_000)
  return shifted.toISOString().slice(0, 10)
}

function formatReportDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function displayMode(mode: string) {
  const clean = mode.trim().toLowerCase()
  if (clean === "fillblank") return "Fill in the blank"
  if (clean === "buzzwords") return "Buzzword recall"
  if (clean === "ordering") return "Rule ordering"
  if (clean === "typing") return "Typing recall"
  return clean ? clean.replace(/(^|\s)\S/g, (char) => char.toUpperCase()) : "Rule practice"
}

async function buildPremiumSupplement(params: {
  userId: string
  data: ProgressHistoryAnalyticsData
  timezoneOffset: number
  confirmedSubjectAttempts: number
  weakRuleThreshold: number
}) {
  const rangeStart = new Date(params.data.range.start)
  const rangeEnd = new Date(params.data.range.end)
  const duration = Math.max(1, rangeEnd.getTime() - rangeStart.getTime() + 1)
  const previousEnd = new Date(rangeStart.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration + 1)

  const rawAttempts = await prisma.user_rule_attempts.findMany({
    where: {
      user_id: params.userId,
      created_at: { gte: previousStart, lte: rangeEnd },
    },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      rule_id: true,
      score: true,
      training_mode: true,
      created_at: true,
      missed_buzzwords: true,
    },
  })

  const ruleIds = [...new Set(rawAttempts.map((attempt) => attempt.rule_id))]
  const ruleRows = ruleIds.length
    ? await prisma.rules.findMany({
        where: { id: { in: ruleIds } },
        select: {
          id: true,
          title: true,
          subjects: { select: { name: true } },
          topics: { select: { name: true } },
        },
      })
    : []

  const rules = new Map<string, PremiumRuleMeta>()
  for (const rule of ruleRows) {
    rules.set(rule.id, {
      id: rule.id,
      title: rule.title,
      subjectName: rule.subjects?.name ?? "Unassigned subject",
      topicName: rule.topics?.name ?? "General rules",
    })
  }

  const normalized = rawAttempts
    .filter((attempt): attempt is typeof attempt & { created_at: Date } => Boolean(attempt.created_at))
    .map((attempt) => ({
      id: attempt.id,
      ruleId: attempt.rule_id,
      score: attempt.score,
      mode: attempt.training_mode ?? "unknown",
      createdAt: attempt.created_at,
      missedBuzzwords: Array.isArray(attempt.missed_buzzwords)
        ? attempt.missed_buzzwords.filter((item): item is string => typeof item === "string")
        : [],
    }))

  const currentAttempts: PremiumAttempt[] = normalized
    .filter((attempt) => attempt.createdAt >= rangeStart && attempt.createdAt <= rangeEnd)
    .map(({ missedBuzzwords: _ignored, ...attempt }) => attempt)
  const previousAttempts: PremiumAttempt[] = normalized
    .filter((attempt) => attempt.createdAt >= previousStart && attempt.createdAt <= previousEnd)
    .map(({ missedBuzzwords: _ignored, ...attempt }) => attempt)

  const groupBySubject = (attempts: PremiumAttempt[]) => {
    const grouped = new Map<string, number[]>()
    for (const attempt of attempts) {
      const subject = rules.get(attempt.ruleId)?.subjectName ?? "Unassigned subject"
      const scores = grouped.get(subject) ?? []
      scores.push(attempt.score)
      grouped.set(subject, scores)
    }
    return grouped
  }

  const currentSubject = groupBySubject(currentAttempts)
  const previousSubject = groupBySubject(previousAttempts)
  const subjects: PremiumSubjectStat[] = [...currentSubject.entries()]
    .map(([name, scores]) => {
      const accuracy = averageNumber(scores) ?? 0
      const previousAccuracy = averageNumber(previousSubject.get(name) ?? [])
      return {
        name,
        attempts: scores.length,
        accuracy,
        previousAccuracy,
        change: previousAccuracy === null ? null : accuracy - previousAccuracy,
        confidence: scores.length >= params.confirmedSubjectAttempts ? ("confirmed" as const) : ("early" as const),
      }
    })
    .sort((a, b) => b.attempts - a.attempts || a.name.localeCompare(b.name))

  const ruleGroups = new Map<string, Array<(typeof normalized)[number]>>()
  for (const attempt of normalized) {
    if (attempt.createdAt < rangeStart || attempt.createdAt > rangeEnd) continue
    const items = ruleGroups.get(attempt.ruleId) ?? []
    items.push(attempt)
    ruleGroups.set(attempt.ruleId, items)
  }

  const weakRules: PremiumRulePriority[] = [...ruleGroups.entries()]
    .map(([ruleId, attempts]) => {
      const meta = rules.get(ruleId)
      const accuracy = averageNumber(attempts.map((attempt) => attempt.score)) ?? 0
      const missed = new Map<string, number>()
      for (const attempt of attempts) {
        for (const item of attempt.missedBuzzwords) {
          const normalizedItem = item.trim()
          if (normalizedItem) missed.set(normalizedItem, (missed.get(normalizedItem) ?? 0) + 1)
        }
      }
      const missedElement = [...missed.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return {
        title: meta?.title ?? "Untitled rule",
        subjectName: meta?.subjectName ?? "Unassigned subject",
        topicName: meta?.topicName ?? "General rules",
        attempts: attempts.length,
        accuracy,
        missedElement,
      }
    })
    .filter((rule) => rule.accuracy < params.weakRuleThreshold)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.title.localeCompare(b.title))
    .slice(0, 6)

  const modeGroups = new Map<string, number[]>()
  for (const attempt of currentAttempts) {
    const values = modeGroups.get(attempt.mode) ?? []
    values.push(attempt.score)
    modeGroups.set(attempt.mode, values)
  }
  const modes: PremiumModeStat[] = [...modeGroups.entries()]
    .map(([mode, scores]) => ({ mode, attempts: scores.length, accuracy: averageNumber(scores) ?? 0 }))
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)

  const activeDayKeys = new Set(currentAttempts.map((attempt) => dateKeyAtOffset(attempt.createdAt, params.timezoneOffset)))
  const countByDate = new Map<string, number>()
  for (const attempt of currentAttempts) {
    const key = dateKeyAtOffset(attempt.createdAt, params.timezoneOffset)
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1)
  }
  const heatmapStart = new Date(rangeEnd)
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - 34)
  const heatmap = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(heatmapStart)
    date.setUTCDate(date.getUTCDate() + index)
    return { date, count: countByDate.get(dateKeyAtOffset(date, params.timezoneOffset)) ?? 0 }
  })

  return {
    currentAttempts,
    previousAttempts,
    rules,
    subjects,
    weakRules,
    modes,
    activeDays: activeDayKeys.size,
    heatmap,
  } satisfies PremiumSupplement
}

function lineAndVolumeChart(points: ProgressHistoryPoint[]) {
  const width = 270
  const height = 104
  const left = 24
  const right = 8
  const top = 10
  const bottom = 17
  const usableWidth = width - left - right
  const usableHeight = height - top - bottom
  const maxAttempts = Math.max(1, ...points.map((point) => point.attempts))
  const dots = points.map((point, index) => ({
    x: left + (index / Math.max(1, points.length - 1)) * usableWidth,
    y: point.score === null ? null : top + (1 - point.score / 100) * usableHeight,
    score: point.score,
    attempts: point.attempts,
    label: point.shortLabel,
  }))
  const valid = dots.filter((dot): dot is typeof dot & { y: number; score: number } => dot.y !== null && dot.score !== null)
  const path = valid.map((dot, index) => `${index === 0 ? "M" : "L"} ${dot.x.toFixed(2)} ${dot.y.toFixed(2)}`).join(" ")

  return h(
    Svg,
    { width: "100%", height },
    ...[0, 25, 50, 75, 100].map((tick) => {
      const y = top + (1 - tick / 100) * usableHeight
      return h(
        React.Fragment,
        { key: `tick-${tick}` },
        h(Line, { x1: left, y1: y, x2: width - right, y2: y, stroke: REPORT_COLORS.borderSoft, strokeWidth: 0.5 }),
        h(Text, { x: 1, y: y + 2, style: { fontSize: 4.5, fill: "#8793aa" } }, `${tick}%`)
      )
    }),
    ...dots.map((dot, index) => {
      const barHeight = (dot.attempts / maxAttempts) * 34
      return h(Rect, {
        key: `volume-${index}`,
        x: dot.x - 13,
        y: height - bottom - barHeight,
        width: 26,
        height: barHeight,
        fill: REPORT_COLORS.violetSoft,
        opacity: 0.82,
        rx: 2,
      })
    }),
    path ? h(Path, { d: path, stroke: REPORT_COLORS.violetBright, strokeWidth: 1.6, fill: "none" }) : null,
    ...valid.map((dot, index) => h(Circle, {
      key: `point-${index}`,
      cx: dot.x,
      cy: dot.y,
      r: 2.2,
      fill: "#ffffff",
      stroke: REPORT_COLORS.violetBright,
      strokeWidth: 1.1,
    })),
    ...dots.map((dot, index) => h(Text, {
      key: `label-${index}`,
      x: dot.x - 16,
      y: height - 3,
      style: { fontSize: 4.4, fill: "#68758f" },
    }, dot.label))
  )
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function arcPath(cx: number, cy: number, radius: number, start: number, end: number) {
  const safeEnd = Math.min(end, start + 359.5)
  const startPoint = polarPoint(cx, cy, radius, safeEnd)
  const endPoint = polarPoint(cx, cy, radius, start)
  const large = safeEnd - start > 180 ? 1 : 0
  return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${large} 0 ${endPoint.x} ${endPoint.y}`
}

function scoreDonut(score: number | null) {
  const value = Math.max(0, Math.min(100, score ?? 0))
  return h(
    Svg,
    { width: 67, height: 67 },
    h(Circle, { cx: 33.5, cy: 33.5, r: 25, fill: "none", stroke: "#eef0f4", strokeWidth: 8 }),
    value > 0
      ? h(Path, {
          d: arcPath(33.5, 33.5, 25, 0, value * 3.6),
          fill: "none",
          stroke: REPORT_COLORS.violetBright,
          strokeWidth: 8,
          strokeLinecap: "round",
        })
      : null,
    h(Text, { x: 22, y: 34, style: { fontSize: 12, fill: REPORT_COLORS.navy, fontFamily: "Helvetica-Bold" } }, `${Math.round(value)}%`),
    h(Text, { x: 19, y: 44, style: { fontSize: 4.3, fill: "#73809a" } }, "Recorded accuracy")
  )
}

function distributionDonut(subjects: PremiumSubjectStat[]) {
  const colors = ["#5b21b6", "#3b82f6", "#ef4444", "#22b8a7", "#f59e0b", "#94a3b8"]
  const top = subjects.slice().sort((a, b) => b.attempts - a.attempts).slice(0, 5)
  const total = subjects.reduce((sum, subject) => sum + subject.attempts, 0)
  const topTotal = top.reduce((sum, subject) => sum + subject.attempts, 0)
  const segments = [...top]
  if (total - topTotal > 0) {
    segments.push({ name: "Other", attempts: total - topTotal, accuracy: 0, previousAccuracy: null, change: null, confidence: "early" })
  }
  let cursor = 0
  return h(
    View,
    { style: { flexDirection: "row", alignItems: "center" } },
    h(
      Svg,
      { width: 88, height: 88 },
      h(Circle, { cx: 44, cy: 44, r: 28, fill: "none", stroke: "#edf0f5", strokeWidth: 15 }),
      ...segments.map((segment, index) => {
        const start = cursor
        const share = total > 0 ? (segment.attempts / total) * 360 : 0
        cursor += share
        return share > 0
          ? h(Path, {
              key: segment.name,
              d: arcPath(44, 44, 28, start, cursor),
              fill: "none",
              stroke: colors[index % colors.length],
              strokeWidth: 15,
            })
          : null
      }),
      h(Text, { x: 34, y: 43, style: { fontSize: 10.5, fill: REPORT_COLORS.navy, fontFamily: "Helvetica-Bold" } }, String(total)),
      h(Text, { x: 29, y: 52, style: { fontSize: 4.2, fill: "#73809a" } }, "Scored attempts")
    ),
    h(
      View,
      { style: { flex: 1, paddingLeft: 6 } },
      ...segments.map((segment, index) => h(
        View,
        { style: premiumStyles.legendRow, key: segment.name },
        h(View, { style: [premiumStyles.legendDot, { backgroundColor: colors[index % colors.length] }] }),
        h(Text, { style: premiumStyles.legendName }, segment.name),
        h(Text, { style: premiumStyles.legendValue }, total > 0 ? `${Math.round((segment.attempts / total) * 100)}%` : "0%"),
        h(Text, { style: premiumStyles.legendCount }, `(${segment.attempts})`)
      ))
    )
  )
}

function heatColor(count: number, max: number) {
  if (count <= 0) return "#f1effb"
  const ratio = count / Math.max(1, max)
  if (ratio < 0.25) return "#ddd6fe"
  if (ratio < 0.5) return "#c4b5fd"
  if (ratio < 0.75) return "#8b5cf6"
  return "#5b21b6"
}

function activityHeatmap(items: PremiumSupplement["heatmap"]) {
  const max = Math.max(1, ...items.map((item) => item.count))
  const weeks = Array.from({ length: 5 }, (_, week) => items.slice(week * 7, week * 7 + 7))
  return h(
    View,
    { style: premiumStyles.heatmapWrap },
    h(
      View,
      { style: premiumStyles.heatmapDayLabels },
      ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => h(Text, { key: day, style: { fontSize: 4.2, color: "#68758f", height: 8.4, paddingTop: 2 } }, day))
    ),
    h(
      View,
      { style: premiumStyles.heatmapWeeks },
      ...weeks.map((week, weekIndex) => h(
        View,
        { style: premiumStyles.heatmapWeek, key: `week-${weekIndex}` },
        ...week.map((item) => h(View, {
          key: item.date.toISOString(),
          style: [premiumStyles.heatmapCell, { backgroundColor: heatColor(item.count, max) }],
        }))
      ))
    )
  )
}

function buildPremiumReferencePdf(
  data: ProgressHistoryAnalyticsData,
  identity: ReportIdentity,
  profile: { subscription_tier: string | null; exam_month: number | null; exam_year: number | null },
  supplement: PremiumSupplement,
  thresholds: { strongSubjectThreshold: number; weakSubjectThreshold: number; confirmedSubjectAttempts: number }
) {
  const currentAccuracy = data.summary.currentReadiness
  const change = data.summary.change
  const strongest = supplement.subjects
    .filter((subject) => subject.accuracy >= thresholds.strongSubjectThreshold)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 3)
  const weakest = supplement.subjects
    .filter((subject) => subject.accuracy < thresholds.weakSubjectThreshold)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 3)
  const mostPracticed = supplement.subjects.slice().sort((a, b) => b.attempts - a.attempts)[0] ?? null
  const bestMode = supplement.modes.find((mode) => mode.attempts >= 2) ?? supplement.modes[0] ?? null
  const weakestSubject = supplement.subjects.slice().sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)[0] ?? null
  const strongestSubject = supplement.subjects.slice().sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)[0] ?? null
  const recent = data.recentHistory.slice(0, 5)
  const membership = profile.subscription_tier
    ? profile.subscription_tier.replace(/(^|-)(\w)/g, (_match, _sep, char: string) => char.toUpperCase()).replace(/-/g, " ")
    : "Lexora member"
  const examLabel = profile.exam_month && profile.exam_year
    ? new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Date.UTC(profile.exam_year, profile.exam_month - 1, 1))) + ` ${profile.exam_year}`
    : "Not specified"

  const recommendations = supplement.weakRules.slice(0, 4).map((rule, index) => ({
    title: index === 0 ? `Review ${rule.title}` : rule.title,
    text: `${rule.subjectName} | ${rule.accuracy}% across ${rule.attempts} scored attempt${rule.attempts === 1 ? "" : "s"}${rule.missedElement ? ` | Revisit: ${rule.missedElement}` : ""}.`,
  }))
  if (recommendations.length === 0 && weakestSubject) {
    recommendations.push({
      title: `Reinforce ${weakestSubject.name}`,
      text: `${weakestSubject.accuracy}% recorded accuracy across ${weakestSubject.attempts} scored attempts. Complete a focused recall session and reassess after new activity.`,
    })
  }

  const insightItems = [
    strongestSubject
      ? { icon: "%", title: `Strongest measured subject: ${strongestSubject.name}`, text: `${strongestSubject.accuracy}% across ${strongestSubject.attempts} scored attempts${strongestSubject.confidence === "early" ? " (early data)" : ""}.` }
      : null,
    bestMode
      ? { icon: "R", title: `Best-performing mode: ${displayMode(bestMode.mode)}`, text: `${bestMode.accuracy}% average across ${bestMode.attempts} recorded attempts.` }
      : null,
    mostPracticed
      ? { icon: "D", title: `Most practiced subject: ${mostPracticed.name}`, text: `${mostPracticed.attempts} scored attempts in the selected period.` }
      : null,
    weakestSubject
      ? { icon: "!", title: `Primary measured constraint: ${weakestSubject.name}`, text: `${weakestSubject.accuracy}% recorded accuracy. Priority is based on actual scored performance, not a prediction.` }
      : null,
  ].filter(Boolean) as Array<{ icon: string; title: string; text: string }>

  const deltaText = change === null
    ? "No comparable preceding period"
    : `${change > 0 ? "+" : ""}${change} percentage points vs prior period`

  const watermark = h(Text, { style: premiumStyles.watermark, fixed: true }, "LEXORA - PRIVATE PERFORMANCE REPORT")

  return h(
    Document,
    {
      title: "Lexora Black Letter Law Performance Report",
      author: identity.name,
      subject: `Recorded Lexora practice performance for ${data.range.label}`,
      creator: "Lexora Prep",
      producer: "Lexora Progress Reporting",
    },
    h(
      Page,
      { size: "A4", style: premiumStyles.page },
      watermark,
      h(
        View,
        { style: premiumStyles.header },
        h(
          View,
          { style: premiumStyles.headerLeft },
          h(
            View,
            { style: premiumStyles.logoShield },
            h(Text, { style: premiumStyles.logoMark }, "L")
          ),
          h(
            View,
            null,
            h(Text, { style: premiumStyles.brandName }, "LEXORA PREP"),
            h(Text, { style: premiumStyles.eyebrow }, "STUDY REPORT"),
            h(Text, { style: premiumStyles.mainTitle }, "Your Performance Overview"),
            h(Text, { style: premiumStyles.mainSubtitle }, "Comprehensive analysis of your recorded Black Letter Law practice journey and progress.")
          )
        ),
        h(
          View,
          { style: premiumStyles.metadata },
          h(Text, { style: premiumStyles.metadataLabel }, "Report for"),
          h(Text, { style: premiumStyles.metadataValue }, identity.name),
          h(Text, { style: premiumStyles.metadataLabel }, "Report period"),
          h(Text, { style: premiumStyles.metadataValue }, data.range.label),
          h(Text, { style: premiumStyles.metadataLabel }, "Generated"),
          h(Text, { style: premiumStyles.metadataValue }, identity.generatedAtLabel),
          h(Text, { style: premiumStyles.metadataLabel }, "Membership"),
          h(Text, { style: premiumStyles.metadataValue }, membership),
          h(Text, { style: premiumStyles.metadataLabel }, "Exam date"),
          h(Text, { style: premiumStyles.metadataValue }, examLabel)
        )
      ),

      h(Text, { style: premiumStyles.sectionLabel }, "OVERVIEW"),
      h(
        View,
        { style: premiumStyles.overviewRow, wrap: false },
        h(View, { style: premiumStyles.kpi },
          h(Text, { style: premiumStyles.kpiIcon }, "R"),
          h(Text, { style: premiumStyles.kpiValue }, String(data.summary.attemptedRules)),
          h(Text, { style: premiumStyles.kpiLabel }, "Rules Practiced"),
          h(Text, { style: premiumStyles.kpiDelta }, `${data.summary.totalScoredAttempts} scored attempts`)
        ),
        h(View, { style: premiumStyles.kpi },
          h(Text, { style: premiumStyles.kpiIcon }, "%"),
          h(Text, { style: premiumStyles.kpiValue }, percent(currentAccuracy)),
          h(Text, { style: premiumStyles.kpiLabel }, "Recorded Accuracy"),
          h(Text, { style: [premiumStyles.kpiDelta, { color: change !== null && change < 0 ? REPORT_COLORS.red : REPORT_COLORS.green }] }, deltaText)
        ),
        h(View, { style: premiumStyles.kpi },
          h(Text, { style: premiumStyles.kpiIcon }, "#"),
          h(Text, { style: premiumStyles.kpiValue }, String(data.summary.totalScoredAttempts)),
          h(Text, { style: premiumStyles.kpiLabel }, "Scored Attempts"),
          h(Text, { style: premiumStyles.kpiDelta }, `${supplement.activeDays} active study day${supplement.activeDays === 1 ? "" : "s"}`)
        ),
        h(View, { style: premiumStyles.kpi },
          h(Text, { style: premiumStyles.kpiIcon }, "D"),
          h(Text, { style: premiumStyles.kpiValue }, String(supplement.activeDays)),
          h(Text, { style: premiumStyles.kpiLabel }, "Active Days"),
          h(Text, { style: premiumStyles.kpiDelta }, `${data.summary.activeDayStreak}-day current streak`)
        ),
        h(View, { style: premiumStyles.kpi },
          h(Text, { style: premiumStyles.kpiIcon }, "M"),
          h(Text, { style: premiumStyles.kpiValue }, String(data.summary.masteredRules)),
          h(Text, { style: premiumStyles.kpiLabel }, "Mastered Rules"),
          h(Text, { style: premiumStyles.kpiDelta }, "Based on saved mastery records")
        ),
        h(
          View,
          { style: premiumStyles.scoreCard },
          h(Text, { style: [premiumStyles.sectionLabel, { marginBottom: 1 }] }, "SCORE HIGHLIGHT"),
          scoreDonut(currentAccuracy)
        )
      ),

      h(
        View,
        { style: premiumStyles.twoCol, wrap: false },
        h(
          View,
          { style: [premiumStyles.panel, premiumStyles.wide] },
          h(Text, { style: premiumStyles.panelTitle }, "PERFORMANCE OVER TIME"),
          h(Text, { style: premiumStyles.panelSubtitle }, "Purple line: average recorded score | shaded bars: scored attempt volume"),
          lineAndVolumeChart(data.overallProgress)
        ),
        h(
          View,
          { style: [premiumStyles.panel, premiumStyles.narrow] },
          h(Text, { style: premiumStyles.panelTitle }, "PRACTICE DISTRIBUTION"),
          h(Text, { style: premiumStyles.panelSubtitle }, "Share of scored attempts by subject"),
          distributionDonut(supplement.subjects),
          h(Text, { style: { color: REPORT_COLORS.slate, marginTop: 3, lineHeight: 1.25 } }, weakestSubject
            ? `${weakestSubject.name} is the lowest measured subject at ${weakestSubject.accuracy}%.`
            : "More subject-level activity is required for a reliable distribution analysis.")
        )
      ),

      h(
        View,
        { style: premiumStyles.triple, wrap: false },
        h(
          View,
          { style: [premiumStyles.panel, premiumStyles.third] },
          h(Text, { style: premiumStyles.strengthTitle }, "STRENGTHS"),
          ...(strongest.length > 0
            ? strongest.map((subject) => h(
                View,
                { style: premiumStyles.skillRow, key: subject.name },
                h(View, { style: premiumStyles.skillTop }, h(Text, null, subject.name), h(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${subject.accuracy}%`)),
                h(View, { style: premiumStyles.barTrack }, h(View, { style: [premiumStyles.barFill, { width: `${subject.accuracy}%`, backgroundColor: REPORT_COLORS.green }] }))
              ))
            : [h(Text, { style: { color: REPORT_COLORS.slate }, key: "none" }, "No subject currently meets the configured strength threshold with sufficient evidence.")])
        ),
        h(
          View,
          { style: [premiumStyles.panel, premiumStyles.third] },
          h(Text, { style: premiumStyles.weaknessTitle }, "WEAKNESSES"),
          ...(weakest.length > 0
            ? weakest.map((subject) => h(
                View,
                { style: premiumStyles.skillRow, key: subject.name },
                h(View, { style: premiumStyles.skillTop }, h(Text, null, subject.name), h(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${subject.accuracy}%`)),
                h(View, { style: premiumStyles.barTrack }, h(View, { style: [premiumStyles.barFill, { width: `${Math.max(4, subject.accuracy)}%`, backgroundColor: REPORT_COLORS.red }] }))
              ))
            : [h(Text, { style: { color: REPORT_COLORS.slate }, key: "none" }, "No subject is currently below the configured weakness threshold.")])
        ),
        h(
          View,
          { style: [premiumStyles.panel, premiumStyles.third] },
          h(Text, { style: premiumStyles.panelTitle }, "TIMELINE ANALYSIS"),
          h(Text, { style: premiumStyles.panelSubtitle }, "Recorded scored activity during the latest five weeks"),
          activityHeatmap(supplement.heatmap),
          h(View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 5 } },
            h(Text, { style: { color: REPORT_COLORS.slate, fontSize: 4.5, marginRight: 4 } }, "Less active"),
            ...["#f1effb", "#ddd6fe", "#c4b5fd", "#8b5cf6", "#5b21b6"].map((color) => h(View, { key: color, style: { width: 10, height: 4, backgroundColor: color, marginLeft: 1 } })),
            h(Text, { style: { color: REPORT_COLORS.slate, fontSize: 4.5, marginLeft: 4 } }, "More active")
          )
        )
      ),

      h(
        View,
        { style: premiumStyles.splitPanel, wrap: false },
        h(
          View,
          { style: premiumStyles.halfPanel },
          h(Text, { style: premiumStyles.panelTitle }, "PROGRESS HISTORY"),
          h(View, { style: premiumStyles.historyHeader },
            h(Text, { style: premiumStyles.historyActivity }, "Activity"),
            h(Text, { style: premiumStyles.historyScore }, "Score"),
            h(Text, { style: premiumStyles.historyDate }, "Date")
          ),
          ...recent.map((event) => h(
            View,
            { style: premiumStyles.historyRow, key: event.id },
            h(Text, { style: premiumStyles.historyActivity }, event.detail.length > 58 ? `${event.detail.slice(0, 56)}...` : event.detail),
            h(Text, { style: premiumStyles.historyScore }, event.score === null ? "—" : `${event.score}%`),
            h(Text, { style: premiumStyles.historyDate }, formatReportDate(event.timestamp))
          ))
        ),
        h(
          View,
          { style: premiumStyles.halfPanel },
          h(Text, { style: premiumStyles.panelTitle }, "LEARNING INSIGHTS"),
          ...insightItems.slice(0, 4).map((item) => h(
            View,
            { style: premiumStyles.insightRow, key: item.title },
            h(Text, { style: premiumStyles.insightIcon }, item.icon),
            h(View, { style: premiumStyles.insightTextWrap },
              h(Text, { style: premiumStyles.insightTitle }, item.title),
              h(Text, { style: premiumStyles.insightText }, item.text)
            )
          ))
        )
      ),

      h(
        View,
        { style: premiumStyles.splitPanel, wrap: false },
        h(
          View,
          { style: premiumStyles.halfPanel },
          h(Text, { style: premiumStyles.panelTitle }, "RECOMMENDATIONS"),
          ...(recommendations.length > 0
            ? recommendations.map((item, index) => h(
                View,
                { style: premiumStyles.recommendationRow, key: `${item.title}-${index}` },
                h(Text, { style: premiumStyles.recommendationIcon }, index % 2 === 0 ? "R" : "T"),
                h(View, { style: premiumStyles.recommendationBody },
                  h(Text, { style: premiumStyles.recommendationTitle }, item.title),
                  h(Text, { style: premiumStyles.recommendationText }, item.text)
                ),
                h(Text, { style: premiumStyles.recommendationArrow }, ">")
              ))
            : [h(Text, { style: { color: REPORT_COLORS.slate }, key: "none" }, "No priority recommendation is available because the current period does not contain a measured weak rule.")])
        ),
        h(
          View,
          { style: premiumStyles.halfPanel },
          h(Text, { style: premiumStyles.panelTitle }, "NEXT STEPS"),
          h(Text, { style: premiumStyles.quote }, "Small, consistent actions every day lead to exceptional results."),
          h(Text, { style: premiumStyles.nextStep }, weakestSubject
            ? `${weakestSubject.name} is the lowest measured subject in this report. Open Rule Training and use the current weak-focus queue for the live recommended rule.`
            : "Continue balanced practice across measured subjects and reassess after additional scored activity is recorded."),
          h(View, { style: { marginTop: 8, borderTopWidth: 0.5, borderTopColor: REPORT_COLORS.border, paddingTop: 6 } },
            h(Text, { style: { color: REPORT_COLORS.violet, fontFamily: "Helvetica-Bold", fontSize: 7 } }, "LEXORA COACHING NOTE"),
            h(Text, { style: { color: REPORT_COLORS.slate, marginTop: 2, lineHeight: 1.3 } }, `This report summarizes recorded Lexora practice performance. It does not predict bar-exam passage or an official examination score. Report ID: ${identity.reportId}`)
          )
        )
      ),

      h(
        View,
        { style: premiumStyles.footerBand, fixed: true },
        h(Text, null, "LEXORA PREP"),
        h(Text, null, `${identity.name} | ${identity.email} | ${identity.generatedAtLabel}`),
        h(Text, null, "Your Journey. Your Progress.")
      )
    )
  )
}



const exactReportStyles = StyleSheet.create({
  page: {
    width: 612,
    height: 918,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    color: "#11163c",
    fontFamily: "Helvetica",
    fontSize: 5.7,
  },
  header: {
    height: 94,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1.2,
    borderBottomColor: "#5b21b6",
    paddingBottom: 8,
    marginBottom: 8,
  },
  logoArea: { width: 104, alignItems: "center", paddingTop: 1 },
  logoImage: { width: 56, height: 56, objectFit: "contain" },
  logoWord: { marginTop: 2, fontSize: 9.2, letterSpacing: 2.3, color: "#11163c" },
  logoPrep: { marginTop: 0.5, fontSize: 5.2, letterSpacing: 4.0, color: "#11163c" },
  titleArea: { width: 338, paddingTop: 7, paddingLeft: 4 },
  eyebrow: { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: "#5b21b6", letterSpacing: 0.9 },
  title: { marginTop: 6, fontSize: 19.2, fontFamily: "Helvetica-Bold", color: "#11163c" },
  subtitle: { marginTop: 4, fontSize: 7.2, color: "#53627d" },
  meta: { width: 134, minHeight: 76, borderLeftWidth: 0.55, borderLeftColor: "#e2e5ed", paddingLeft: 12, paddingTop: 1 },
  metaLabel: { fontSize: 5, color: "#8792a7", marginTop: 2 },
  metaValue: { fontSize: 5.8, color: "#11163c", fontFamily: "Helvetica-Bold", marginTop: 0.4 },
  sectionLabel: { fontSize: 6.2, color: "#4c1d95", fontFamily: "Helvetica-Bold", letterSpacing: 0.4, marginBottom: 6 },
  overviewRow: { height: 100, flexDirection: "row", gap: 7, marginBottom: 8 },
  kpi: { flexGrow: 1, flexBasis: 0, borderWidth: 0.55, borderColor: "#dfe3ed", paddingHorizontal: 5, paddingVertical: 7, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontSize: 14.8, fontFamily: "Helvetica-Bold", color: "#11163c", marginTop: 3 },
  kpiLabel: { fontSize: 5.8, color: "#11163c", marginTop: 2, textAlign: "center" },
  kpiDelta: { fontSize: 5.1, color: "#0f9f6e", marginTop: 4, textAlign: "center", lineHeight: 1.2 },
  scoreCard: { width: 142, borderWidth: 0.55, borderColor: "#dfe3ed", paddingHorizontal: 7, paddingVertical: 6, alignItems: "center" },
  scoreLabel: { fontSize: 6.1, color: "#4c1d95", fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  panel: { borderWidth: 0.55, borderColor: "#dfe3ed", backgroundColor: "#ffffff", padding: 8 },
  performancePanel: { width: 326, height: 164 },
  distributionPanel: { width: 242, height: 164 },
  triplePanel: { flexGrow: 1, flexBasis: 0, height: 126 },
  halfPanel: { flexGrow: 1, flexBasis: 0, height: 174 },
  bottomPanel: { flexGrow: 1, flexBasis: 0, height: 148 },
  panelTitle: { fontSize: 7.1, color: "#11163c", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  panelSubtitle: { fontSize: 5.2, color: "#64748b", marginBottom: 5 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3.4 },
  legendDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  legendName: { width: "56%", color: "#11163c" },
  legendValue: { width: "19%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  legendCount: { width: "25%", textAlign: "right", color: "#64748b" },
  skillTitleStrong: { fontSize: 6.4, color: "#0f9f6e", fontFamily: "Helvetica-Bold", marginBottom: 5 },
  skillTitleWeak: { fontSize: 6.4, color: "#e13d4f", fontFamily: "Helvetica-Bold", marginBottom: 5 },
  skillRow: { marginBottom: 6 },
  skillTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  barTrack: { height: 3, backgroundColor: "#edf0f5" },
  barFill: { height: 3 },
  historyHeader: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dfe3ed", paddingBottom: 3 },
  historyRow: { flexDirection: "row", borderBottomWidth: 0.35, borderBottomColor: "#eef1f6", paddingVertical: 3.7 },
  historyActivity: { width: "58%" },
  historyScore: { width: "16%", textAlign: "right" },
  historyDate: { width: "26%", textAlign: "right", color: "#64748b" },
  insightRow: { flexDirection: "row", marginBottom: 7 },
  insightIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center", marginRight: 7 },
  insightTextWrap: { width: "84%" },
  insightTitle: { fontSize: 5.9, color: "#11163c", fontFamily: "Helvetica-Bold" },
  insightText: { fontSize: 5.4, color: "#53627d", lineHeight: 1.25, marginTop: 1.2 },
  recommendationRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.35, borderBottomColor: "#eef1f6", paddingVertical: 5 },
  recommendationIconWrap: { width: 22, alignItems: "center", justifyContent: "center" },
  recommendationBody: { width: "75%", paddingLeft: 4 },
  recommendationArrow: { width: "15%", textAlign: "right", color: "#64748b", fontSize: 8 },
  recommendationTitle: { fontSize: 5.9, fontFamily: "Helvetica-Bold", color: "#11163c" },
  recommendationText: { fontSize: 5.2, color: "#53627d", marginTop: 1.2, lineHeight: 1.2 },
  quote: { fontSize: 7.2, color: "#53627d", lineHeight: 1.35, marginTop: 6 },
  nextStep: { fontSize: 5.5, color: "#11163c", lineHeight: 1.35, marginTop: 7 },
  disclaimer: { fontSize: 4.8, color: "#8792a7", lineHeight: 1.25, marginTop: 8 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, backgroundColor: "#4c1d95", color: "#ffffff", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, fontSize: 4.8 },
  watermark: { position: "absolute", top: "43%", left: "17%", width: "66%", textAlign: "center", color: "#5b21b6", opacity: 0.014, fontSize: 29, transform: "rotate(-28deg)" },
})

function exactLogoDataUri() {
  try {
    const bytes = readFileSync(join(process.cwd(), "public", "lexora-icon-transparent.png"))
    return `data:image/png;base64,${bytes.toString("base64")}`
  } catch {
    return null
  }
}

function exactIcon(kind: "book" | "target" | "clipboard" | "trophy" | "flame" | "trend" | "calendar" | "alert", color = "#5b21b6", size = 22) {
  if (kind === "target") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Circle, { cx: 12, cy: 12, r: 8, fill: "none", stroke: color, strokeWidth: 1.7 }),
      h(Circle, { cx: 12, cy: 12, r: 4.4, fill: "none", stroke: color, strokeWidth: 1.7 }),
      h(Circle, { cx: 12, cy: 12, r: 1.6, fill: color }),
      h(Line, { x1: 15.5, y1: 8.5, x2: 21, y2: 3, stroke: color, strokeWidth: 1.7 }),
      h(Path, { d: "M17.7 3 H21 V6.3", fill: "none", stroke: color, strokeWidth: 1.7 })
    )
  }
  if (kind === "clipboard") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Rect, { x: 5, y: 4.5, width: 14, height: 16, rx: 2, fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Rect, { x: 8.5, y: 2.5, width: 7, height: 4, rx: 1.5, fill: "#ffffff", stroke: color, strokeWidth: 1.4 }),
      h(Line, { x1: 8, y1: 10, x2: 16, y2: 10, stroke: color, strokeWidth: 1.4 }),
      h(Line, { x1: 8, y1: 14, x2: 16, y2: 14, stroke: color, strokeWidth: 1.4 }),
      h(Line, { x1: 8, y1: 18, x2: 13.5, y2: 18, stroke: color, strokeWidth: 1.4 })
    )
  }
  if (kind === "trophy") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Path, { d: "M8 4 H16 V9 C16 12 14.2 14 12 14 C9.8 14 8 12 8 9 Z", fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Path, { d: "M8 6 H4 V8 C4 11 6 12 8 12", fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Path, { d: "M16 6 H20 V8 C20 11 18 12 16 12", fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Line, { x1: 12, y1: 14, x2: 12, y2: 18, stroke: color, strokeWidth: 1.6 }),
      h(Line, { x1: 8, y1: 20, x2: 16, y2: 20, stroke: color, strokeWidth: 1.6 })
    )
  }
  if (kind === "flame") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Path, { d: "M13.5 2 C14.8 7 19 8.5 19 14 C19 18.2 16 21 12 21 C8 21 5 18.2 5 14.2 C5 10.8 7 8.6 9.8 6.2 C9.7 9 11.2 10.2 12.3 11.2 C13.1 8.2 12.4 5.2 13.5 2 Z", fill: "none", stroke: color, strokeWidth: 1.6 })
    )
  }
  if (kind === "trend") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Path, { d: "M4 17 L9 12 L13 15 L20 7", fill: "none", stroke: color, strokeWidth: 1.8 }),
      h(Path, { d: "M15.5 7 H20 V11.5", fill: "none", stroke: color, strokeWidth: 1.8 })
    )
  }
  if (kind === "calendar") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Rect, { x: 4, y: 5.5, width: 16, height: 14.5, rx: 2, fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Line, { x1: 4, y1: 9, x2: 20, y2: 9, stroke: color, strokeWidth: 1.5 }),
      h(Line, { x1: 8, y1: 3.5, x2: 8, y2: 7, stroke: color, strokeWidth: 1.6 }),
      h(Line, { x1: 16, y1: 3.5, x2: 16, y2: 7, stroke: color, strokeWidth: 1.6 })
    )
  }
  if (kind === "alert") {
    return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
      h(Path, { d: "M12 3 L21 20 H3 Z", fill: "none", stroke: color, strokeWidth: 1.6 }),
      h(Line, { x1: 12, y1: 8, x2: 12, y2: 14, stroke: color, strokeWidth: 1.6 }),
      h(Circle, { cx: 12, cy: 17, r: 1, fill: color })
    )
  }
  return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" },
    h(Path, { d: "M3.5 5.5 C7 4.5 9.5 5 12 7 V20 C9.4 18 6.6 17.8 3.5 18.7 Z", fill: "none", stroke: color, strokeWidth: 1.6 }),
    h(Path, { d: "M20.5 5.5 C17 4.5 14.5 5 12 7 V20 C14.6 18 17.4 17.8 20.5 18.7 Z", fill: "none", stroke: color, strokeWidth: 1.6 })
  )
}

function exactKpi(icon: React.ReactNode, value: string, label: string, delta: string, key: string, deltaColor = "#0f9f6e") {
  return h(View, { style: exactReportStyles.kpi, key },
    icon,
    h(Text, { style: exactReportStyles.kpiValue }, value),
    h(Text, { style: exactReportStyles.kpiLabel }, label),
    h(Text, { style: [exactReportStyles.kpiDelta, { color: deltaColor }] }, delta)
  )
}

function exactScoreRing(score: number | null) {
  const value = Math.max(0, Math.min(100, score ?? 0))
  const cx = 34
  const cy = 34
  const r = 24
  const start = 0
  const end = value * 3.6
  return h(Svg, { width: 70, height: 70, viewBox: "0 0 68 68" },
    h(Circle, { cx, cy, r, fill: "none", stroke: "#e7e9ef", strokeWidth: 8 }),
    value > 0 ? h(Path, { d: arcPath(cx, cy, r, start, end), fill: "none", stroke: "#5b21b6", strokeWidth: 8 }) : null,
    h(Text, { x: 22, y: 33, style: { fontSize: 14, fill: "#11163c", fontFamily: "Helvetica-Bold" } }, score === null ? "--" : `${Math.round(score)}%`),
    h(Text, { x: 21, y: 42, style: { fontSize: 4.8, fill: "#64748b" } }, "Recorded score")
  )
}

function exactPerformanceChart(points: ProgressHistoryPoint[]) {
  const width = 304
  const height = 120
  const left = 24
  const right = 10
  const top = 10
  const bottom = 18
  const usableW = width - left - right
  const usableH = height - top - bottom
  const maxAttempts = Math.max(1, ...points.map((point) => point.attempts))
  const pts = points.map((point, index) => ({
    x: left + (index / Math.max(1, points.length - 1)) * usableW,
    y: point.score === null ? null : top + (1 - point.score / 100) * usableH,
    score: point.score,
    attempts: point.attempts,
    label: point.shortLabel,
  }))
  const valid = pts.filter((point): point is typeof point & { y: number; score: number } => point.y !== null && point.score !== null)
  const path = valid.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")
  return h(Svg, { width: "100%", height },
    ...[0,25,50,75,100].map((tick) => {
      const y = top + (1 - tick / 100) * usableH
      return h(React.Fragment, { key: `g-${tick}` },
        h(Line, { x1: left, y1: y, x2: width - right, y2: y, stroke: "#edf0f5", strokeWidth: 0.55 }),
        h(Text, { x: 0, y: y + 2, style: { fontSize: 4.4, fill: "#8792a7" } }, `${tick}%`)
      )
    }),
    ...pts.map((point, index) => {
      const barHeight = (point.attempts / maxAttempts) * 40
      return h(Rect, { key: `b-${index}`, x: point.x - 16, y: height - bottom - barHeight, width: 32, height: barHeight, fill: "#ddd6fe", opacity: 0.75, rx: 2 })
    }),
    path ? h(Path, { d: path, fill: "none", stroke: "#5b21b6", strokeWidth: 1.7 }) : null,
    ...valid.map((point, index) => h(Circle, { key: `p-${index}`, cx: point.x, cy: point.y, r: 2.3, fill: "#ffffff", stroke: "#5b21b6", strokeWidth: 1.2 })),
    ...pts.map((point, index) => h(Text, { key: `l-${index}`, x: point.x - 15, y: height - 4, style: { fontSize: 4.2, fill: "#64748b" } }, point.label))
  )
}

function exactDistribution(subjects: PremiumSubjectStat[]) {
  const top = subjects.filter((item) => item.attempts > 0).slice(0, 6)
  const total = top.reduce((sum, item) => sum + item.attempts, 0)
  const colors = ["#5b21b6", "#3b82f6", "#ef4444", "#22b8a7", "#f59e0b", "#cbd5e1"]
  let start = 0
  const arcs = top.map((item, index) => {
    const span = total > 0 ? (item.attempts / total) * 359.6 : 0
    const node = h(Path, { key: item.name, d: arcPath(34, 34, 23, start, start + span), fill: "none", stroke: colors[index % colors.length], strokeWidth: 12 })
    start += span
    return node
  })
  return h(View, { style: { flexDirection: "row", alignItems: "center" } },
    h(Svg, { width: 82, height: 82, viewBox: "0 0 68 68" },
      h(Circle, { cx: 34, cy: 34, r: 23, fill: "none", stroke: "#edf0f5", strokeWidth: 12 }),
      ...arcs,
      h(Text, { x: 25, y: 32, style: { fontSize: 11, fill: "#11163c", fontFamily: "Helvetica-Bold" } }, String(total)),
      h(Text, { x: 20, y: 40, style: { fontSize: 4.2, fill: "#64748b" } }, "Scored attempts")
    ),
    h(View, { style: { flexGrow: 1, paddingLeft: 6 } },
      ...top.map((item, index) => h(View, { style: exactReportStyles.legendRow, key: item.name },
        h(View, { style: [exactReportStyles.legendDot, { backgroundColor: colors[index % colors.length] }] }),
        h(Text, { style: exactReportStyles.legendName }, item.name),
        h(Text, { style: exactReportStyles.legendValue }, total > 0 ? `${Math.round((item.attempts / total) * 100)}%` : "0%"),
        h(Text, { style: exactReportStyles.legendCount }, `(${item.attempts})`)
      ))
    )
  )
}

function exactHeatmap(items: PremiumSupplement["heatmap"]) {
  const max = Math.max(1, ...items.map((item) => item.count))
  const byWeek = Array.from({ length: 5 }, (_, week) => items.slice(week * 7, week * 7 + 7))
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) =>
    h(Text, { key: day, style: { fontSize: 4.2, color: "#64748b", height: 9 } }, day)
  )
  const weeks = byWeek.map((week, weekIndex) => {
    const cells = week.map((item, dayIndex) =>
      h(View, {
        key: `${weekIndex}-${dayIndex}`,
        style: {
          width: 10,
          height: 8,
          backgroundColor: heatColor(item.count, max),
          borderRadius: 1.2,
        },
      })
    )
    return h(View, { key: `w-${weekIndex}`, style: { gap: 2 } }, ...cells)
  })
  return h(
    View,
    { style: { flexDirection: "row", alignItems: "flex-start", marginTop: 2 } },
    h(View, { style: { width: 18, gap: 2 } }, ...dayLabels),
    h(View, { style: { flexDirection: "row", gap: 2 } }, ...weeks)
  )
}

function exactMembership(value: string | null) {
  if (!value) return "Lexora member"
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildExactReferencePdfV2(
  data: ProgressHistoryAnalyticsData,
  identity: ReportIdentity,
  profile: { subscription_tier: string | null; exam_month: string | null; exam_year: number | null },
  supplement: PremiumSupplement,
  thresholds: { strongSubjectThreshold: number; weakSubjectThreshold: number; confirmedSubjectAttempts: number }
) {
  const logo = exactLogoDataUri()
  const currentAccuracy = data.summary.currentReadiness
  const change = data.summary.change
  const subjectsByScore = supplement.subjects.filter((item) => item.attempts > 0).slice().sort((a,b) => b.accuracy - a.accuracy)
  const strongest = subjectsByScore.filter((item) => item.accuracy >= thresholds.strongSubjectThreshold).slice(0,3)
  const weakest = subjectsByScore.filter((item) => item.accuracy < thresholds.weakSubjectThreshold).slice().sort((a,b) => a.accuracy - b.accuracy).slice(0,3)
  const mostPracticed = supplement.subjects.slice().sort((a,b) => b.attempts - a.attempts)[0] ?? null
  const bestMode = supplement.modes[0] ?? null
  const strongestMeasured = subjectsByScore[0] ?? null
  const weakestMeasured = subjectsByScore.slice().sort((a,b) => a.accuracy - b.accuracy)[0] ?? null
  const recent = data.recentHistory.slice(0,5)
  const recommendations = supplement.weakRules.slice(0,4)
  const nextRule = recommendations[0] ?? null
  const deltaText = change === null ? "No prior comparison" : `${change > 0 ? "+" : ""}${change} percentage points vs prior period`
  const deltaColor = change !== null && change < 0 ? "#e13d4f" : "#0f9f6e"
  const examDate = profile.exam_month && profile.exam_year ? `${profile.exam_month} ${profile.exam_year}` : "Not set"
  const reportPeriod = data.range.label

  const insightItems = [
    strongestMeasured ? { icon: "target" as const, title: `Strongest measured subject: ${strongestMeasured.name}`, text: `${strongestMeasured.accuracy}% across ${strongestMeasured.attempts} scored attempt${strongestMeasured.attempts === 1 ? "" : "s"}${strongestMeasured.confidence === "early" ? " (early data)" : ""}.` } : null,
    bestMode ? { icon: "book" as const, title: `Best-performing mode: ${displayMode(bestMode.mode)}`, text: `${bestMode.accuracy}% average across ${bestMode.attempts} recorded attempt${bestMode.attempts === 1 ? "" : "s"}.` } : null,
    mostPracticed ? { icon: "calendar" as const, title: `Most practiced subject: ${mostPracticed.name}`, text: `${mostPracticed.attempts} scored attempts in the selected period.` } : null,
    weakestMeasured ? { icon: "alert" as const, title: `Primary measured constraint: ${weakestMeasured.name}`, text: `${weakestMeasured.accuracy}% recorded accuracy. Priority is based on actual scored performance, not a prediction.` } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return h(Document, {
    title: `Lexora Progress Report - ${reportPeriod}`,
    author: identity.name,
    subject: "Recorded Black Letter Law practice performance",
    creator: "Lexora Progress Analytics",
    producer: "Lexora",
    keywords: `Lexora, progress report, ${identity.reportId}`,
    language: "en-US",
  },
    h(Page, { size: [612, 918], style: exactReportStyles.page },
      h(Text, { style: exactReportStyles.watermark, fixed: true }, "LEXORA PRIVATE REPORT"),
      h(View, { style: exactReportStyles.header, wrap: false },
        h(View, { style: exactReportStyles.logoArea },
          logo ? h(Image, { src: logo, style: exactReportStyles.logoImage }) : h(Text, { style: { fontSize: 28, color: "#5b21b6" } }, "L"),
          h(Text, { style: exactReportStyles.logoWord }, "LEXORA"),
          h(Text, { style: exactReportStyles.logoPrep }, "PREP")
        ),
        h(View, { style: exactReportStyles.titleArea },
          h(Text, { style: exactReportStyles.eyebrow }, "STUDY REPORT"),
          h(Text, { style: exactReportStyles.title }, "Your Performance Overview"),
          h(Text, { style: exactReportStyles.subtitle }, "Comprehensive analysis of your recorded Black Letter Law practice journey and progress.")
        ),
        h(View, { style: exactReportStyles.meta },
          h(Text, { style: exactReportStyles.metaLabel }, "Report for"), h(Text, { style: exactReportStyles.metaValue }, identity.name),
          h(Text, { style: exactReportStyles.metaLabel }, "Report period"), h(Text, { style: exactReportStyles.metaValue }, reportPeriod),
          h(Text, { style: exactReportStyles.metaLabel }, "Generated on"), h(Text, { style: exactReportStyles.metaValue }, identity.generatedAtLabel),
          h(Text, { style: exactReportStyles.metaLabel }, "Membership"), h(Text, { style: exactReportStyles.metaValue }, exactMembership(profile.subscription_tier)),
          h(Text, { style: exactReportStyles.metaLabel }, "Exam date"), h(Text, { style: exactReportStyles.metaValue }, examDate)
        )
      ),

      h(Text, { style: exactReportStyles.sectionLabel }, "OVERVIEW"),
      h(View, { style: exactReportStyles.overviewRow, wrap: false },
        exactKpi(exactIcon("book", "#5b21b6", 23), String(data.summary.attemptedRules), "Rules Practiced", `${data.summary.totalScoredAttempts} scored attempts`, "rules"),
        exactKpi(exactIcon("target", "#2563eb", 23), currentAccuracy === null ? "--" : `${currentAccuracy}%`, "Recorded Accuracy", deltaText, "accuracy", deltaColor),
        exactKpi(exactIcon("clipboard", "#2563eb", 23), String(data.summary.totalScoredAttempts), "Scored Attempts", `${supplement.activeDays} active study day${supplement.activeDays === 1 ? "" : "s"}`, "attempts"),
        exactKpi(exactIcon("trophy", "#5b21b6", 23), String(data.summary.masteredRules), "Mastered Rules", "Based on saved mastery records", "mastery"),
        exactKpi(exactIcon("flame", "#f59e0b", 23), String(data.summary.activeDayStreak), "Day Streak", supplement.activeDays > 0 ? `${supplement.activeDays} active days this period` : "No active days recorded", "streak", "#f59e0b"),
        h(View, { style: exactReportStyles.scoreCard }, h(Text, { style: exactReportStyles.scoreLabel }, "SCORE HIGHLIGHT"), exactScoreRing(currentAccuracy), h(Text, { style: { fontSize: 5.1, color: deltaColor, textAlign: "center", marginTop: 1 } }, deltaText))
      ),

      h(View, { style: exactReportStyles.row, wrap: false },
        h(View, { style: [exactReportStyles.panel, exactReportStyles.performancePanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "PERFORMANCE OVER TIME"),
          h(Text, { style: exactReportStyles.panelSubtitle }, "Purple line: recorded accuracy | shaded bars: scored attempt volume"),
          exactPerformanceChart(data.overallProgress)
        ),
        h(View, { style: [exactReportStyles.panel, exactReportStyles.distributionPanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "RULE ANALYTICS"),
          h(Text, { style: exactReportStyles.panelSubtitle }, "Share of scored attempts by subject"),
          exactDistribution(supplement.subjects),
          h(Text, { style: { color: "#53627d", marginTop: 4, lineHeight: 1.25 } }, weakestMeasured ? `${weakestMeasured.name} is currently the lowest measured subject at ${weakestMeasured.accuracy}%. Use the live weak-focus queue in Rule Training for the current rule recommendation.` : "More recorded subject activity is required before a priority can be identified.")
        )
      ),

      h(View, { style: exactReportStyles.row, wrap: false },
        h(View, { style: [exactReportStyles.panel, exactReportStyles.triplePanel] },
          h(Text, { style: exactReportStyles.skillTitleStrong }, "STRENGTHS"),
          ...(strongest.length ? strongest.map((subject) => h(View, { style: exactReportStyles.skillRow, key: subject.name },
            h(View, { style: exactReportStyles.skillTop }, h(Text, null, subject.name), h(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${subject.accuracy}%`)),
            h(View, { style: exactReportStyles.barTrack }, h(View, { style: [exactReportStyles.barFill, { width: `${subject.accuracy}%`, backgroundColor: "#0f9f6e" }] }))
          )) : [h(Text, { key: "none", style: { color: "#64748b", lineHeight: 1.3 } }, "No subject currently meets the configured strength threshold with enough evidence.")]),
          strongest.length ? h(Text, { style: { color: "#5b21b6", marginTop: 3 } }, "View all strengths ->") : null
        ),
        h(View, { style: [exactReportStyles.panel, exactReportStyles.triplePanel] },
          h(Text, { style: exactReportStyles.skillTitleWeak }, "WEAKNESSES"),
          ...(weakest.length ? weakest.map((subject) => h(View, { style: exactReportStyles.skillRow, key: subject.name },
            h(View, { style: exactReportStyles.skillTop }, h(Text, null, subject.name), h(Text, { style: { fontFamily: "Helvetica-Bold" } }, `${subject.accuracy}%`)),
            h(View, { style: exactReportStyles.barTrack }, h(View, { style: [exactReportStyles.barFill, { width: `${Math.max(4, subject.accuracy)}%`, backgroundColor: "#e13d4f" }] }))
          )) : [h(Text, { key: "none", style: { color: "#64748b", lineHeight: 1.3 } }, "No subject is currently below the configured weakness threshold.")]),
          weakest.length ? h(Text, { style: { color: "#5b21b6", marginTop: 3 } }, "View all weaknesses ->") : null
        ),
        h(View, { style: [exactReportStyles.panel, exactReportStyles.triplePanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "TIMELINE ANALYSIS"),
          h(Text, { style: exactReportStyles.panelSubtitle }, "Recorded activity during the latest five weeks"),
          exactHeatmap(supplement.heatmap),
          h(View, { style: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 5 } },
            h(Text, { style: { fontSize: 4.2, color: "#64748b", marginRight: 3 } }, "Less active"),
            ...["#f1effb", "#ddd6fe", "#c4b5fd", "#8b5cf6", "#5b21b6"].map((color) => h(View, { key: color, style: { width: 9, height: 4, backgroundColor: color, marginLeft: 1 } })),
            h(Text, { style: { fontSize: 4.2, color: "#64748b", marginLeft: 3 } }, "More active")
          )
        )
      ),

      h(View, { style: exactReportStyles.row, wrap: false },
        h(View, { style: [exactReportStyles.panel, exactReportStyles.halfPanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "PROGRESS HISTORY"),
          h(View, { style: exactReportStyles.historyHeader }, h(Text, { style: exactReportStyles.historyActivity }, "Activity"), h(Text, { style: exactReportStyles.historyScore }, "Score"), h(Text, { style: exactReportStyles.historyDate }, "Date")),
          ...recent.map((event) => h(View, { style: exactReportStyles.historyRow, key: event.id },
            h(Text, { style: exactReportStyles.historyActivity }, event.detail.length > 64 ? `${event.detail.slice(0, 61)}...` : event.detail),
            h(Text, { style: exactReportStyles.historyScore }, event.score === null ? "--" : `${event.score}%`),
            h(Text, { style: exactReportStyles.historyDate }, formatReportDate(event.timestamp))
          )),
          h(Text, { style: { color: "#5b21b6", marginTop: 5 } }, "Full activity history is available in the Excel export.")
        ),
        h(View, { style: [exactReportStyles.panel, exactReportStyles.halfPanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "LEARNING INSIGHTS"),
          ...insightItems.map((item) => h(View, { style: exactReportStyles.insightRow, key: item.title },
            h(View, { style: exactReportStyles.insightIconWrap }, exactIcon(item.icon, "#5b21b6", 14)),
            h(View, { style: exactReportStyles.insightTextWrap }, h(Text, { style: exactReportStyles.insightTitle }, item.title), h(Text, { style: exactReportStyles.insightText }, item.text))
          ))
        )
      ),

      h(View, { style: exactReportStyles.row, wrap: false },
        h(View, { style: [exactReportStyles.panel, exactReportStyles.bottomPanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "RECOMMENDATIONS"),
          ...(recommendations.length ? recommendations.map((item, index) => h(View, { style: exactReportStyles.recommendationRow, key: `${item.title}-${index}` },
            h(View, { style: exactReportStyles.recommendationIconWrap }, exactIcon(index % 2 === 0 ? "book" : "target", "#5b21b6", 14)),
            h(View, { style: exactReportStyles.recommendationBody }, h(Text, { style: exactReportStyles.recommendationTitle }, item.title), h(Text, { style: exactReportStyles.recommendationText }, `${item.subjectName} | ${item.accuracy}% across ${item.attempts} scored attempt${item.attempts === 1 ? "" : "s"}${item.missedElement ? ` | Revisit: ${item.missedElement}.` : "."}`)),
            h(Text, { style: exactReportStyles.recommendationArrow }, ">")
          )) : [h(Text, { key: "none", style: { color: "#64748b", lineHeight: 1.3 } }, "No weak rule currently meets the configured recommendation criteria.")])
        ),
        h(View, { style: [exactReportStyles.panel, exactReportStyles.bottomPanel] },
          h(Text, { style: exactReportStyles.panelTitle }, "NEXT STEPS"),
          h(Text, { style: exactReportStyles.quote }, "Small, consistent actions every day lead to exceptional results."),
          h(Text, { style: exactReportStyles.nextStep }, nextRule ? `${nextRule.title} in ${nextRule.subjectName} appears in this report's weak-rule records. Use the live weak-focus queue in Rule Training for the current recommended session.` : weakestMeasured ? `${weakestMeasured.name} is the lowest measured subject in this report. Use the live weak-focus queue in Rule Training for the current recommended session.` : "Continue balanced scored practice across measured subjects and reassess after additional activity is recorded."),
          h(View, { style: { flexDirection: "row", marginTop: 10, alignItems: "flex-end" } },
            h(View, { style: { width: "63%" } }, h(Text, { style: { color: "#53627d", fontSize: 5.2, lineHeight: 1.3 } }, "Keep learning. Keep reviewing. Use active recall, not passive reading."), h(Text, { style: { marginTop: 10, fontSize: 8, color: "#11163c", fontFamily: "Helvetica-Oblique" } }, "Lexora Team")),
            h(View, { style: { width: "37%", alignItems: "center" } }, logo ? h(Image, { src: logo, style: { width: 40, height: 40, objectFit: "contain" } }) : null, h(Text, { style: { fontSize: 5.2, color: "#11163c", textAlign: "center", marginTop: 2 } }, "Stay disciplined.\nTrust the process.") )
          ),
          h(Text, { style: exactReportStyles.disclaimer }, `This report summarizes recorded Lexora practice performance. It does not predict bar-exam passage or an official examination score. Report ID: ${identity.reportId}`)
        )
      ),

      h(View, { style: exactReportStyles.footer, fixed: true },
        h(Text, null, "LEXORA PREP"),
        h(Text, null, `${identity.name} | ${identity.email} | ${identity.generatedAtLabel}`),
        h(Text, null, "Your Journey. Your Progress.")
      )
    )
  )
}

function addTitleRow(sheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  sheet.mergeCells("A1:F1")
  sheet.getCell("A1").value = title
  sheet.getCell("A1").font = { size: 20, bold: true, color: { argb: "FF5B21B6" } }
  sheet.getCell("A1").alignment = { vertical: "middle" }
  sheet.getRow(1).height = 30
  sheet.mergeCells("A2:F2")
  sheet.getCell("A2").value = subtitle
  sheet.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } }
  sheet.getRow(2).height = 20
}

function styleTableHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF11163C" } }
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } }
  row.alignment = { vertical: "middle" }
  row.height = 22
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: "FFD8DCE7" } } }
  })
}

function applyBodyBorders(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, endCol: number) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = sheet.getRow(rowIndex)
    row.height = 20
    for (let col = 1; col <= endCol; col += 1) {
      const cell = row.getCell(col)
      cell.border = { bottom: { style: "hair", color: { argb: "FFE8EBF2" } } }
      if (rowIndex % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFD" } }
      }
    }
  }
}

async function buildExcelWorkbook(data: ProgressHistoryAnalyticsData, identity: ReportIdentity) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Lexora"
  workbook.lastModifiedBy = identity.name
  workbook.created = new Date(identity.generatedAtIso)
  workbook.modified = new Date(identity.generatedAtIso)
  workbook.title = `Lexora Progress Report - ${data.range.label}`
  workbook.subject = "Recorded progress history and performance analytics"
  workbook.keywords = `Lexora, progress, readiness, analytics, ${identity.reportId}`
  workbook.company = "Lexora"

  const summary = workbook.addWorksheet("Executive Summary", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  summary.columns = [
    { width: 28 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 28 },
  ]
  addTitleRow(summary, "Lexora Progress Report", `${data.range.label} | ${identity.reportId} | Generated ${identity.generatedAtLabel}`)

  const summaryRows: Array<[string, string | number]> = [
    ["Report owner", identity.name],
    ["Email", identity.email],
    ["Current readiness", data.summary.currentReadiness === null ? "Unavailable" : `${data.summary.currentReadiness}%`],
    ["Previous readiness", data.summary.previousReadiness === null ? "Unavailable" : `${data.summary.previousReadiness}%`],
    ["Change", signedPoints(data.summary.change)],
    ["Scored attempts", data.summary.totalScoredAttempts],
    ["Distinct rules attempted", data.summary.attemptedRules],
    ["Available rules", data.summary.totalAvailableRules],
    ["Completion", data.summary.completionPercentage === null ? "Unavailable" : `${data.summary.completionPercentage}%`],
    ["Mastered rules", data.summary.masteredRules],
    ["Active-day streak", data.summary.activeDayStreak],
  ]
  let row = 4
  for (const [label, value] of summaryRows) {
    summary.getCell(row, 1).value = label
    summary.getCell(row, 1).font = { bold: true, color: { argb: "FF46516F" } }
    summary.getCell(row, 2).value = value
    summary.mergeCells(row, 2, row, 3)
    row += 1
  }

  row += 1
  summary.getCell(row, 1).value = "Performance assessment"
  summary.getCell(row, 1).font = { size: 14, bold: true, color: { argb: "FF047857" } }
  row += 1
  summary.mergeCells(row, 1, row, 6)
  summary.getCell(row, 1).value = data.improvement.title
  summary.getCell(row, 1).font = { bold: true, color: { argb: "FF047857" } }
  row += 1
  summary.mergeCells(row, 1, row + 2, 6)
  summary.getCell(row, 1).value = `${data.improvement.message}\n\nRecommended next action: ${data.improvement.recommendedAction}\n\nEvidence: ${data.improvement.evidence.join(" | ")}`
  summary.getCell(row, 1).alignment = { wrapText: true, vertical: "top" }
  summary.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }
  summary.getRow(row).height = 64

  const subjects = workbook.addWorksheet("Subject Performance", {
    views: [{ state: "frozen", ySplit: 4, xSplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  subjects.columns = [
    { width: 30 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
  ]
  addTitleRow(subjects, "Subject Performance", `${data.range.label} | Current, previous, change, attempts, and evidence status`)
  const subjectHeader = subjects.getRow(4)
  subjectHeader.values = ["Subject", "Current", "Previous", "Change", "Attempts", "Status"]
  styleTableHeader(subjectHeader)
  let subjectRow = 5
  for (const item of data.subjectProgress.map(getSubjectSnapshot)) {
    const outputRow = subjects.getRow(subjectRow)
    outputRow.values = [
      item.subject.subjectName,
      item.current === null ? null : item.current / 100,
      item.previous === null ? null : item.previous / 100,
      item.change === null ? null : item.change / 100,
      item.attempts,
      item.status,
    ]
    outputRow.getCell(2).numFmt = "0%"
    outputRow.getCell(3).numFmt = "0%"
    outputRow.getCell(4).numFmt = "+0%;-0%;0%"
    subjectRow += 1
  }
  applyBodyBorders(subjects, 5, Math.max(5, subjectRow - 1), 6)
  subjects.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, subjectRow - 1), column: 6 } }

  const activity = workbook.addWorksheet("Activity History", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  activity.columns = [
    { width: 22 },
    { width: 22 },
    { width: 26 },
    { width: 38 },
    { width: 14 },
    { width: 70 },
  ]
  addTitleRow(activity, "Activity History", `${data.range.label} | ${data.recentHistory.length} recorded events`)
  const activityHeader = activity.getRow(4)
  activityHeader.values = ["Timestamp", "Activity", "Subject", "Rule / title", "Score", "Recorded detail"]
  styleTableHeader(activityHeader)
  let activityRow = 5
  for (const event of data.recentHistory) {
    const outputRow = activity.getRow(activityRow)
    outputRow.values = [
      new Date(event.timestamp),
      eventTypeLabel(event),
      event.subjectName ?? "",
      event.title,
      event.score === null ? null : event.score / 100,
      event.detail,
    ]
    outputRow.getCell(1).numFmt = "mmm d, yyyy h:mm AM/PM"
    outputRow.getCell(5).numFmt = "0%"
    outputRow.getCell(6).alignment = { wrapText: true, vertical: "top" }
    activityRow += 1
  }
  applyBodyBorders(activity, 5, Math.max(5, activityRow - 1), 6)
  activity.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, activityRow - 1), column: 6 } }

  const methodology = workbook.addWorksheet("Methodology")
  methodology.columns = [{ width: 30 }, { width: 90 }]
  addTitleRow(methodology, "Methodology and Data Notes", `${identity.reportId} | Generated ${identity.generatedAtLabel}`)
  const methodologyRows = [
    ["Readiness", "Calculated from recorded scored rule attempts in the selected range."],
    ["Subject performance", "Uses recorded subject-level scored attempts. Limited attempt volume is marked as early data."],
    ["Trend", "Compared with the preceding equivalent period when comparable history exists."],
    ["Milestones", "Calculated from recorded rule attempts, available rules, mastery records, and readiness history."],
    ["AI interpretation", "No AI-generated narrative is included unless explicitly labelled. All numeric values remain backend-calculated."],
    ["Important limitation", "This report is not a prediction of bar-exam results."],
  ]
  let methodologyRow = 4
  for (const [label, detail] of methodologyRows) {
    methodology.getCell(methodologyRow, 1).value = label
    methodology.getCell(methodologyRow, 1).font = { bold: true, color: { argb: "FF46516F" } }
    methodology.getCell(methodologyRow, 2).value = detail
    methodology.getCell(methodologyRow, 2).alignment = { wrapText: true, vertical: "top" }
    methodology.getRow(methodologyRow).height = 32
    methodologyRow += 1
  }

  for (const sheet of workbook.worksheets) {
    sheet.headerFooter.oddFooter = `Generated for ${identity.name} (${identity.email}) · ${identity.generatedAtLabel} · ${identity.reportId}`
    sheet.headerFooter.evenFooter = sheet.headerFooter.oddFooter
  }

  return workbook
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedFormat = searchParams.get("format")
    const format = requestedFormat === "pdf" ? "pdf" : "xlsx"
    const range = searchParams.get("range") ?? "30d"
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const timezoneOffset = Number(searchParams.get("timezoneOffset") ?? 0)
    const safeTimezoneOffset = Number.isFinite(timezoneOffset) ? timezoneOffset : 0

    const data = await buildProgressHistoryAnalytics({
      userId: user.id,
      range,
      start,
      end,
      timezoneOffset: safeTimezoneOffset,
    })

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { full_name: true, email: true, subscription_tier: true, exam_month: true, exam_year: true },
    })

    const generatedAt = new Date()
    const identity: ReportIdentity = {
      name: profile?.full_name?.trim() || user.user_metadata?.full_name || user.email || "Lexora user",
      email: profile?.email || user.email || "Email unavailable",
      generatedAtLabel: formatLocalDateTime(generatedAt, safeTimezoneOffset),
      generatedAtIso: generatedAt.toISOString(),
      reportId: `LXR-PH-${generatedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
    }

    const suffix = generatedAt.toISOString().slice(0, 10)

    if (format === "xlsx") {
      const workbook = await buildExcelWorkbook(data, identity)
      const workbookBuffer = await workbook.xlsx.writeBuffer()
      const bytes = Buffer.from(workbookBuffer)
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="lexora-progress-${suffix}.xlsx"`,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "X-Lexora-Report-Id": identity.reportId,
        },
      })
    }

    const analyticsSettings = await getStrengthsWeaknessesAnalyticsSettings()
    const supplement = await buildPremiumSupplement({
      userId: user.id,
      data,
      timezoneOffset: safeTimezoneOffset,
      confirmedSubjectAttempts: analyticsSettings.confirmedSubjectAttempts,
      weakRuleThreshold: analyticsSettings.weakRuleThreshold,
    })

    const pdfBuffer = await renderToBuffer(
      buildExactReferencePdfV2(
        data,
        identity,
        {
          subscription_tier: profile?.subscription_tier ?? null,
          exam_month:
            profile?.exam_month != null &&
            profile.exam_month >= 1 &&
            profile.exam_month <= 12
              ? new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  timeZone: "UTC",
                }).format(
                  new Date(
                    Date.UTC(
                      2000,
                      profile.exam_month - 1,
                      1
                    )
                  )
                )
              : null,
          exam_year: profile?.exam_year ?? null,
        },
        supplement,
        {
          strongSubjectThreshold: analyticsSettings.strongSubjectThreshold,
          weakSubjectThreshold: analyticsSettings.weakSubjectThreshold,
          confirmedSubjectAttempts: analyticsSettings.confirmedSubjectAttempts,
        }
      )
    )
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lexora-progress-${suffix}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Lexora-Report-Id": identity.reportId,
      },
    })
  } catch (error) {
    console.error("PROGRESS EXPORT ERROR:", error)
    return NextResponse.json(
      { error: "Progress report could not be exported." },
      { status: 500 }
    )
  }
}

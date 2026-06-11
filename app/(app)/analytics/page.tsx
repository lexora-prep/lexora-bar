"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import type { TabKey } from "./types"
import { ANALYTICS_TABS } from "./constants"
import { useAnalyticsUser } from "./hooks/use-analytics-user"
import { useCoreAnalytics } from "./hooks/use-core-analytics"
import { useTrendAnalytics } from "./hooks/use-trend-analytics"
import {
  buildAnalyticsAccess,
  buildChartData,
  buildConsistencyScore,
  buildRiskBuckets,
  buildSubjectDiagnostics,
  getScoreMovement,
  rangeLabel,
} from "./lib/analytics-calculations"
import { AnalyticsHeader } from "./components/shared/analytics-header"
import { AnalyticsTabs } from "./components/shared/analytics-tabs"
import { AnalyticsFooter } from "./components/shared/analytics-footer"
import { LoadingState } from "./components/shared/loading-state"
import { GlassCard } from "./components/shared/glass-card"
import {
  EmptyCompact,
  PremiumInline,
} from "./components/shared/feedback-states"

const OverviewTab = dynamic(
  () => import("./components/tabs/overview-tab"),
  {
    ssr: false,
  }
)

const LearningInsightsTab = dynamic(
  () => import("./components/tabs/learning-insights-tab"),
  {
    ssr: false,
  }
)

const RuleAnalyticsTab = dynamic(
  () => import("./components/tabs/rule-analytics-tab"),
  {
    ssr: false,
  }
)

const TimeAnalysisTab = dynamic(
  () => import("./components/tabs/time-analysis-tab"),
  {
    ssr: false,
  }
)

const StrengthsWeaknessesTab = dynamic(
  () => import("./components/tabs/strengths-weaknesses-tab"),
  {
    ssr: false,
  }
)

const ProgressHistoryTab = dynamic(
  () => import("./components/tabs/progress-history-tab"),
  {
    ssr: false,
  }
)

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] =
    useState<TabKey>("overview")

  const [range, setRange] = useState("30d")
  const [appliedRange, setAppliedRange] =
    useState("30d")

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [
    appliedStartDate,
    setAppliedStartDate,
  ] = useState("")

  const [
    appliedEndDate,
    setAppliedEndDate,
  ] = useState("")

  const [showInsightInfo, setShowInsightInfo] =
    useState(false)

  const {
    userId,
    loadingUser,
    subscriptionTier,
    billingStatus,
    error: userError,
  } = useAnalyticsUser()

  const {
    dashboard,
    bllSubjects,
    weakAreas,
    loading: coreLoading,
    error: coreError,
  } = useCoreAnalytics(userId)

  const {
    trend,
    loading: trendLoading,
    error: trendError,
  } = useTrendAnalytics({
    userId,
    appliedRange,
    appliedStartDate,
    appliedEndDate,
  })

  const access = useMemo(
    () =>
      buildAnalyticsAccess({
        subscriptionTier,
        billingStatus,
      }),
    [subscriptionTier, billingStatus]
  )

  const chartData = useMemo(
    () => buildChartData(trend),
    [trend]
  )

  const subjects = useMemo(
    () => buildSubjectDiagnostics(bllSubjects),
    [bllSubjects]
  )

  const attemptedSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) => subject.completed > 0
      ),
    [subjects]
  )

  const strongSubjects = useMemo(
    () =>
      attemptedSubjects.filter(
        (subject) => subject.accuracy >= 75
      ),
    [attemptedSubjects]
  )

  const weakSubjects = useMemo(
    () =>
      attemptedSubjects.filter(
        (subject) =>
          subject.accuracy > 0 &&
          subject.accuracy < 70
      ),
    [attemptedSubjects]
  )

  const strongestSubject = useMemo(
    () =>
      [...attemptedSubjects].sort(
        (a, b) => b.accuracy - a.accuracy
      )[0],
    [attemptedSubjects]
  )

  const weakestSubject = useMemo(
    () =>
      [...attemptedSubjects].sort(
        (a, b) => a.accuracy - b.accuracy
      )[0],
    [attemptedSubjects]
  )

  const riskBuckets = useMemo(
    () => buildRiskBuckets(subjects),
    [subjects]
  )

  const consistencyScore = useMemo(
    () => buildConsistencyScore(chartData),
    [chartData]
  )

  if (loadingUser || !userId) {
    return (
      <LoadingState text="Loading analytics..." />
    )
  }

  if (userError) {
    return (
      <AnalyticsErrorState
        message={userError}
      />
    )
  }

  if (coreLoading || !dashboard) {
    return (
      <LoadingState text="Preparing analytics..." />
    )
  }

  if (coreError) {
    return (
      <AnalyticsErrorState
        message={coreError}
      />
    )
  }

  const analyticsDashboard = dashboard

  const {
    currentScore,
    delta,
  } = getScoreMovement({
    chartData,
    currentFallback: analyticsDashboard.bllScore,
    previousFallback: analyticsDashboard.prevBLL,
  })

  const primaryWeakArea = weakAreas[0]

  function renderActiveTab() {
    if (activeTab === "overview") {
      return (
        <OverviewTab
          dashboard={analyticsDashboard}
          chartData={chartData}
          trendLoading={trendLoading}
          currentScore={currentScore}
          delta={delta}
          canUseBLLAnalytics={
            access.canUseBLLAnalytics
          }
          canUsePremiumAnalytics={
            access.canUsePremiumAnalytics
          }
          strongSubjects={strongSubjects}
          strongestSubject={strongestSubject}
          weakestSubject={weakestSubject}
          weakAreas={weakAreas}
          primaryWeakArea={primaryWeakArea}
          riskBuckets={riskBuckets}
          consistencyScore={consistencyScore}
          rangeLabelText={rangeLabel(
            appliedRange
          )}
        />
      )
    }

    if (activeTab === "learning") {
      return (
        <LearningInsightsTab
          dashboard={analyticsDashboard}
          chartData={chartData}
          currentScore={currentScore}
          delta={delta}
          canUseBLLAnalytics={
            access.canUseBLLAnalytics
          }
          strongestSubject={strongestSubject}
          weakestSubject={weakestSubject}
          weakAreas={weakAreas}
          primaryWeakArea={primaryWeakArea}
          consistencyScore={consistencyScore}
        />
      )
    }

    if (!access.canUseBLLAnalytics) {
      const tabTitle =
        ANALYTICS_TABS.find(
          (tab) => tab.key === activeTab
        )?.label || "Analytics"

      return (
        <GlassCard title={tabTitle}>
          <PremiumInline text="Upgrade to Black Letter Law Monthly to unlock this analytics tab." />
        </GlassCard>
      )
    }

    if (activeTab === "rules") {
      return <RuleAnalyticsTab />
    }

    if (activeTab === "time") {
      return <TimeAnalysisTab />
    }

    if (activeTab === "strengths") {
      return (
        <StrengthsWeaknessesTab
          strongSubjects={strongSubjects}
          weakSubjects={weakSubjects}
          weakAreas={weakAreas}
        />
      )
    }

    return (
      <ProgressHistoryTab
        chartData={chartData}
      />
    )
  }

  return (
    <main className="min-h-screen select-none bg-white px-5 py-5 text-[#0a1038] md:px-6">
      <div className="w-full space-y-4">
        <AnalyticsHeader
          tierLabel={access.tierLabel}
          range={range}
          setRange={setRange}
          appliedRange={appliedRange}
          setAppliedRange={setAppliedRange}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          setAppliedStartDate={
            setAppliedStartDate
          }
          setAppliedEndDate={
            setAppliedEndDate
          }
        />

        <AnalyticsTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {trendError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            Trend data could not be loaded. Other
            analytics remain available.
          </div>
        ) : null}

        {renderActiveTab()}

        <AnalyticsFooter
          showInsightInfo={showInsightInfo}
          onToggleInsightInfo={() =>
            setShowInsightInfo(
              (current) => !current
            )
          }
        />
      </div>
    </main>
  )
}

function AnalyticsErrorState({
  message,
}: {
  message: string
}) {
  return (
    <main className="min-h-screen bg-white p-6">
      <GlassCard title="Analytics unavailable">
        <EmptyCompact
          text={`Analytics could not be loaded: ${message}`}
        />
      </GlassCard>
    </main>
  )
}

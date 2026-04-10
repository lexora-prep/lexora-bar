"use client"

import { SubjectProgressRow } from "./subject-progress-row"
import { DashboardCard } from "./dashboard-card"

interface SubjectRow {
  name: string
  accuracy: number
  completed: number
  total: number
  avg?: number
}

interface PerformanceAnalyticsProps {
  tab: "MBE" | "BLL"
  setTab: (tab: "MBE" | "BLL") => void
  isPremium: boolean
  showAll: boolean
  setShowAll: (show: boolean) => void
  bllRows: SubjectRow[]
  mbeRows: SubjectRow[]
}

export function PerformanceAnalytics({
  tab,
  setTab,
  isPremium,
  showAll,
  setShowAll,
  bllRows,
  mbeRows,
}: PerformanceAnalyticsProps) {
  const visibleBllRows = showAll ? bllRows : bllRows.slice(0, 5)
  const visibleMbeRows = showAll ? mbeRows : mbeRows.slice(0, 5)

  return (
    <DashboardCard className="xl:self-start">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Performance Analytics
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setTab("BLL")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "BLL"
                  ? "bg-card text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              BLL
            </button>

            <button
              onClick={() => isPremium && setTab("MBE")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "MBE"
                  ? "bg-card text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } ${!isPremium ? "cursor-not-allowed opacity-50" : ""}`}
            >
              MBE {!isPremium && "🔒"}
            </button>
          </div>

          <button
            onClick={() => setShowAll(!showAll)}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {showAll ? "Show less" : "Show all"}
          </button>
        </div>
      </div>

      <div
        className={`space-y-2 ${showAll ? "max-h-[470px] overflow-y-auto pr-1" : ""}`}
      >
        {tab === "BLL" &&
          visibleBllRows.map((s) => (
            <SubjectProgressRow
              key={s.name}
              name={s.name}
              leftBadge={`${s.completed} / ${s.total}`}
              rightBadge={`${s.accuracy}%`}
              value={s.accuracy}
              accent="emerald"
            />
          ))}

        {tab === "MBE" &&
          visibleMbeRows.map((s) => (
            <SubjectProgressRow
              key={s.name}
              name={s.name}
              leftBadge={`avg ${s.avg ?? 0}%`}
              rightBadge={`${s.accuracy}%`}
              value={s.accuracy}
              accent="blue"
              footer={`${s.completed} / ${s.total} completed`}
              avg={s.avg}
            />
          ))}
      </div>
    </DashboardCard>
  )
}

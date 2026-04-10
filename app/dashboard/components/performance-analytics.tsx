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
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Performance Analytics
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab("BLL")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                tab === "BLL"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              BLL
            </button>

            <button
              onClick={() => isPremium && setTab("MBE")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                tab === "MBE"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              } ${!isPremium ? "cursor-not-allowed opacity-50" : ""}`}
            >
              MBE {!isPremium && "🔒"}
            </button>
          </div>

          <button
            onClick={() => setShowAll(!showAll)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800"
          >
            {showAll ? "Show less" : "Show all"}
          </button>
        </div>
      </div>

      <div
        className={`space-y-3 ${showAll ? "max-h-[500px] overflow-y-auto pr-1" : ""}`}
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

import type { ChartPoint } from "../../types"
import { GlassCard } from "../shared/glass-card"
import { EmptyCompact } from "../shared/feedback-states"

export default function ProgressHistoryTab({
  chartData,
}: {
  chartData: ChartPoint[]
}) {
  const activeHistory = chartData.filter(
    (point) => point.score > 0
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <GlassCard
        title="Progress History"
        info="This initial history view uses the real trend data for the selected date range."
      >
        {activeHistory.length > 0 ? (
          <div className="space-y-2">
            {[...activeHistory]
              .reverse()
              .map((point) => (
                <div
                  key={point.date}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px]"
                >
                  <span className="text-[#53617e]">
                    {point.date}
                  </span>

                  <span className="font-medium text-violet-700">
                    {point.score}%
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <EmptyCompact text="No progress history exists for the selected date range." />
        )}
      </GlassCard>
    </div>
  )
}

"use client"

import { ArrowRight, Sparkles } from "lucide-react"

export function AnalyticsFooter({
  showInsightInfo,
  onToggleInsightInfo,
}: {
  showInsightInfo: boolean
  onToggleInsightInfo: () => void
}) {
  return (
    <>
      <footer className="flex min-h-10 items-center justify-between rounded-xl bg-violet-50 px-5 py-3 text-[12px] font-normal text-[#3b2b8f]">
        <div className="flex items-center gap-2">
          <Sparkles size={15} />

          <span>
            Insights are updated daily based on your activity.
            The more consistent you are, the smarter Lexora gets.
          </span>
        </div>

        <div className="hidden items-center gap-2 font-normal md:flex">
          <button
            type="button"
            onClick={onToggleInsightInfo}
            className="flex items-center gap-2 text-[12px] font-normal text-violet-700"
          >
            <span>How insights work</span>

            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 text-[11px]">
              ?
            </span>

            <ArrowRight size={15} />
          </button>
        </div>
      </footer>

      {showInsightInfo ? (
        <div className="rounded-xl border border-violet-100 bg-white px-5 py-4 text-[12px] font-normal leading-5 text-[#4b5878] shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          Lexora calculates analytics only from your real study
          activity: BLL rule attempts, rule scores, subject
          accuracy, weak-area records, and trend data from the
          selected date range. AI insight is not generated until
          the AI insight engine is connected.
        </div>
      ) : null}
    </>
  )
}

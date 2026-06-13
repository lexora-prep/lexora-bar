"use client"

import { CalendarDays } from "lucide-react"
import { rangeLabel } from "../../lib/analytics-calculations"

type DateRangeControlProps = {
  range: string
  setRange: (value: string) => void
  appliedRange: string
  setAppliedRange: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  setAppliedStartDate: (value: string) => void
  setAppliedEndDate: (value: string) => void
}

export function DateRangeControl({
  range,
  setRange,
  appliedRange,
  setAppliedRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setAppliedStartDate,
  setAppliedEndDate,
}: DateRangeControlProps) {
  const canApplyCustom =
    range !== "custom" ||
    Boolean(startDate && endDate)

  function applyRange() {
    if (!canApplyCustom) {
      return
    }

    setAppliedRange(range)

    if (range === "custom") {
      setAppliedStartDate(startDate)
      setAppliedEndDate(endDate)
      return
    }

    setAppliedStartDate("")
    setAppliedEndDate("")
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-full border border-[#e5e8f0] bg-white/90 px-3 text-[12px] font-normal text-[#0c123a] shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <CalendarDays
        size={15}
        className="text-[#1b2452]"
      />

      <select
        value={range}
        onChange={(event) =>
          setRange(event.target.value)
        }
        className="h-8 bg-transparent text-[12px] font-normal outline-none"
      >
        <option value="today">Today</option>
        <option value="7d">7 days</option>
        <option value="14d">14 days</option>
        <option value="30d">30 days</option>
        <option value="90d">3 months</option>
        <option value="custom">Custom</option>
      </select>

      {range === "custom" ? (
        <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            className="h-7 bg-transparent px-1 text-[11px] outline-none"
          />

          <span className="text-slate-300">—</span>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
            className="h-7 bg-transparent px-1 text-[11px] outline-none"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={applyRange}
        disabled={!canApplyCustom}
        className={`h-8 rounded-full px-4 text-[12px] font-normal transition ${
          canApplyCustom
            ? "bg-violet-700 text-white hover:bg-violet-800"
            : "cursor-not-allowed bg-slate-100 text-slate-400"
        }`}
      >
        Apply
      </button>

      <span className="text-[11px] text-slate-400">
        Showing {rangeLabel(appliedRange).toLowerCase()}
      </span>
    </div>
  )
}

"use client"

import { Download } from "lucide-react"
import { DateRangeControl } from "./date-range-control"

type AnalyticsHeaderProps = {
  tierLabel: string
  range: string
  setRange: (value: string) => void
  appliedRange: string
  setAppliedRange: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  appliedStartDate: string
  appliedEndDate: string
  setAppliedStartDate: (value: string) => void
  setAppliedEndDate: (value: string) => void
}

export function AnalyticsHeader({
  tierLabel,
  range,
  setRange,
  appliedRange,
  setAppliedRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  appliedStartDate,
  appliedEndDate,
  setAppliedStartDate,
  setAppliedEndDate,
}: AnalyticsHeaderProps) {
  const exportParams = new URLSearchParams({
    format: "pdf",
    range: appliedRange,
  })

  if (
    appliedRange === "custom" &&
    appliedStartDate &&
    appliedEndDate
  ) {
    exportParams.set("start", appliedStartDate)
    exportParams.set("end", appliedEndDate)
  }

  return (
    <header className="flex items-start justify-between gap-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-medium tracking-[-0.03em] text-[#060b2b]">
            Analytics
          </h1>

          <span className="rounded-md bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700">
            {tierLabel}
          </span>
        </div>

        <p className="mt-2 text-[13px] font-normal text-[#425274]">
          Deep insights to help you master Black Letter Law.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <DateRangeControl
          range={range}
          setRange={setRange}
          appliedRange={appliedRange}
          setAppliedRange={setAppliedRange}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          setAppliedStartDate={setAppliedStartDate}
          setAppliedEndDate={setAppliedEndDate}
        />

        <a
          href={`/api/progress-history/export?${exportParams.toString()}`}
          className="flex h-10 items-center gap-2 rounded-xl border border-[#e5e8f0] bg-white px-4 text-[12px] font-normal text-[#425274] shadow-[0_6px_16px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
        >
          <Download size={15} />
          Export Report
        </a>
      </div>
    </header>
  )
}

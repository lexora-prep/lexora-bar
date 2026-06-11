"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts"
import type { ChartPoint } from "../../types"

type ChartTooltipPayloadItem = {
  value?: string | number
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}

export function MiniSparkline({
  data,
  stroke,
}: {
  data: ChartPoint[]
  stroke: string
}) {
  const sparkData = data
    .filter((item) => item.score > 0)
    .slice(-8)

  if (sparkData.length === 0) {
    return (
      <div className="h-full rounded-xl bg-white/60" />
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sparkData}>
        <Area
          type="monotone"
          dataKey="score"
          stroke={stroke}
          strokeWidth={2.5}
          fill="#ede9fe"
          fillOpacity={0.28}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-xs font-normal text-[#11183d]">
        {label}
      </div>

      <div className="mt-1 text-xs font-normal text-violet-700">
        BLL Accuracy: {payload[0]?.value ?? 0}%
      </div>
    </div>
  )
}

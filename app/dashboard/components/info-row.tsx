"use client"

import type { ReactNode } from "react"

interface InfoRowProps {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="text-slate-800">{value}</div>
    </div>
  )
}

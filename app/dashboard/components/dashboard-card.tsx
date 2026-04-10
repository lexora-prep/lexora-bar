"use client"

import type { ReactNode } from "react"

interface DashboardCardProps {
  children: ReactNode
  className?: string
}

export function DashboardCard({ children, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

"use client"

import type { ReactNode } from "react"

interface DashboardCardProps {
  children: ReactNode
  className?: string
}

export function DashboardCard({ children, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 ${className}`}
    >
      {children}
    </div>
  )
}

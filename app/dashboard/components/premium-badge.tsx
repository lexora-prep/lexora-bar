"use client"

import { Lock } from "lucide-react"

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Premium
      <Lock size={10} />
    </span>
  )
}

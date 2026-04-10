"use client"

import { Lock } from "lucide-react"

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
      Premium
      <Lock size={10} />
    </span>
  )
}

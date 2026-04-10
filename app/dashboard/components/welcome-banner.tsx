"use client"

import { Sparkles, X } from "lucide-react"

interface WelcomeBannerProps {
  onCreatePlan: () => void
  onDismiss: () => void
}

export function WelcomeBanner({ onCreatePlan, onDismiss }: WelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />

      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X size={16} />
      </button>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <Sparkles size={12} />
            Welcome to Lexora Prep
          </div>

          <h2 className="mb-1.5 text-xl font-semibold text-foreground">
            Let&apos;s build your study plan
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Start by setting your study plan so Lexora can calculate your daily
            targets, track progress, and build your countdown workflow.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreatePlan}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Create Study Plan
          </button>
        </div>
      </div>
    </div>
  )
}

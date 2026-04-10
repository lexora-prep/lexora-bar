"use client"

import { Sparkles, X } from "lucide-react"

interface WelcomeBannerProps {
  onCreatePlan: () => void
  onDismiss: () => void
}

export function WelcomeBanner({ onCreatePlan, onDismiss }: WelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-6 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_50%)]" />

      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={18} />
      </button>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Sparkles size={14} />
            Welcome to Lexora Prep
          </div>

          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Let&apos;s build your study plan
          </h2>

          <p className="text-sm leading-relaxed text-slate-600">
            Start by setting your study plan so Lexora can calculate your daily
            targets, track progress, and build your countdown workflow.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCreatePlan}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            Create Study Plan
          </button>
        </div>
      </div>
    </div>
  )
}

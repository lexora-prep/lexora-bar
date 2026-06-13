"use client"

import { useState } from "react"
import {
  ChevronDown,
  CircleHelp,
  Sparkles,
} from "lucide-react"

type AnalyticsFooterProps = {
  showInsightInfo?: boolean
  onToggleInsightInfo?: () => void
}

export function AnalyticsFooter({
  showInsightInfo,
  onToggleInsightInfo,
}: AnalyticsFooterProps) {
  const [internalOpen, setInternalOpen] =
    useState(false)

  const isOpen =
    showInsightInfo ?? internalOpen

  function handleToggle() {
    if (onToggleInsightInfo) {
      onToggleInsightInfo()
      return
    }

    setInternalOpen(
      (current) => !current
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-violet-100 bg-[#f8f7ff] shadow-[0_3px_12px_rgba(76,29,149,0.025)]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="analytics-insight-explanation"
        onClick={handleToggle}
        className="flex min-h-[46px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-[#f4f1ff]"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 shadow-[0_2px_7px_rgba(76,29,149,0.06)]">
          <Sparkles size={14} />
        </div>

        <p className="min-w-0 flex-1 text-[10px] font-normal leading-4 text-[#4a4292] sm:text-[11px]">
          Insights become more personalized as you
          complete additional study activity.
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-2 text-[9px] font-normal text-violet-700 sm:text-[10px]">
          <span className="hidden sm:inline">
            {isOpen
              ? "Hide explanation"
              : "How insights work"}
          </span>

          <CircleHelp size={14} />

          <ChevronDown
            size={14}
            className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen
                ? "rotate-180"
                : "rotate-0"
            }`}
          />
        </div>
      </button>

      <div
        id="analytics-insight-explanation"
        aria-hidden={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-violet-100 bg-white/80 px-4 transition-[padding,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen
                ? "translate-y-0 py-3.5"
                : "-translate-y-2 py-0"
            }`}
          >
            <div
              className={`flex items-start gap-3 transition-[filter,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen
                  ? "translate-y-0 blur-0"
                  : "-translate-y-1 blur-[1px]"
              }`}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <CircleHelp size={14} />
              </div>

              <div className="min-w-0">
                <h3 className="text-[10px] font-normal text-[#171d42] sm:text-[11px]">
                  Personalized analytics
                </h3>

                <p className="mt-1 max-w-4xl text-[9px] font-normal leading-4 text-[#67708c] sm:text-[10px]">
                  Lexora analyzes your recorded study
                  activity to identify progress,
                  consistency, learning patterns, and
                  areas that need more attention. Your
                  insights become more precise as you
                  complete more rule training,
                  flashcards, reviews, and study
                  sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

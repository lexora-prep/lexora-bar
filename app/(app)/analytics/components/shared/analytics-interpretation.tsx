"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, CircleHelp, Target } from "lucide-react"

export function AnalyticsInterpretation({
  title,
  measures,
  result,
  nextStep,
  evidence,
}: {
  title: string
  measures: string
  result: string
  nextStep: string
  evidence?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="border-y border-slate-200 bg-white px-1 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CircleHelp size={15} className="shrink-0 text-violet-600" />
            <h2 className="text-[13px] font-medium tracking-[-0.01em] text-[#11163c]">
              {title}
            </h2>
          </div>

          <p className="mt-1.5 max-w-4xl text-[10px] leading-5 text-slate-600">
            {measures}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex items-center gap-1.5 self-start text-[10px] font-medium text-violet-700 transition hover:text-violet-900"
        >
          {open ? "Hide interpretation" : "How to use this page"}
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          />
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-3">
          <InterpretationItem
            label="What your data shows"
            text={result}
          />
          <InterpretationItem
            label="Recommended next step"
            text={nextStep}
            icon={<Target size={13} />}
          />
          <InterpretationItem
            label="Evidence standard"
            text={
              evidence ||
              "Only recorded activity is interpreted. Missing information is shown as unavailable rather than estimated."
            }
          />
        </div>
      ) : null}
    </section>
  )
}

export function AnalyticsHelp({
  text,
  label = "How to read this",
}: {
  text: string
  label?: string
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[9px] font-medium text-slate-500 transition hover:text-violet-700">
        <CircleHelp size={12} />
        {label}
        <ChevronDown
          size={11}
          className="transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="mt-2 max-w-xl border-l-2 border-violet-200 pl-3 text-[9px] leading-4 text-slate-600">
        {text}
      </div>
    </details>
  )
}

function InterpretationItem({
  label,
  text,
  icon,
}: {
  label: string
  text: string
  icon?: ReactNode
}) {
  return (
    <div className="min-w-0 border-l border-slate-200 pl-3 first:border-l-0 first:pl-0 md:first:border-l md:first:pl-3">
      <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-[10px] leading-5 text-[#36415f]">
        {text}
      </p>
    </div>
  )
}

export function FullTextLabel({
  primary,
  secondary,
}: {
  primary: string
  secondary?: string
}) {
  return (
    <div className="min-w-0">
      <div className="break-words text-[9px] leading-4 text-[#30395a]" title={primary}>
        {primary}
      </div>
      {secondary ? (
        <div className="mt-0.5 break-words text-[8px] leading-3 text-slate-400">
          {secondary}
        </div>
      ) : null}
    </div>
  )
}

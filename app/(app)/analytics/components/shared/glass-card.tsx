import type { ReactNode } from "react"
import { AnalyticsHelp } from "./analytics-interpretation"

type GlassCardProps = {
  title: string
  subtitle?: string
  badge?: string
  icon?: ReactNode
  info?: string
  children: ReactNode
}

export function GlassCard({
  title,
  subtitle,
  badge,
  icon,
  info,
  children,
}: GlassCardProps) {
  return (
    <section className="rounded-2xl border border-[#e2e7f1] bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}

            <h2 className="text-[16px] font-normal tracking-[-0.02em] text-[#070c2d]">
              {title}
            </h2>

            {info ? <AnalyticsHelp text={info} /> : null}
          </div>

          {subtitle ? (
            <p className="mt-1 text-[12px] font-normal leading-5 text-[#5d6a87]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {badge ? (
          <span
            title={
              badge === "Lexora AI"
                ? "AI insight is reserved for a real AI engine. It does not generate fake advice."
                : undefined
            }
            className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-normal text-violet-700"
          >
            {badge}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  )
}

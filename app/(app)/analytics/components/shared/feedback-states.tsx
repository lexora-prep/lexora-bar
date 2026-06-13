import { Lock } from "lucide-react"

export function EmptyCompact({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex min-h-[135px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-[12px] font-normal leading-5 text-slate-500">
      {text}
    </div>
  )
}

export function PremiumInline({
  text,
}: {
  text: string
}) {
  return (
    <div className="flex min-h-[165px] items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50 p-5 text-center">
      <div>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-violet-700">
          <Lock size={18} />
        </div>

        <div className="mt-3 text-[13px] font-normal text-[#11183d]">
          Upgrade required
        </div>

        <p className="mx-auto mt-2 max-w-sm text-[12px] font-normal leading-5 text-[#5b6680]">
          {text}
        </p>
      </div>
    </div>
  )
}

export function LockedMetric({
  title,
  text,
  compact = false,
}: {
  title: string
  text: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex ${
        compact ? "min-h-[205px]" : "min-h-[230px]"
      } items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50 p-6 text-center`}
    >
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-violet-700">
          <Lock size={20} />
        </div>

        <div className="mt-3 text-[14px] font-normal text-[#11183d]">
          {title}
        </div>

        <p className="mx-auto mt-2 max-w-md text-[12px] font-normal leading-5 text-[#5b6680]">
          {text}
        </p>
      </div>
    </div>
  )
}

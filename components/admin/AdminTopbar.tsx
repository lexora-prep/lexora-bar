"use client"

import { Bell } from "lucide-react"
import { usePathname } from "next/navigation"
import { adminPageMeta } from "./admin-nav"

export default function AdminTopbar() {
  const pathname = usePathname()
  const meta = adminPageMeta[pathname] || {
    title: "Admin",
    subtitle: "Administrative tools",
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center border-b border-[#E6EAF0] bg-white px-6">
      <div>
        <div className="text-[15px] font-semibold text-[#111827]">{meta.title}</div>
        <div className="mt-0.5 text-[13px] text-[#667085]">{meta.subtitle}</div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {meta.secondaryAction ? (
          <button
            type="button"
            className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-2 text-[13px] font-medium text-[#344054] transition hover:bg-[#F9FAFB]"
          >
            {meta.secondaryAction}
          </button>
        ) : null}

        {meta.primaryAction ? (
          <button
            type="button"
            className="rounded-2xl bg-[#4F46E5] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4338CA]"
          >
            {meta.primaryAction}
          </button>
        ) : null}

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#475467] hover:bg-[#F9FAFB]"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
        </button>
      </div>
    </header>
  )
}
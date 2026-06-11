"use client"

import { ANALYTICS_TABS } from "../../constants"
import type { TabKey } from "../../types"

export function AnalyticsTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav className="flex items-center gap-7 overflow-x-auto border-b border-[#edf0f6]">
      {ANALYTICS_TABS.map((tab) => {
        const active = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative shrink-0 pb-4 text-[12px] font-normal transition-all duration-300 ${
              active
                ? "text-violet-700"
                : "text-[#11183d] hover:text-violet-700"
            }`}
          >
            {tab.label}

            <span
              className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-violet-700 transition-all duration-300 ${
                active
                  ? "w-full opacity-100"
                  : "w-0 opacity-0"
              }`}
            />
          </button>
        )
      })}
    </nav>
  )
}

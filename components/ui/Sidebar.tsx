"use client"

import type { ReactNode } from "react"
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flame,
  UserRound,
} from "lucide-react"

export default function Sidebar({
  collapsed,
  setCollapsed,
  userName,
  studyStreak,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  userName?: string
  studyStreak?: number
}) {
  const displayName = userName?.trim() || "User"
  const displayStreak = studyStreak ?? 0

  return (
    <aside className="h-full w-full bg-[#0b1a2b] text-white flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div
          className={`transition-all duration-200 ${
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}
        >
          <div className="font-semibold text-sm">Lexora Prep</div>
          <div className="text-xs text-slate-400">Private Beta</div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-800 rounded"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 px-2">
        <NavItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          collapsed={collapsed}
        />
        <NavItem
          icon={<BookOpen size={18} />}
          label="Rule Training"
          collapsed={collapsed}
        />
        <NavItem
          icon={<BarChart3 size={18} />}
          label="Analytics"
          collapsed={collapsed}
        />
      </div>

      <div className="mt-auto px-2 pb-4">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 shrink-0">
              <UserRound size={18} className="text-slate-200" />
            </div>

            <div
              className={`min-w-0 transition-all duration-200 ${
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}
            >
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Flame size={12} className="text-orange-400" />
                <span>{displayStreak} day streak</span>
              </div>
            </div>
          </div>

          {collapsed && (
            <div className="mt-3 flex items-center justify-center text-xs text-slate-400">
              <Flame size={12} className="text-orange-400 mr-1" />
              {displayStreak}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  icon,
  label,
  collapsed,
}: {
  icon: ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <div className="group relative flex items-center h-10 rounded-lg hover:bg-slate-800 cursor-pointer transition">
      <div
        className={`flex items-center justify-center ${
          collapsed ? "w-full" : "w-10"
        }`}
      >
        {icon}
      </div>

      <span
        className={`text-sm transition-all duration-200 whitespace-nowrap ${
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 ml-2"
        }`}
      >
        {label}
      </span>

      {collapsed && (
        <div className="absolute left-full ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  )
}
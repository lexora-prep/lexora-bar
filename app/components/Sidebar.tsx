"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Layers,
  Target,
  Library,
  BarChart3,
  RotateCcw,
  Settings,
} from "lucide-react"

type StreakDay = {
  status?: "fire" | "ice" | "none" | string
}

export default function Sidebar({
  userName = "User",
  studyStreak = 0,
  streakDays = [],
}: {
  userName?: string
  studyStreak?: number
  streakDays?: StreakDay[]
}) {
  const pathname = usePathname()

  const menu = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Rule Training", href: "/rule-training", icon: Brain },
    { name: "MBE", href: "/mbe", icon: BookOpen },
    { name: "Flashcard Trainer", href: "/flashcards", icon: Layers },
    { name: "Weak Areas", href: "/weak-areas", icon: Target },
    { name: "Rule Bank", href: "/rule-bank", icon: Library },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Review", href: "/review", icon: RotateCcw },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }

    update()
    const interval = setInterval(update, 1000)

    return () => clearInterval(interval)
  }, [])

  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const initials =
    userName && userName.trim().length > 0
      ? userName
          .trim()
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U"

  const renderedStreakDays = useMemo(() => {
    if (streakDays.length > 0) return streakDays
    return Array.from({ length: 7 }, () => ({ status: "none" }))
  }, [streakDays])

  return (
    <div className="flex h-screen w-60 flex-col justify-between bg-slate-950 text-white">
      <div className="px-4 pt-5">
        <div className="mb-5">
          <div className="text-[17px] font-semibold tracking-[-0.02em]">
            Lexora Prep
          </div>

          <div className="mt-0.5 text-[11px] text-slate-400">
            Private Beta
          </div>
        </div>

        <div className="mb-4 text-[11px] leading-5 text-slate-400">
          <div>{date}</div>
          <div>{time}</div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-500/12 ring-1 ring-orange-400/20">
              <span className="text-[18px] leading-none">🔥</span>
            </div>

            <div className="min-w-0 leading-tight">
              <div className="text-[20px] font-semibold leading-none text-white">
                {studyStreak}
              </div>

              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-300">
                day streak
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {renderedStreakDays.map((d, i) => {
              const label = ["S", "M", "T", "W", "T", "F", "S"][i]

              const isFire = d?.status === "fire"
              const isIce = d?.status === "ice"
              const isNeutral = !isFire && !isIce

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={[
                      "flex h-7 w-full items-center justify-center rounded-xl border text-[10px] font-semibold transition-all duration-200",
                      isFire
                        ? "border-orange-300/30 bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.22)]"
                        : "",
                      isIce
                        ? "border-blue-300/25 bg-blue-400/12 text-blue-200"
                        : "",
                      isNeutral
                        ? "border-white/8 bg-white/5 text-slate-500"
                        : "",
                    ].join(" ")}
                  >
                    {isFire ? "✓" : isIce ? "✦" : ""}
                  </div>

                  <div className="text-[9px] text-slate-400">
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {menu.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex cursor-pointer items-center gap-3 border-t border-slate-800 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
          {initials}
        </div>

        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">
            {userName}
          </div>

          <div className="text-[11px] text-slate-400">
            Private Beta User
          </div>
        </div>
      </div>
    </div>
  )
}
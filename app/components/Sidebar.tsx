"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
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
  User,
  CreditCard,
  LogOut,
  ChevronUp,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type StreakDay = {
  status?: "fire" | "ice" | "none" | string
}

type SidebarProps = {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
  userName?: string
  studyStreak?: number
  streakDays?: StreakDay[]
  mbeAccess?: boolean
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  userName = "User",
  studyStreak = 0,
  streakDays = [],
  mbeAccess = false,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const menu = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Rule Training", href: "/rule-training", icon: Brain },
    ...(mbeAccess ? [{ name: "MBE", href: "/mbe", icon: BookOpen }] : []),
    { name: "Flashcard Trainer", href: "/flashcards", icon: Layers },
    { name: "Weak Areas", href: "/weak-areas", icon: Target },
    { name: "Rule Bank", href: "/rule-bank", icon: Library },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Review", href: "/review", icon: RotateCcw },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const profileMenuItems = [
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Subscription", href: "/subscription", icon: CreditCard },
  ]

  const [time, setTime] = useState("")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const profileMenuRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [pathname])

  async function handleLogout() {
    try {
      setProfileMenuOpen(false)
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("SIDEBAR LOGOUT ERROR:", error)
    }
  }

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
    <div
      className={`flex h-screen flex-col justify-between bg-slate-950 text-white transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-60"
      }`}
    >
      <div className="px-4 pt-5">
        <div className="mb-5 flex items-center justify-between">
          {!collapsed && (
            <div>
              <div className="text-[17px] font-semibold tracking-[-0.02em]">
                Lexora Prep
              </div>

              <div className="mt-0.5 text-[11px] text-slate-400">
                Private Beta
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>

        {!collapsed && (
          <>
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

                      <div className="text-[9px] text-slate-400">{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

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
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </div>

      <div
        className="relative border-t border-slate-800 px-4 py-4"
        ref={profileMenuRef}
      >
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              router.push("/profile")
              return
            }
            setProfileMenuOpen((prev) => !prev)
          }}
          className={`flex w-full items-center gap-3 ${
            collapsed ? "justify-center" : "justify-between"
          } rounded-xl px-2 py-2 transition hover:bg-slate-900`}
          title={collapsed ? userName : undefined}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
              {initials}
            </div>

            {!collapsed && (
              <div className="min-w-0 text-left leading-tight">
                <div className="truncate text-sm font-semibold">{userName}</div>
                <div className="text-[11px] text-slate-400">Private Beta User</div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronUp
              size={16}
              className={`text-slate-400 transition-transform ${
                profileMenuOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {!collapsed && profileMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 z-50 mb-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            {profileMenuItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    router.push(item.href)
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                    active
                      ? "bg-slate-800 text-white"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </button>
              )
            })}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-800"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
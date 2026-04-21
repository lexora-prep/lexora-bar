"use client"

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
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useUnsavedChanges } from "@/app/_providers/UnsavedChangesProvider"

type StreakDay = {
  status?: "fire" | "ice" | "none" | "empty" | string
}

type SidebarProps = {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
  userName?: string
  studyStreak?: number
  streakDays?: StreakDay[]
  mbeAccess?: boolean
  weakAreasCount?: number
}

type MenuItem = {
  name: string
  href: string
  icon: any
  locked?: boolean
  badge?: number | null
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  userName = "User",
  studyStreak = 0,
  streakDays = [],
  mbeAccess = false,
  weakAreasCount = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { requestNavigation } = useUnsavedChanges()

  const [time, setTime] = useState("")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [liveWeakAreasCount, setLiveWeakAreasCount] = useState<number>(weakAreasCount)

  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
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
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    setLiveWeakAreasCount(weakAreasCount)
  }, [weakAreasCount])

  useEffect(() => {
    let isMounted = true

    async function syncWeakAreasCount() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) return

        const res = await fetch(`/api/weak-areas?userId=${user.id}`, {
          cache: "no-store",
        })

        const result = await res.json().catch(() => null)
        if (!isMounted) return

        let nextCount = 0

        if (typeof result?.count === "number") {
          nextCount = result.count
        } else if (Array.isArray(result?.weakAreas)) {
          nextCount = result.weakAreas.length
        } else if (Array.isArray(result)) {
          nextCount = result.length
        }

        setLiveWeakAreasCount(nextCount)
      } catch (error) {
        console.error("SIDEBAR WEAK AREAS COUNT ERROR:", error)
      }
    }

    syncWeakAreasCount()

    return () => {
      isMounted = false
    }
  }, [pathname, supabase])

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

  function handleNavigate(href: string) {
    if (href === pathname) return
    requestNavigation(href)
  }

  function handleMenuClick(item: MenuItem) {
    if (item.locked) {
      handleNavigate("/subscription")
      return
    }

    handleNavigate(item.href)
  }

  const menu: MenuItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, locked: false },
    { name: "Rule Training", href: "/rule-training", icon: Brain, locked: false },
    { name: "MBE Practice", href: "/mbe", icon: BookOpen, locked: !mbeAccess },
    { name: "Flashcard Trainer", href: "/flashcards", icon: Layers, locked: false },
    {
      name: "Weak Areas",
      href: "/weak-areas",
      icon: Target,
      locked: false,
      badge: liveWeakAreasCount > 0 ? liveWeakAreasCount : null,
    },
    { name: "Rule Bank", href: "/rule-bank", icon: Library, locked: false },
    { name: "Analytics", href: "/analytics", icon: BarChart3, locked: false },
    { name: "Review", href: "/review", icon: RotateCcw, locked: false },
    { name: "Settings", href: "/settings", icon: Settings, locked: false },
  ]

  const profileMenuItems = [
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Subscription", href: "/subscription", icon: CreditCard },
  ]

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
      className={`flex h-screen flex-col justify-between border-r border-[#1E2330] bg-[#13161E] text-white transition-all duration-300 ${
        collapsed ? "w-[78px]" : "w-[260px]"
      }`}
    >
      <div className="px-4 pt-5">
        <div className="mb-6 flex items-center justify-between">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[17px] font-semibold tracking-[-0.02em] text-white">
                Lexora Prep
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2A3142] bg-[#1A1E2A] text-[#A7B0C2] transition hover:bg-[#202637] hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="mb-4 text-[11px] leading-5 text-[#6B7285]">
              <div>{date}</div>
              <div>{time}</div>
            </div>

            <div className="mb-5 rounded-[24px] border border-[#23293A] bg-[#1A1E2A] px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-orange-500/10 ring-1 ring-orange-400/15">
                  <span className="text-[18px] leading-none">🔥</span>
                </div>

                <div className="min-w-0 leading-tight">
                  <div className="text-[18px] font-semibold leading-none text-white">
                    {studyStreak}
                  </div>

                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#8892A4]">
                    Day streak
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
                          "flex h-9 w-full items-center justify-center rounded-[12px] border text-[10px] font-semibold transition-all duration-200",
                          isFire
                            ? "border-orange-300/20 bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.22)]"
                            : "",
                          isIce
                            ? "border-blue-300/20 bg-blue-400/10 text-blue-200"
                            : "",
                          isNeutral
                            ? "border-[#2A3142] bg-[#13161E] text-[#5E677C]"
                            : "",
                        ].join(" ")}
                      >
                        {isFire ? "✓" : isIce ? "✦" : ""}
                      </div>

                      <div className="text-[9px] text-[#6B7285]">{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          {menu.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href && !item.locked

            if (item.locked) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleMenuClick(item)}
                  className={`flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left transition text-[#A7B0C2] hover:bg-[#1A1E2A] hover:text-white ${
                    collapsed ? "justify-center" : ""
                  }`}
                  title={collapsed ? `${item.name} • Premium` : undefined}
                >
                  <Icon size={18} className="shrink-0" />

                  {!collapsed && (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate whitespace-nowrap text-[14px]">
                        {item.name}
                      </span>

                      <div className="flex shrink-0 flex-col items-center justify-center leading-none text-amber-300">
                        <Lock size={12} className="mb-1" />
                        <span className="text-[10px] font-semibold">Premium</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            }

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleMenuClick(item)}
                className={`flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left text-[14px] transition ${
                  active
                    ? "bg-[linear-gradient(90deg,rgba(107,127,227,.20),rgba(155,107,227,.10))] text-white shadow-sm"
                    : "text-[#A7B0C2] hover:bg-[#1A1E2A] hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate whitespace-nowrap">{item.name}</span>
                    {item.badge ? (
                      <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="relative border-t border-[#1E2330] px-4 py-4"
        ref={profileMenuRef}
      >
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              handleNavigate("/profile")
              return
            }
            setProfileMenuOpen((prev) => !prev)
          }}
          className={`flex w-full items-center gap-3 ${
            collapsed ? "justify-center" : "justify-between"
          } rounded-2xl px-2 py-2 transition hover:bg-[#1A1E2A]`}
          title={collapsed ? userName : undefined}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2B3448] text-sm font-semibold text-white">
              {initials}
            </div>

            {!collapsed && (
              <div className="min-w-0 text-left leading-tight">
                <div className="truncate text-sm font-semibold text-white">
                  {userName}
                </div>
                <div className="text-[11px] text-[#7C8598]">Student account</div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronUp
              size={16}
              className={`text-[#7C8598] transition-transform ${
                profileMenuOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {!collapsed && profileMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 z-50 mb-3 overflow-hidden rounded-2xl border border-[#2A3142] bg-[#171B26] shadow-2xl">
            {profileMenuItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    handleNavigate(item.href)
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                    active
                      ? "bg-[#222838] text-white"
                      : "text-[#D1D7E2] hover:bg-[#222838]"
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
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#222838]"
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
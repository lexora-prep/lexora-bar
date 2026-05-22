"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import Sidebar from "./components/Sidebar"
import TopNavbar from "./components/TopNavbar"
import UserActivityHeartbeat from "./components/UserActivityHeartbeat"

import { createClient } from "@/utils/supabase/client"

import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "./_providers/UnsavedChangesProvider"

type StreakDay = {
  status?: "fire" | "ice" | "none" | "empty" | string
}

type ShellData = {
  userName: string
  studyStreak: number
  streakDays: StreakDay[]
  mbeAccess: boolean
  weakAreasCount: number
  daysLeft: number | null
  hasStudyPlan: boolean
}

function buildFallbackShellData(): ShellData {
  return {
    userName: "User",
    studyStreak: 0,
    streakDays: buildFallbackStreakDays(),
    mbeAccess: false,
    weakAreasCount: 0,
    daysLeft: null,
    hasStudyPlan: false,
  }
}

function calculateDaysLeft(examDate: unknown): number | null {
  if (!examDate) return null

  const exam = new Date(String(examDate))
  if (Number.isNaN(exam.getTime())) return null

  const today = new Date()

  exam.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffMs = exam.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return diffDays >= 0 ? diffDays : 0
}

function normalizeShellData(data: any): ShellData {
  const profile = data?.profile ?? data ?? null
  const dashboard = data?.dashboard ?? null
  const weakAreas = data?.weakAreas ?? null
  const studyPlan = data?.studyPlan ?? null

  const daysLeft = calculateDaysLeft(studyPlan?.examDate)
  const hasStudyPlan = !!studyPlan?.examDate

  let weakAreasCount = 0

  if (typeof dashboard?.weakAreasCount === "number") {
    weakAreasCount = dashboard.weakAreasCount
  } else if (typeof weakAreas?.count === "number") {
    weakAreasCount = weakAreas.count
  } else if (Array.isArray(weakAreas?.weakAreas)) {
    weakAreasCount = weakAreas.weakAreas.length
  }

  return {
    userName: normalizeUserName(profile),
    studyStreak: Number(dashboard?.streak ?? 0),
    streakDays: Array.isArray(dashboard?.streakDays)
      ? dashboard.streakDays
      : buildFallbackStreakDays(),
    mbeAccess: !!profile?.mbe_access,
    weakAreasCount,
    daysLeft,
    hasStudyPlan,
  }
}

function isModifiedClick(event: React.MouseEvent<HTMLElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  )
}

function extractNavigationTarget(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null

  const anchor = target.closest("a[href]") as HTMLAnchorElement | null

  if (anchor) {
    const href = anchor.getAttribute("href")

    if (!href) return null
    if (href.startsWith("#")) return null
    if (isExternalHref(href)) return null

    return href
  }

  const buttonWithHref = target.closest("[data-href]") as HTMLElement | null

  if (buttonWithHref) {
    const href = buttonWithHref.getAttribute("data-href")

    if (!href) return null
    if (href.startsWith("#")) return null
    if (isExternalHref(href)) return null

    return href
  }

  return null
}

function buildFallbackStreakDays(): StreakDay[] {
  return Array.from({ length: 7 }, () => ({ status: "none" }))
}

function normalizeUserName(profile: any) {
  if (profile?.full_name && String(profile.full_name).trim()) {
    return String(profile.full_name).trim()
  }

  if (profile?.email && String(profile.email).trim()) {
    return String(profile.email).trim()
  }

  return "User"
}

function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const { requestNavigation } = useUnsavedChanges()

  const shellQuery = useQuery({
    queryKey: ["layout-shell-summary"],
    enabled: true,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        return buildFallbackShellData()
      }

      /*
        The global app shell must not wait for the heavy dashboard summary.
        It only needs the user's profile for the sidebar and top navbar name.
        Dashboard analytics are loaded by the dashboard page itself.
      */
      const res = await fetch("/api/profile", {
        cache: "no-store",
      })

      if (!res.ok) {
        return buildFallbackShellData()
      }

      const profile = await res.json().catch(() => null)

      return normalizeShellData(profile)
    },
  })

  const shellData = shellQuery.data ?? buildFallbackShellData()

  const handleProtectedNavigationCapture = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return
      if (isModifiedClick(event)) return

      const href = extractNavigationTarget(event.target)

      if (!href) return

      if (href === pathname) {
        event.preventDefault()
        return
      }

      event.preventDefault()
      event.stopPropagation()

      requestNavigation(href)
    },
    [pathname, requestNavigation]
  )

  const showTopNavbar = pathname === "/dashboard"

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300">
      <UserActivityHeartbeat />

      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "w-[78px]" : "w-[270px]"
        }`}
        onClickCapture={handleProtectedNavigationCapture}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userName={shellData.userName}
          studyStreak={shellData.studyStreak}
          streakDays={shellData.streakDays}
          mbeAccess={shellData.mbeAccess}
          weakAreasCount={shellData.weakAreasCount}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {showTopNavbar && (
          <div onClickCapture={handleProtectedNavigationCapture}>
            <TopNavbar
              collapsed={collapsed}
              userName={shellData.userName}
              daysLeft={shellData.daysLeft}
              hasStudyPlan={shellData.hasStudyPlan}
            />
          </div>
        )}

        <main
          className={`flex-1 overflow-y-auto bg-white ${
            showTopNavbar ? "p-4 md:p-5" : "p-4 md:p-5"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const publicRoutes = ["/", "/login", "/register"]

  const isAdminRoute = pathname.startsWith("/admin")
  const isPublicRoute = publicRoutes.includes(pathname)

  if (isPublicRoute || isAdminRoute) {
    return <>{children}</>
  }

  return (
    <UnsavedChangesProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </UnsavedChangesProvider>
  )
}
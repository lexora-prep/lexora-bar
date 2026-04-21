"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { usePathname } from "next/navigation"

import Sidebar from "./components/Sidebar"

import TopNavbar from "./components/TopNavbar"

import { createClient } from "@/utils/supabase/client"

import {

  UnsavedChangesProvider,

  useUnsavedChanges,

} from "./_providers/UnsavedChangesProvider"

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

function AuthenticatedShell({

  children,

}: {

  children: React.ReactNode

}) {

  const [collapsed, setCollapsed] = useState(false)

  const [userName, setUserName] = useState("User")

  const [studyStreak, setStudyStreak] = useState(0)

  const [streakDays, setStreakDays] = useState<any[]>([])

  const [mbeAccess, setMbeAccess] = useState(false)

  const [weakAreasCount, setWeakAreasCount] = useState(0)

  const pathname = usePathname()

  const supabase = useMemo(() => createClient(), [])

  const { requestNavigation } = useUnsavedChanges()

  useEffect(() => {

    async function loadSidebarData() {

      try {

        const {

          data: { user },

          error: userError,

        } = await supabase.auth.getUser()

        if (userError || !user) {

          setUserName("User")

          setStudyStreak(0)

          setStreakDays([])

          setMbeAccess(false)

          setWeakAreasCount(0)

          return

        }

        const [profileRes, dashboardRes] = await Promise.all([

          fetch(`/api/profile?userId=${user.id}`, {

            cache: "no-store",

          }),

          fetch(`/api/dashboard-analytics?userId=${user.id}`, {

            cache: "no-store",

          }),

        ])

        if (profileRes.ok) {

          const profile = await profileRes.json()

          if (profile?.full_name) {

            setUserName(profile.full_name)

          } else if (profile?.email) {

            setUserName(profile.email)

          } else {

            setUserName("User")

          }

          setMbeAccess(!!profile?.mbe_access)

        } else {

          setUserName("User")

          setMbeAccess(false)

        }

        if (dashboardRes.ok) {

          const dashboard = await dashboardRes.json()

          setStudyStreak(Number(dashboard?.streak ?? 0))

          setStreakDays(Array.isArray(dashboard?.streakDays) ? dashboard.streakDays : [])

          setWeakAreasCount(Number(dashboard?.weakAreasCount ?? 0))

        } else {

          setStudyStreak(0)

          setStreakDays([])

          setWeakAreasCount(0)

        }

      } catch (err) {

        console.error("CLIENT LAYOUT LOAD ERROR:", err)

        setUserName("User")

        setStudyStreak(0)

        setStreakDays([])

        setMbeAccess(false)

        setWeakAreasCount(0)

      }

    }

    loadSidebarData()

  }, [supabase, pathname])

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

      <div

        className={`transition-all duration-300 ease-in-out ${

          collapsed ? "w-[78px]" : "w-[270px]"

        }`}

        onClickCapture={handleProtectedNavigationCapture}

      >

        <Sidebar

          collapsed={collapsed}

          setCollapsed={setCollapsed}

          userName={userName}

          studyStreak={studyStreak}

          streakDays={streakDays}

          mbeAccess={mbeAccess}

          weakAreasCount={weakAreasCount}

        />

      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white">

        {showTopNavbar && (

          <div onClickCapture={handleProtectedNavigationCapture}>

            <TopNavbar collapsed={collapsed} />

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
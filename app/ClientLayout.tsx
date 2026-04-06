"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "./components/Sidebar"
import TopNavbar from "./components/TopNavbar"
import { createClient } from "@/utils/supabase/client"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState("User")
  const [studyStreak, setStudyStreak] = useState(0)
  const [mbeAccess, setMbeAccess] = useState(false)

  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  const publicRoutes = ["/", "/login", "/register"]
  const isAdminRoute = pathname.startsWith("/admin")
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("SUPABASE GET USER ERROR:", userError)
          return
        }

        if (!user) {
          setUserName("User")
          setStudyStreak(0)
          setMbeAccess(false)
          return
        }

        const profileRes = await fetch(`/api/profile?userId=${user.id}`)
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

        const dashboardRes = await fetch(`/api/dashboard-analytics?userId=${user.id}`)
        if (dashboardRes.ok) {
          const dashboard = await dashboardRes.json()

          setStudyStreak(
            dashboard?.streak ??
              dashboard?.streakDays?.filter((d: any) => d?.status === "fire")?.length ??
              0
          )
        } else {
          setStudyStreak(0)
        }
      } catch (err) {
        console.error("CLIENT LAYOUT LOAD ERROR:", err)
        setUserName("User")
        setStudyStreak(0)
        setMbeAccess(false)
      }
    }

    if (!isPublicRoute && !isAdminRoute) {
      loadSidebarData()
    }
  }, [isPublicRoute, isAdminRoute, supabase])

  if (isPublicRoute || isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userName={userName}
          studyStreak={studyStreak}
          mbeAccess={mbeAccess}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 bg-[#f5f4f2]">
        <TopNavbar collapsed={collapsed} />

        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  TicketPercent,
  Users,
  UserSquare2,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type PermissionSet = {
  canManageQuestions: boolean
  canManageRules: boolean
  canManageUsers: boolean
  canManageAnnouncements: boolean
  canViewBilling: boolean
  canManageCoupons: boolean
  canManageSettings: boolean
  canViewAuditLog: boolean
}

type CurrentUser = {
  id: string
  email: string
  fullName: string | null
  role: string
  adminRole: string | null
  isSuperAdmin: boolean
  permissions: PermissionSet
}

type Counts = {
  totalUsers: number
  paidSubscribers: number
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string | number
  show: boolean
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

function initials(fullName: string | null, email: string) {
  return (
    safeName(fullName, email)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "A"
  )
}

function Section({
  title,
  items,
  pathname,
  collapsed,
}: {
  title: string
  items: NavItem[]
  pathname: string
  collapsed: boolean
}) {
  const visibleItems = items.filter((item) => item.show)

  if (visibleItems.length === 0) return null

  return (
    <div className="mb-5">
      {!collapsed ? (
        <div className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E96A3]">
          {title}
        </div>
      ) : null}

      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 text-[14px] transition ${
                active
                  ? "bg-[#F2EEE7] text-[#111827]"
                  : "text-[#4B5563] hover:bg-[#F8F5EF] hover:text-[#111827]"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon size={16} className="shrink-0" />

              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined ? (
                    <span className="rounded bg-[#EEE8DD] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminShell({
  children,
  currentUser,
  counts,
}: {
  children: React.ReactNode
  currentUser: CurrentUser
  counts: Counts
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const profileRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const nav = useMemo(() => {
    const p = currentUser.permissions

    return {
      overview: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: "Analytics",
          href: "/admin/analytics",
          icon: BarChart3,
          show: true,
        },
        {
          label: "Billing",
          href: "/admin/billing",
          icon: CreditCard,
          show: p.canViewBilling || currentUser.isSuperAdmin,
        },
      ] satisfies NavItem[],

      content: [
        {
          label: "MBE Questions",
          href: "/admin/questions",
          icon: Bell,
          show: p.canManageQuestions || currentUser.isSuperAdmin,
        },
        {
          label: "Black Letter Rules",
          href: "/admin/rules",
          icon: BookOpen,
          show: p.canManageRules || currentUser.isSuperAdmin,
        },
      ] satisfies NavItem[],

      subscribers: [
        {
          label: "Users",
          href: "/admin/users",
          icon: Users,
          badge: counts.totalUsers,
          show: p.canManageUsers || currentUser.isSuperAdmin,
        },
        {
          label: "Subscriptions",
          href: "/admin/subscriptions",
          icon: CreditCard,
          badge: counts.paidSubscribers,
          show: p.canViewBilling || p.canManageUsers || currentUser.isSuperAdmin,
        },
        {
          label: "Coupons",
          href: "/admin/coupons",
          icon: TicketPercent,
          show: p.canManageCoupons || p.canViewBilling || currentUser.isSuperAdmin,
        },
      ] satisfies NavItem[],

      communications: [
        {
          label: "Announcements",
          href: "/admin/announcements",
          icon: Megaphone,
          show: p.canManageAnnouncements || currentUser.isSuperAdmin,
        },
        {
          label: "Team Workspace",
          href: "/admin/workspace",
          icon: FileText,
          show: true,
        },
        {
          label: "Teams",
          href: "/admin/team",
          icon: UserSquare2,
          show: p.canManageUsers || currentUser.isSuperAdmin,
        },
      ] satisfies NavItem[],

      system: [
        {
          label: "Settings",
          href: "/admin/settings",
          icon: Settings,
          show: p.canManageSettings || currentUser.isSuperAdmin,
        },
        {
          label: "Audit Log",
          href: "/admin/audit-log",
          icon: Shield,
          show: p.canViewAuditLog || currentUser.isSuperAdmin,
        },
      ] satisfies NavItem[],
    }
  }, [currentUser, counts])

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("LOGOUT ERROR:", error)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: collapsed ? "76px 1fr" : "242px 1fr" }}
      >
        <aside className="border-r border-[#DDD7CC] bg-[#F5F2EB]">
          <div className="flex h-full flex-col">
            <div className="border-b border-[#DDD7CC] px-4 py-4">
              <div
                className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3`}
              >
                {!collapsed ? (
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-[#111111] text-white">
                        <FileText size={16} />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-[#111827]">
                          Lexora Prep
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[#8E96A3]">
                          Admin Console
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#111111] text-white">
                    <FileText size={16} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#DDD7CC] bg-white text-[#6B7280] hover:bg-[#F9F7F2]"
                >
                  {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-0 py-4">
              <Section title="Overview" items={nav.overview} pathname={pathname} collapsed={collapsed} />
              <Section title="Content" items={nav.content} pathname={pathname} collapsed={collapsed} />
              <Section title="Subscribers" items={nav.subscribers} pathname={pathname} collapsed={collapsed} />
              <Section title="Communications" items={nav.communications} pathname={pathname} collapsed={collapsed} />
              <Section title="System" items={nav.system} pathname={pathname} collapsed={collapsed} />
            </div>

            <div className="border-t border-[#DDD7CC] px-3 py-3">
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className={`flex w-full items-center gap-3 px-2 py-2 text-left transition hover:bg-[#F9F7F2] ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C83F6] text-[12px] font-semibold text-white">
                    {initials(currentUser.fullName, currentUser.email)}
                  </div>

                  {!collapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-[#111827]">
                          {safeName(currentUser.fullName, currentUser.email)}
                        </div>
                        <div className="truncate text-[11px] text-[#8E96A3]">
                          {currentUser.isSuperAdmin ? "Super Admin" : currentUser.adminRole || currentUser.role}
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-[#6B7280]" />
                    </>
                  ) : null}
                </button>

                {profileOpen && !collapsed ? (
                  <div className="absolute bottom-full left-0 right-0 z-30 mb-2 border border-[#DDD7CC] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                    <div className="border-b border-[#EEE8DD] px-3 py-3">
                      <div className="truncate text-[13px] font-medium text-[#111827]">
                        {safeName(currentUser.fullName, currentUser.email)}
                      </div>
                      <div className="truncate text-[12px] text-[#6B7280]">
                        {currentUser.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/admin/workspace"
                        prefetch={false}
                        onClick={() => setProfileOpen(false)}
                        className="block px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F9F7F2]"
                      >
                        Team Workspace
                      </Link>

                      {(currentUser.permissions.canManageUsers || currentUser.isSuperAdmin) && (
                        <Link
                          href="/admin/team"
                          prefetch={false}
                          onClick={() => setProfileOpen(false)}
                          className="block px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F9F7F2]"
                        >
                          Teams
                        </Link>
                      )}

                      {(currentUser.permissions.canManageSettings || currentUser.isSuperAdmin) && (
                        <Link
                          href="/admin/settings"
                          prefetch={false}
                          onClick={() => setProfileOpen(false)}
                          className="block px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F9F7F2]"
                        >
                          Settings
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-[#EEE8DD] p-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#B42318] hover:bg-[#FFF4F2] disabled:opacity-60"
                      >
                        <LogOut size={14} />
                        {loggingOut ? "Logging out..." : "Log out"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
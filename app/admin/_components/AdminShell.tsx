"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  CreditCard,
  FileCheck2,
  FileText,
  Flag,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  MonitorCog,
  Palette,
  Percent,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  TicketPercent,
  Users,
  UserSquare2,
  Workflow,
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

type BadgeTone = "blue" | "amber" | "red" | "muted"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string | number
  badgeTone?: BadgeTone
  show: boolean
}

type NavSection = {
  title: string
  items: NavItem[]
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

function getPageTitle(pathname: string) {
  const clean = pathname.replace(/\/$/, "")

  const titles: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/analytics": "Analytics",
    "/admin/billing": "Billing",
    "/admin/subscription": "Subscriptions",
    "/admin/support": "Support Tickets",
    "/admin/users": "Users",
    "/admin/team": "Teams",
    "/admin/workspace": "Team Workspace",
    "/admin/questions": "MBE Questions",
    "/admin/rules": "BLL Rules",
    "/admin/announcements": "Announcements",
    "/admin/coupons": "Discounts",
    "/admin/legal-acceptances": "Legal Records",
    "/admin/audit-log": "Audit Log",
    "/admin/settings": "Settings",
  }

  if (titles[clean]) return titles[clean]

  if (clean.startsWith("/admin/users/")) return "User Details"
  if (clean.startsWith("/admin/questions/")) return "Question Details"
  if (clean.startsWith("/admin/rules/")) return "Rule Details"
  if (clean.startsWith("/admin/workspace")) return "Team Workspace"

  return "Admin Console"
}

function getBreadcrumb(pathname: string) {
  const title = getPageTitle(pathname)

  if (pathname === "/admin") {
    return ["Admin", "Overview", "Dashboard"]
  }

  const section =
    pathname.includes("billing") ||
    pathname.includes("subscription") ||
    pathname.includes("coupons")
      ? "Revenue"
      : pathname.includes("support")
        ? "Support"
        : pathname.includes("questions") || pathname.includes("rules")
          ? "Content"
          : pathname.includes("users") || pathname.includes("team")
            ? "Users"
            : pathname.includes("settings") || pathname.includes("audit")
              ? "System"
              : "Admin"

  return ["Admin", section, title]
}

function badgeClass(tone: BadgeTone = "blue") {
  if (tone === "amber") {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  if (tone === "red") {
    return "border border-red-200 bg-red-50 text-red-600"
  }

  if (tone === "muted") {
    return "border border-slate-200 bg-slate-100 text-slate-500"
  }

  return "bg-blue-600 text-white"
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
    <div className="mb-4">
      {!collapsed ? (
        <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition ${
                active
                  ? "bg-blue-50 font-semibold text-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              } ${collapsed ? "justify-center px-1.5" : ""}`}
            >
              <Icon
                size={15}
                className={`shrink-0 ${
                  active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />

              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${badgeClass(
                        item.badgeTone,
                      )}`}
                    >
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

  const nav = useMemo<NavSection[]>(() => {
    const p = currentUser.permissions
    const isSuperAdmin = currentUser.isSuperAdmin

    const canSeeUsers = p.canManageUsers || isSuperAdmin
    const canSeeBilling = p.canViewBilling || isSuperAdmin
    const canSeeSupport =
      p.canViewBilling || p.canManageUsers || p.canViewAuditLog || isSuperAdmin
    const canSeeContent = p.canManageQuestions || p.canManageRules || isSuperAdmin
    const canSeeAnnouncements = p.canManageAnnouncements || isSuperAdmin
    const canSeeSettings = p.canManageSettings || isSuperAdmin
    const canSeeAudit = p.canViewAuditLog || isSuperAdmin

    return [
      {
        title: "Overview",
        items: [
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
            label: "Scheduled Jobs",
            href: "/admin/jobs",
            icon: Workflow,
            show: isSuperAdmin,
          },
        ],
      },
      {
        title: "Users",
        items: [
          {
            label: "Users",
            href: "/admin/users",
            icon: Users,
            badge: counts.totalUsers,
            badgeTone: "blue",
            show: canSeeUsers,
          },
          {
            label: "Roles & Access",
            href: "/admin/team",
            icon: Shield,
            show: canSeeUsers,
          },
          {
            label: "Sessions",
            href: "/admin/sessions",
            icon: MonitorCog,
            show: isSuperAdmin,
          },
          {
            label: "Privacy Requests",
            href: "/admin/legal-acceptances",
            icon: ShieldAlert,
            show: canSeeUsers || canSeeAudit,
          },
        ],
      },
      {
        title: "Revenue",
        items: [
          {
            label: "Subscriptions",
            href: "/admin/subscription",
            icon: CreditCard,
            badge: counts.paidSubscribers,
            badgeTone: "blue",
            show: canSeeBilling || canSeeUsers,
          },
          {
            label: "Billing",
            href: "/admin/billing",
            icon: CreditCard,
            show: canSeeBilling,
          },
          {
            label: "Discounts",
            href: "/admin/coupons",
            icon: Percent,
            show: p.canManageCoupons || canSeeBilling,
          },
          {
            label: "Trial Funnel",
            href: "/admin/trial-funnel",
            icon: Gift,
            show: isSuperAdmin,
          },
        ],
      },
      {
        title: "Support",
        items: [
          {
            label: "Support Tickets",
            href: "/admin/support",
            icon: MessageSquare,
            badge: "3",
            badgeTone: "amber",
            show: canSeeSupport,
          },
          {
            label: "Reported Rules",
            href: "/admin/reported-rules",
            icon: AlertTriangle,
            badge: "2",
            badgeTone: "red",
            show: canSeeContent || canSeeSupport,
          },
          {
            label: "Email Delivery",
            href: "/admin/email-delivery",
            icon: Mail,
            show: isSuperAdmin,
          },
        ],
      },
      {
        title: "Content",
        items: [
          {
            label: "BLL Rules",
            href: "/admin/rules",
            icon: BookOpen,
            show: p.canManageRules || isSuperAdmin,
          },
          {
            label: "MBE Questions",
            href: "/admin/questions",
            icon: Bell,
            show: p.canManageQuestions || isSuperAdmin,
          },
          {
            label: "Subjects & Topics",
            href: "/admin/subjects",
            icon: FileText,
            show: canSeeContent,
          },
        ],
      },
      {
        title: "Communications",
        items: [
          {
            label: "Announcements",
            href: "/admin/announcements",
            icon: Megaphone,
            show: canSeeAnnouncements,
          },
          {
            label: "Bulk Messages",
            href: "/admin/bulk-messages",
            icon: MessageSquare,
            show: isSuperAdmin,
          },
        ],
      },
      {
        title: "Website Studio",
        items: [
          {
            label: "Theme Settings",
            href: "/admin/theme",
            icon: Palette,
            show: canSeeSettings,
          },
          {
            label: "Homepage Builder",
            href: "/admin/homepage",
            icon: Home,
            show: canSeeSettings,
          },
          {
            label: "Banner Manager",
            href: "/admin/banners",
            icon: Flag,
            show: canSeeSettings,
          },
          {
            label: "Legal Docs",
            href: "/admin/legal-acceptances",
            icon: FileCheck2,
            show: canSeeUsers || canSeeAudit,
          },
        ],
      },
      {
        title: "Teams",
        items: [
          {
            label: "Teams",
            href: "/admin/team",
            icon: UserSquare2,
            show: canSeeUsers,
          },
          {
            label: "Team Workspace",
            href: "/admin/workspace",
            icon: FileText,
            show: true,
          },
        ],
      },
      {
        title: "Configuration",
        items: [
          {
            label: "Menu Control",
            href: "/admin/menu-control",
            icon: MonitorCog,
            show: canSeeSettings,
          },
          {
            label: "Design Sandbox",
            href: "/admin/design-sandbox",
            icon: Sparkles,
            show: canSeeSettings,
          },
        ],
      },
      {
        title: "System",
        items: [
          {
            label: "Audit Log",
            href: "/admin/audit-log",
            icon: Shield,
            show: canSeeAudit,
          },
          {
            label: "Abuse Detection",
            href: "/admin/abuse-detection",
            icon: AlertTriangle,
            show: isSuperAdmin,
          },
          {
            label: "Environment",
            href: "/admin/environment",
            icon: MonitorCog,
            show: isSuperAdmin,
          },
          {
            label: "Settings",
            href: "/admin/settings",
            icon: Settings,
            show: canSeeSettings,
          },
        ],
      },
    ]
  }, [currentUser, counts])

  const pageTitle = getPageTitle(pathname)
  const breadcrumb = getBreadcrumb(pathname)

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
    <div className="min-h-screen bg-[#F7F9FC] text-slate-950">
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: collapsed ? "52px 1fr" : "232px 1fr" }}
      >
        <aside className="min-h-screen overflow-hidden border-r border-slate-200 bg-white">
          <div className="flex h-screen flex-col">
            <div className="flex min-h-[57px] items-center gap-2 border-b border-slate-200 px-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-serif text-[12px] font-bold text-white">
                L
              </div>

              {!collapsed ? (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold leading-4 text-slate-950">
                      Lexora Prep
                    </div>
                    <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Admin Console
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft size={15} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight size={15} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
              {nav.map((section) => (
                <Section
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </div>

            <div className="border-t border-slate-200 px-2 py-3">
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-slate-100 ${
                    collapsed ? "justify-center px-1" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-600">
                    {initials(currentUser.fullName, currentUser.email)}
                  </div>

                  {!collapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-slate-900">
                          {safeName(currentUser.fullName, currentUser.email)}
                        </div>
                        <div className="truncate text-[10.5px] text-slate-400">
                          {currentUser.isSuperAdmin
                            ? "Super Admin"
                            : currentUser.adminRole || currentUser.role}
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-slate-400" />
                    </>
                  ) : null}
                </button>

                {profileOpen && !collapsed ? (
                  <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <div className="truncate text-[13px] font-semibold text-slate-950">
                        {safeName(currentUser.fullName, currentUser.email)}
                      </div>
                      <div className="truncate text-[12px] text-slate-500">
                        {currentUser.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/admin/workspace"
                        prefetch={false}
                        onClick={() => setProfileOpen(false)}
                        className="block px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      >
                        Team Workspace
                      </Link>

                      {(currentUser.permissions.canManageUsers ||
                        currentUser.isSuperAdmin) && (
                        <Link
                          href="/admin/team"
                          prefetch={false}
                          onClick={() => setProfileOpen(false)}
                          className="block px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        >
                          Teams
                        </Link>
                      )}

                      {(currentUser.permissions.canManageUsers ||
                        currentUser.permissions.canViewAuditLog ||
                        currentUser.isSuperAdmin) && (
                        <Link
                          href="/admin/legal-acceptances"
                          prefetch={false}
                          onClick={() => setProfileOpen(false)}
                          className="block px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        >
                          Legal Records
                        </Link>
                      )}

                      {(currentUser.permissions.canManageSettings ||
                        currentUser.isSuperAdmin) && (
                        <Link
                          href="/admin/settings"
                          prefetch={false}
                          onClick={() => setProfileOpen(false)}
                          className="block px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        >
                          Settings
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 p-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-60"
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

        <main className="min-w-0">
          <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-6">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold leading-5 text-slate-950">
                {pageTitle}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-slate-400">
                {breadcrumb.map((item, index) => (
                  <span key={`${item}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <span className="text-slate-300">›</span> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              DEV
            </span>

            <button
              type="button"
              className="hidden h-8 min-w-[220px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-[12.5px] text-slate-400 hover:border-slate-300 md:flex"
            >
              <Search size={14} className="text-slate-500" />
              <span className="min-w-0 flex-1 truncate">Search anything...</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/admin/support"
              prefetch={false}
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Support tickets"
            >
              <Bell size={15} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </Link>

            <Link
              href="/admin/users"
              prefetch={false}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Users"
            >
              <CirclePlus size={16} />
            </Link>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[12px] font-bold text-blue-600">
              {initials(currentUser.fullName, currentUser.email)}
            </div>
          </header>

          <div className="min-h-[calc(100vh-56px)] bg-[#F7F9FC]">{children}</div>
        </main>
      </div>
    </div>
  )
}
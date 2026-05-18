"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileText,
  Flag,
  Globe2,
  Home,
  Image,
  LayoutDashboard,
  LockKeyhole,
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
  SlidersHorizontal,
  Sparkles,
  Users,
  UserSquare2,
  Zap,
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
  badgeTone?: "blue" | "amber" | "red" | "gray"
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

function badgeClass(tone: NavItem["badgeTone"] = "blue") {
  if (tone === "amber") return "border border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "red") return "border border-red-200 bg-red-50 text-red-600"
  if (tone === "gray") return "border border-slate-200 bg-slate-100 text-slate-500"
  return "bg-blue-600 text-white"
}

function pageTitle(pathname: string) {
  if (pathname === "/admin") return "Dashboard"
  if (pathname.startsWith("/admin/analytics")) return "Analytics"
  if (pathname.startsWith("/admin/scheduled-jobs")) return "Scheduled Jobs"
  if (pathname.startsWith("/admin/users")) return "Users"
  if (pathname.startsWith("/admin/roles-access")) return "Roles & Access"
  if (pathname.startsWith("/admin/sessions")) return "Sessions"
  if (pathname.startsWith("/admin/privacy-requests")) return "Privacy Requests"
  if (pathname.startsWith("/admin/subscription")) return "Subscriptions"
  if (pathname.startsWith("/admin/billing")) return "Billing"
  if (pathname.startsWith("/admin/coupons")) return "Discounts"
  if (pathname.startsWith("/admin/trial-funnel")) return "Trial Funnel"
  if (pathname.startsWith("/admin/support")) return "Support Tickets"
  if (pathname.startsWith("/admin/reported-rules")) return "Reported Rules"
  if (pathname.startsWith("/admin/email-delivery")) return "Email Delivery"
  if (pathname.startsWith("/admin/rules")) return "BLL Rules"
  if (pathname.startsWith("/admin/questions")) return "MBE Questions"
  if (pathname.startsWith("/admin/subjects-topics")) return "Subjects & Topics"
  if (pathname.startsWith("/admin/announcements")) return "Announcements"
  if (pathname.startsWith("/admin/bulk-messages")) return "Bulk Messages"
  if (pathname.startsWith("/admin/theme-settings")) return "Theme Settings"
  if (pathname.startsWith("/admin/homepage-builder")) return "Homepage Builder"
  if (pathname.startsWith("/admin/banner-manager")) return "Banner Manager"
  if (pathname.startsWith("/admin/legal-docs")) return "Legal Docs"
  if (pathname.startsWith("/admin/team")) return "Teams"
  if (pathname.startsWith("/admin/workspace")) return "Team Workspace"
  if (pathname.startsWith("/admin/menu-control")) return "Menu Control"
  if (pathname.startsWith("/admin/design-sandbox")) return "Design Sandbox"
  if (pathname.startsWith("/admin/rule-bank")) return "Rule Bank"
  if (pathname.startsWith("/admin/audit-log")) return "Audit Log"
  if (pathname.startsWith("/admin/abuse-detection")) return "Abuse Detection"
  if (pathname.startsWith("/admin/environment")) return "Environment"
  if (pathname.startsWith("/admin/settings")) return "Settings"
  return "Admin Console"
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
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                  ? "bg-blue-50 font-medium text-blue-600"
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
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${badgeClass(
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

  const nav = useMemo(() => {
    const p = currentUser.permissions
    const isSuperAdmin = currentUser.isSuperAdmin

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
          label: "Scheduled Jobs",
          href: "/admin/scheduled-jobs",
          icon: CalendarClock,
          show: true,
        },
      ] satisfies NavItem[],

      users: [
        {
          label: "Users",
          href: "/admin/users",
          icon: Users,
          badge: counts.totalUsers,
          badgeTone: "blue",
          show: p.canManageUsers || isSuperAdmin,
        },
        {
          label: "Roles & Access",
          href: "/admin/roles-access",
          icon: LockKeyhole,
          show: p.canManageUsers || isSuperAdmin,
        },
        {
          label: "Sessions",
          href: "/admin/sessions",
          icon: MonitorCog,
          show: p.canManageUsers || p.canViewAuditLog || isSuperAdmin,
        },
        {
          label: "Privacy Requests",
          href: "/admin/privacy-requests",
          icon: Shield,
          badge: 1,
          badgeTone: "amber",
          show: p.canManageUsers || p.canViewAuditLog || isSuperAdmin,
        },
      ] satisfies NavItem[],

      revenue: [
        {
          label: "Subscriptions",
          href: "/admin/subscription",
          icon: CreditCard,
          badge: counts.paidSubscribers,
          badgeTone: "blue",
          show: p.canViewBilling || p.canManageUsers || isSuperAdmin,
        },
        {
          label: "Billing",
          href: "/admin/billing",
          icon: CreditCard,
          show: p.canViewBilling || isSuperAdmin,
        },
        {
          label: "Discounts",
          href: "/admin/coupons",
          icon: Percent,
          show: p.canManageCoupons || p.canViewBilling || isSuperAdmin,
        },
        {
          label: "Trial Funnel",
          href: "/admin/trial-funnel",
          icon: Zap,
          show: p.canViewBilling || p.canManageUsers || isSuperAdmin,
        },
      ] satisfies NavItem[],

      support: [
        {
          label: "Support Tickets",
          href: "/admin/support",
          icon: MessageSquare,
          badge: 3,
          badgeTone: "amber",
          show:
            p.canViewBilling ||
            p.canManageUsers ||
            p.canViewAuditLog ||
            isSuperAdmin,
        },
        {
          label: "Reported Rules",
          href: "/admin/reported-rules",
          icon: AlertTriangle,
          badge: 2,
          badgeTone: "red",
          show: p.canManageRules || p.canManageQuestions || isSuperAdmin,
        },
        {
          label: "Email Delivery",
          href: "/admin/email-delivery",
          icon: Mail,
          show: p.canManageSettings || p.canManageAnnouncements || isSuperAdmin,
        },
      ] satisfies NavItem[],

      content: [
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
          href: "/admin/subjects-topics",
          icon: GridIcon,
          show: p.canManageQuestions || p.canManageRules || isSuperAdmin,
        },
      ] satisfies NavItem[],

      communications: [
        {
          label: "Announcements",
          href: "/admin/announcements",
          icon: Megaphone,
          show: p.canManageAnnouncements || isSuperAdmin,
        },
        {
          label: "Bulk Messages",
          href: "/admin/bulk-messages",
          icon: Mail,
          show: p.canManageAnnouncements || isSuperAdmin,
        },
      ] satisfies NavItem[],

      websiteStudio: [
        {
          label: "Theme Settings",
          href: "/admin/theme-settings",
          icon: Palette,
          show: p.canManageSettings || isSuperAdmin,
        },
        {
          label: "Homepage Builder",
          href: "/admin/homepage-builder",
          icon: Home,
          show: p.canManageSettings || isSuperAdmin,
        },
        {
          label: "Banner Manager",
          href: "/admin/banner-manager",
          icon: Image,
          show: p.canManageSettings || isSuperAdmin,
        },
        {
          label: "Legal Docs",
          href: "/admin/legal-docs",
          icon: FileCheck2,
          show: p.canManageSettings || p.canViewAuditLog || isSuperAdmin,
        },
      ] satisfies NavItem[],

      teams: [
        {
          label: "Teams",
          href: "/admin/team",
          icon: UserSquare2,
          show: p.canManageUsers || isSuperAdmin,
        },
        {
          label: "Team Workspace",
          href: "/admin/workspace",
          icon: Briefcase,
          show: true,
        },
      ] satisfies NavItem[],

      configuration: [
        {
          label: "Menu Control",
          href: "/admin/menu-control",
          icon: SlidersHorizontal,
          show: p.canManageSettings || isSuperAdmin,
        },
        {
          label: "Design Sandbox",
          href: "/admin/design-sandbox",
          icon: Sparkles,
          show: p.canManageSettings || isSuperAdmin,
        },
      ] satisfies NavItem[],

      ruleManagement: [
        {
          label: "Rule Bank",
          href: "/admin/rule-bank",
          icon: BookOpen,
          show: p.canManageRules || isSuperAdmin,
        },
      ] satisfies NavItem[],

      system: [
        {
          label: "Audit Log",
          href: "/admin/audit-log",
          icon: FileText,
          show: p.canViewAuditLog || isSuperAdmin,
        },
        {
          label: "Abuse Detection",
          href: "/admin/abuse-detection",
          icon: Flag,
          show: p.canViewAuditLog || p.canManageUsers || isSuperAdmin,
        },
        {
          label: "Environment",
          href: "/admin/environment",
          icon: Globe2,
          show: p.canManageSettings || isSuperAdmin,
        },
        {
          label: "Settings",
          href: "/admin/settings",
          icon: Settings,
          show: p.canManageSettings || isSuperAdmin,
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
    <div className="min-h-screen bg-[#F7F9FC] text-slate-950">
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: collapsed ? "56px 1fr" : "232px 1fr" }}
      >
        <aside className="min-h-screen overflow-hidden border-r border-slate-200 bg-white">
          <div className="flex h-screen flex-col">
            <div className="flex h-14 items-center border-b border-slate-200 px-3">
              {collapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  aria-label="Expand sidebar"
                  title="Expand menu"
                >
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 font-serif text-[13px] font-semibold text-white">
                    L
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-4 text-slate-950">
                      Lexora Prep
                    </div>
                    <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Admin Console
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Collapse sidebar"
                    title="Collapse menu"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
              <Section title="Overview" items={nav.overview} pathname={pathname} collapsed={collapsed} />
              <Section title="Users" items={nav.users} pathname={pathname} collapsed={collapsed} />
              <Section title="Revenue" items={nav.revenue} pathname={pathname} collapsed={collapsed} />
              <Section title="Support" items={nav.support} pathname={pathname} collapsed={collapsed} />
              <Section title="Content" items={nav.content} pathname={pathname} collapsed={collapsed} />
              <Section title="Communications" items={nav.communications} pathname={pathname} collapsed={collapsed} />
              <Section title="Website Studio" items={nav.websiteStudio} pathname={pathname} collapsed={collapsed} />
              <Section title="Teams" items={nav.teams} pathname={pathname} collapsed={collapsed} />
              <Section title="Configuration" items={nav.configuration} pathname={pathname} collapsed={collapsed} />
              <Section title="Rule Management" items={nav.ruleManagement} pathname={pathname} collapsed={collapsed} />
              <Section title="System" items={nav.system} pathname={pathname} collapsed={collapsed} />
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-600">
                    {initials(currentUser.fullName, currentUser.email)}
                  </div>

                  {!collapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-slate-900">
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
                      <div className="truncate text-[13px] font-medium text-slate-950">
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
              <div className="truncate text-[15px] font-semibold leading-5 text-slate-950">
                {pageTitle(pathname)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-slate-400">
                Admin › {pageTitle(pathname)}
              </div>
            </div>

            <div className="flex-1" />

            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              DEV
            </span>

            <button
              type="button"
              className="hidden h-8 min-w-[220px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-[12.5px] text-slate-400 hover:border-slate-300 md:flex"
            >
              <Search size={14} />
              Search anything...
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

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-600">
              {initials(currentUser.fullName, currentUser.email)}
            </div>
          </header>

          <div className="min-h-[calc(100vh-56px)] bg-[#F7F9FC]">{children}</div>
        </main>
      </div>
    </div>
  )
}

function GridIcon({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  )
}
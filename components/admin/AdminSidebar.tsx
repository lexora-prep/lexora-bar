"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, LogOut, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { adminNavGroups, type AdminPermissionKey } from "./admin-nav"

type AdminSidebarProps = {
  userName: string
  userRole: string
  badgeCounts: {
    questions: number
    rules: number
    users: number
    subscribers: number
  }
  permissions: Record<AdminPermissionKey, boolean>
}

function formatBadge(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A"
  )
}

export default function AdminSidebar({
  userName,
  userRole,
  badgeCounts,
  permissions,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("ADMIN SIDEBAR LOGOUT ERROR:", error)
    }
  }

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permission) return true
        return !!permissions[item.permission]
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside className="flex h-screen w-[248px] flex-col border-r border-[#E6EAF0] bg-[#FBFCFE]">
      <div className="border-b border-[#E6EAF0] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#60A5FA] text-[12px] font-semibold text-white">
            O
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[24px] font-semibold leading-none text-[#111827]">
              Lexora
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#7C8798]">
  Admin Panel
</div>
          </div>

          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4F46E5]">
            {userRole}
          </span>
        </div>
      </div>

      <div className="border-b border-[#E6EAF0] px-4 py-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
          <input
            placeholder="Search anything..."
            className="w-full rounded-2xl border border-[#E6EAF0] bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none placeholder:text-[#98A2B3]"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7C8798]">
              {group.label}
            </div>

            <div className="space-y-1 px-2">
              {group.items.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href))

                const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : null

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] transition ${
                      active
                        ? "bg-[#EEF2FF] text-[#4F46E5]"
                        : "text-[#344054] hover:bg-[#F3F4F6]"
                    }`}
                  >
                    <Icon size={17} />
                    <span className="flex-1">{item.label}</span>

                    {typeof badgeValue === "number" ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active
                            ? "bg-white text-[#4F46E5]"
                            : "bg-[#F97316] text-white"
                        }`}
                      >
                        {formatBadge(badgeValue)}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div ref={menuRef} className="border-t border-[#E6EAF0] px-4 py-4">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left transition hover:bg-[#F3F4F6]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#60A5FA] text-[12px] font-semibold text-white">
            {getInitials(userName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[#111827]">
              {userName}
            </div>
            <div className="text-[11px] text-[#7C8798]">{userRole}</div>
          </div>

          <ChevronDown
            size={14}
            className={`text-[#98A2B3] transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white shadow-lg">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] text-[#DC2626] hover:bg-[#FEF2F2]"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
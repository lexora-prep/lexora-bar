"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, X } from "lucide-react"

type TopNavbarProps = {
  collapsed?: boolean
  userName?: string
  daysLeft?: number | null
  hasStudyPlan?: boolean
}

type NotificationItem = {
  id: string
  type?: string | null
  title: string
  body: string
  link?: string | null
  severity?: string | null
  metadata?: unknown
  is_read?: boolean
  read_at?: string | null
  created_at?: string
}

export default function TopNavbar({
  collapsed,
  userName = "there",
  daysLeft = null,
  hasStudyPlan = false,
}: TopNavbarProps) {
  const loading = false

  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const notificationRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setNotificationsLoading(true)

    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      setNotifications(Array.isArray(data?.notifications) ? data.notifications : [])
      setUnreadCount(Number(data?.unreadCount ?? 0))
    } catch (error) {
      console.error("NOTIFICATIONS LOAD ERROR:", error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setNotificationsLoading(false)
    }
  }

  async function handleBellClick() {
    const nextOpen = !notificationOpen
    setNotificationOpen(nextOpen)

    if (nextOpen) {
      await loadNotifications()
    }
  }

  const greeting = getGreeting()
  const hasUnreadNotifications = unreadCount > 0

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5 md:px-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[15px] font-medium tracking-[-0.02em] text-slate-900 md:text-[17px]">
            {loading ? "Loading..." : `${greeting}, ${userName}`}
          </div>

          <div className="mt-2 text-[13px] font-normal leading-6 text-slate-500 md:text-[14px]">
            {loading ? (
              "Loading your progress..."
            ) : hasStudyPlan && daysLeft !== null ? (
              <>
                Your bar exam is in{" "}
                <span className="font-semibold text-blue-600">
                  {daysLeft} {daysLeft === 1 ? "day" : "days"}
                </span>
                . Stay consistent and keep building your score.
              </>
            ) : (
              <>Set your study plan to see your exam countdown and daily targets.</>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-3" ref={notificationRef}>
          <button
            type="button"
            onClick={handleBellClick}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Open notifications"
          >
            <Bell size={18} />

            <span
              className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ${
                hasUnreadNotifications ? "bg-red-500" : "bg-slate-300"
              }`}
            />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-12 z-50 w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Notifications
                  </div>
                  <div className="text-xs text-slate-500">
                    {unreadCount > 0
                      ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                      : "Updates from Lexora"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationOpen(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    Loading notifications...
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`px-4 py-4 ${
                          item.is_read ? "bg-white" : "bg-violet-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </div>

                          {!item.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                          )}
                        </div>

                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {item.body}
                        </div>

                        {item.created_at && (
                          <div className="mt-2 text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    No notifications right now.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

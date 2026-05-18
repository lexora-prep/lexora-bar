"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Circle,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react"

type AdminNotification = {
  id: string
  adminId: string
  actorAdminId: string | null
  type: string
  title: string
  body: string
  href: string | null
  metadata: unknown
  readAt: string | null
  createdAt: string
}

type NotificationsResponse = {
  ok: boolean
  unreadCount: number
  notifications: AdminNotification[]
  error?: string
}

function formatNotificationTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) return `${diffHours}h ago`

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function notificationIcon(type: string) {
  const normalized = type.toLowerCase()

  if (normalized.includes("ticket") || normalized.includes("support")) {
    return <MessageSquare size={15} />
  }

  return <Bell size={15} />
}

export default function AdminNotificationsBell() {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [toast, setToast] = useState<AdminNotification | null>(null)

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const knownUnreadIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasUnread = unreadCount > 0

  const visibleNotifications = useMemo(() => {
    return notifications.slice(0, 12)
  }, [notifications])

  async function loadNotifications(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const res = await fetch("/api/admin/notifications?limit=20", {
        cache: "no-store",
      })

      const data = (await res.json().catch(() => null)) as NotificationsResponse | null

      if (!res.ok || !data?.ok) {
        return
      }

      const nextNotifications = Array.isArray(data.notifications)
        ? data.notifications
        : []

      const nextUnreadIds = new Set(
        nextNotifications
          .filter((item) => !item.readAt)
          .map((item) => item.id),
      )

      if (initializedRef.current) {
        const newUnread = nextNotifications.find(
          (item) => !item.readAt && !knownUnreadIdsRef.current.has(item.id),
        )

        if (newUnread) {
          setToast(newUnread)

          if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
          }

          toastTimerRef.current = setTimeout(() => {
            setToast(null)
          }, 5500)
        }
      }

      knownUnreadIdsRef.current = nextUnreadIds
      initializedRef.current = true

      setNotifications(nextNotifications)
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0)
    } catch (error) {
      console.error("ADMIN NOTIFICATIONS LOAD ERROR:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function markOneRead(notificationId: string) {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: "POST",
        cache: "no-store",
      })

      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId && !item.readAt
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      )

      setUnreadCount((value) => Math.max(0, value - 1))
      knownUnreadIdsRef.current.delete(notificationId)
    } catch (error) {
      console.error("ADMIN NOTIFICATION READ ERROR:", error)
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications/read-all", {
        method: "POST",
        cache: "no-store",
      })

      const now = new Date().toISOString()

      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          readAt: item.readAt || now,
        })),
      )

      setUnreadCount(0)
      knownUnreadIdsRef.current.clear()
    } catch (error) {
      console.error("ADMIN NOTIFICATIONS READ ALL ERROR:", error)
    }
  }

  async function openNotification(notification: AdminNotification) {
    await markOneRead(notification.id)
    setOpen(false)
    setToast(null)

    if (notification.href) {
      router.push(notification.href)
      router.refresh()
    }
  }

  useEffect(() => {
    loadNotifications(true)

    const interval = window.setInterval(() => {
      loadNotifications(false)
    }, 12000)

    return () => {
      window.clearInterval(interval)

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`relative flex h-8 w-8 items-center justify-center rounded-md border transition ${
            open
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
          aria-label="Admin notifications"
          title="Notifications"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}

          {hasUnread ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 top-10 z-50 w-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold text-slate-950">
                  Notifications
                </div>
                <div className="mt-0.5 text-[11.5px] text-slate-400">
                  {unreadCount > 0
                    ? `${unreadCount} unread admin notification${unreadCount === 1 ? "" : "s"}`
                    : "You are all caught up"}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    <CheckCheck size={13} />
                    Read all
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Bell size={18} />
                  </div>
                  <div className="mt-3 text-[13px] font-semibold text-slate-700">
                    No notifications yet
                  </div>
                  <div className="mt-1 text-[12px] text-slate-400">
                    Assigned tickets and admin alerts will appear here.
                  </div>
                </div>
              ) : (
                visibleNotifications.map((notification) => {
                  const unread = !notification.readAt

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`grid w-full grid-cols-[32px_minmax(0,1fr)_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${
                        unread ? "bg-blue-50/55 hover:bg-blue-50" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          unread
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {notificationIcon(notification.type)}
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          {unread ? (
                            <Circle size={7} className="fill-blue-600 text-blue-600" />
                          ) : null}
                          <span className="truncate text-[13px] font-semibold text-slate-950">
                            {notification.title}
                          </span>
                        </span>

                        <span className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">
                          {notification.body}
                        </span>
                      </span>

                      <span className="text-[11px] font-medium text-slate-400">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-[11.5px] text-slate-400">
                Auto refreshes every 12 seconds
              </span>

              <button
                type="button"
                onClick={() => loadNotifications(false)}
                disabled={refreshing}
                className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[120] w-[360px] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-2xl">
          <button
            type="button"
            onClick={() => openNotification(toast)}
            className="grid w-full grid-cols-[36px_minmax(0,1fr)_24px] gap-3 px-4 py-3 text-left hover:bg-blue-50/50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              {notificationIcon(toast.type)}
            </span>

            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-slate-950">
                {toast.title}
              </span>
              <span className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">
                {toast.body}
              </span>
            </span>

            <span
              onClick={(event) => {
                event.stopPropagation()
                setToast(null)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </span>
          </button>
        </div>
      ) : null}
    </>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, CheckCircle2, XCircle } from "lucide-react"

type ToastKind = "success" | "error" | "announcement"

type ToastItem = {
  id: string
  kind: ToastKind
  title: string
  body?: string
}

type AnnouncementItem = {
  id: string
  title: string
  body?: string
  created_at?: string
}

declare global {
  interface WindowEventMap {
    "lexora:toast": CustomEvent<{
      kind?: ToastKind
      title: string
      body?: string
    }>
  }
}

const ANNOUNCEMENT_STORAGE_KEY = "lexora_seen_announcement_toasts"

function getSeenAnnouncementIds() {
  if (typeof window === "undefined") return new Set<string>()

  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set<string>()
  }
}

function saveSeenAnnouncementIds(ids: Set<string>) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      ANNOUNCEMENT_STORAGE_KEY,
      JSON.stringify(Array.from(ids).slice(-100))
    )
  } catch {
    // Do nothing. Toasts should not break the app.
  }
}

export default function GlobalToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function removeToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id))

    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }

  function pushToast(input: Omit<ToastItem, "id">) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    const nextToast: ToastItem = {
      id,
      ...input,
    }

    setToasts((current) => [...current.slice(-2), nextToast])

    timersRef.current[id] = setTimeout(() => {
      removeToast(id)
    }, input.kind === "announcement" ? 7000 : 3500)
  }

  useEffect(() => {
    function handleToast(event: WindowEventMap["lexora:toast"]) {
      const detail = event.detail

      if (!detail?.title) return

      pushToast({
        kind: detail.kind ?? "success",
        title: detail.title,
        body: detail.body,
      })
    }

    window.addEventListener("lexora:toast", handleToast)

    return () => {
      window.removeEventListener("lexora:toast", handleToast)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAnnouncements() {
      try {
        const res = await fetch("/api/announcements/active", {
          cache: "no-store",
        })

        const data = await res.json().catch(() => null)

        if (!res.ok || cancelled) return

        const announcements: AnnouncementItem[] = Array.isArray(data?.announcements)
          ? data.announcements
          : []

        if (announcements.length === 0) return

        const seenIds = getSeenAnnouncementIds()
        const unseen = announcements.filter((item) => item?.id && !seenIds.has(item.id))

        if (unseen.length === 0) return

        const newest = unseen[0]

        pushToast({
          kind: "announcement",
          title: newest.title || "Announcement",
          body: newest.body || "You have a new announcement from Lexora.",
        })

        unseen.forEach((item) => {
          if (item.id) seenIds.add(item.id)
        })

        saveSeenAnnouncementIds(seenIds)
      } catch (error) {
        console.error("GLOBAL ANNOUNCEMENT TOAST ERROR:", error)
      }
    }

    loadAnnouncements()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
      timersRef.current = {}
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex w-[calc(100vw-2.5rem)] max-w-[390px] flex-col gap-3">
      {toasts.map((toast) => {
        const isSuccess = toast.kind === "success"
        const isError = toast.kind === "error"
        const isAnnouncement = toast.kind === "announcement"

        return (
          <div
            key={toast.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isSuccess
                    ? "bg-emerald-50 text-emerald-600"
                    : isError
                      ? "bg-red-50 text-red-600"
                      : "bg-blue-50 text-blue-600"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 size={19} />
                ) : isError ? (
                  <XCircle size={19} />
                ) : (
                  <Bell size={19} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-950">
                  {toast.title}
                </div>

                {toast.body && (
                  <div className="mt-1 text-sm leading-5 text-slate-600">
                    {toast.body}
                  </div>
                )}

                {isAnnouncement && (
                  <div className="mt-2 text-xs font-medium text-blue-600">
                    New announcement
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import * as Ably from "ably"
import { Bell, MessageCircle, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type RealtimeNotificationPayload = {
  id?: string
  title?: string
  body?: string
  href?: string | null
  type?: string
  severity?: string
  createdAt?: string
}

type RealtimeDmMessage = {
  id: string
  threadId: string
  authorId: string
  author: string
  role: string
  content: string
  createdAt: string
  editedAt: string | null
  readBy: string[]
  isDeleted: boolean
}

type AdminRealtimeEvent = {
  type: string
  recipientId: string
  senderId?: string
  senderName?: string
  threadId?: string
  notification?: RealtimeNotificationPayload
  dmMessage?: RealtimeDmMessage
}

type ToastState = {
  id: string
  title: string
  body: string
  href: string | null
  type: string
}

function cleanText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : ""
  return text || fallback
}

export default function AdminRealtimeBridge() {
  const clientRef = useRef<Ably.Realtime | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenEventIdsRef = useRef<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    let alive = true

    const client = new Ably.Realtime({
      authUrl: "/api/admin/ably-token",
      autoConnect: true,
      closeOnUnload: true,
    })

    clientRef.current = client

    async function subscribe() {
      try {
        const tokenDetails = await client.auth.authorize()
        const clientId = tokenDetails.clientId

        if (!alive || !clientId) return

        const channel = client.channels.get(`admin:user:${clientId}`)

        await channel.subscribe((message) => {
          const data = message.data as AdminRealtimeEvent | null
          if (!data) return

          const eventId =
            cleanText(data.dmMessage?.id, "") ||
            cleanText(data.notification?.id, "") ||
            cleanText(message.id, "") ||
            `${message.timestamp || Date.now()}`

          if (seenEventIdsRef.current.has(eventId)) return

          seenEventIdsRef.current.add(eventId)

          if (seenEventIdsRef.current.size > 100) {
            const ids = Array.from(seenEventIdsRef.current)
            seenEventIdsRef.current = new Set(ids.slice(-50))
          }

          window.dispatchEvent(
            new CustomEvent("admin:realtime", {
              detail: data,
            }),
          )

          if (data.notification) {
            window.dispatchEvent(
              new CustomEvent("admin:notification-created", {
                detail: data.notification,
              }),
            )
          }

          const notification = data.notification

          const nextToast: ToastState = {
            id: eventId,
            title:
              cleanText(notification?.title, "") ||
              (data.type === "team_dm_message" ? "New direct message" : "New notification"),
            body:
              cleanText(notification?.body, "") ||
              (data.dmMessage
                ? `${data.dmMessage.author}: ${data.dmMessage.content}`
                : "Something new happened in the admin workspace."),
            href:
              notification?.href ||
              (data.senderId ? `/admin/workspace?dm=${data.senderId}` : null),
            type: cleanText(notification?.type || data.type, "system_alert"),
          }

          setToast(nextToast)

          if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
          }

          toastTimerRef.current = setTimeout(() => {
            setToast(null)
          }, 5500)
        })
      } catch (error) {
        console.error("ADMIN REALTIME SUBSCRIBE ERROR:", error)
      }
    }

    void subscribe()

    return () => {
      alive = false

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }

      const activeClient = clientRef.current
      clientRef.current = null

      if (activeClient) {
        activeClient.close()
      }
    }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-40px)]">
      <button
        type="button"
        onClick={() => {
          if (toast.href) {
            window.location.href = toast.href
          }
        }}
        className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl shadow-slate-900/15 transition hover:-translate-y-0.5 hover:shadow-slate-900/20"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {toast.type === "team_dm_message" || toast.type === "workspace_dm" ? (
            <MessageCircle size={17} />
          ) : (
            <Bell size={17} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-950">
            {toast.title}
          </span>
          <span className="mt-1 line-clamp-2 block text-[12.5px] leading-5 text-slate-500">
            {toast.body}
          </span>
          {toast.href ? (
            <span className="mt-2 block text-[11px] font-semibold text-blue-600">
              Open now
            </span>
          ) : null}
        </span>

        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            setToast(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation()
              setToast(null)
            }
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </span>
      </button>
    </div>
  )
}

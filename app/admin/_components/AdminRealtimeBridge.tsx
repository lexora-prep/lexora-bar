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

type WorkspaceTypingPayload = {
  type: "workspace_typing"
  scope: "channel" | "dm"
  targetId: string
  senderId: string
  senderName: string
  isTyping: boolean
  createdAt: string
}

type ToastState = {
  id: string
  title: string
  body: string
  href: string | null
  type: string
}

type AblyTokenRequestPayload = {
  keyName: string
  ttl: number
  timestamp: number
  capability: string
  clientId: string
  nonce: string
  mac: string
}

let cachedTokenRequest: AblyTokenRequestPayload | null = null
let cachedTokenFetchedAt = 0
let tokenRequestPromise: Promise<AblyTokenRequestPayload> | null = null

function cleanText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : ""
  return text || fallback
}

function getPopupsEnabled() {
  if (typeof window === "undefined") return true
  const value = window.localStorage.getItem("lexora:admin:notification-popups-enabled")
  return value !== "false"
}

function getMutedDmMemberIds() {
  if (typeof window === "undefined") return new Set<string>()

  const raw = window.localStorage.getItem("lexora:admin:workspace-muted-dm-member-ids")
  if (!raw) return new Set<string>()

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(parsed.map((item) => String(item)).filter(Boolean))
  } catch {
    return new Set<string>()
  }
}

async function getCachedAblyTokenRequest(): Promise<AblyTokenRequestPayload> {
  const now = Date.now()
  const token = cachedTokenRequest

  if (token && cachedTokenFetchedAt > 0 && now - cachedTokenFetchedAt < 45 * 60 * 1000) {
    return token
  }

  if (tokenRequestPromise) {
    return tokenRequestPromise
  }

  tokenRequestPromise = fetch("/api/admin/ably-token", {
    cache: "no-store",
  })
    .then(async (res): Promise<AblyTokenRequestPayload> => {
      const data = (await res.json().catch(() => null)) as AblyTokenRequestPayload | null

      if (
        !res.ok ||
        !data ||
        typeof data.clientId !== "string" ||
        typeof data.keyName !== "string" ||
        typeof data.capability !== "string" ||
        typeof data.nonce !== "string" ||
        typeof data.mac !== "string"
      ) {
        throw new Error("Failed to load admin realtime token.")
      }

      cachedTokenRequest = data
      cachedTokenFetchedAt = Date.now()
      return data
    })
    .finally(() => {
      tokenRequestPromise = null
    })

  return tokenRequestPromise
}

function waitForConnected(client: Ably.Realtime) {
  return new Promise<boolean>((resolve) => {
    if (client.connection.state === "connected") {
      resolve(true)
      return
    }

    const timeout = window.setTimeout(() => {
      console.warn("Admin realtime connection timed out. Realtime notifications disabled for this session.")
      resolve(false)
    }, 12000)

    client.connection.once("connected", () => {
      window.clearTimeout(timeout)
      resolve(true)
    })

    client.connection.once("failed", () => {
      window.clearTimeout(timeout)
      console.warn("Admin realtime connection failed. Realtime notifications disabled for this session.")
      resolve(false)
    })
  })
}

export default function AdminRealtimeBridge() {
  const clientRef = useRef<Ably.Realtime | null>(null)
  const typingChannelRef = useRef<{
    publish: (name: string, data: WorkspaceTypingPayload) => Promise<unknown>
  } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenEventIdsRef = useRef<Set<string>>(new Set())
  const activeDmIdRef = useRef<string | null>(null)
  const startedRef = useRef(false)

  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    function handleActiveDmChanged(event: Event) {
      const customEvent = event as CustomEvent<{ activeDmId?: string | null }>
      activeDmIdRef.current = customEvent.detail?.activeDmId || null
    }

    window.addEventListener("admin:workspace-active-dm-changed", handleActiveDmChanged)
    return () => window.removeEventListener("admin:workspace-active-dm-changed", handleActiveDmChanged)
  }, [])

  useEffect(() => {
    function handleTypingPublish(event: Event) {
      const customEvent = event as CustomEvent<WorkspaceTypingPayload>
      const payload = customEvent.detail

      if (!payload || payload.type !== "workspace_typing") return

      const typingChannel = typingChannelRef.current
      if (!typingChannel) return

      void typingChannel.publish("typing", payload).catch((error) => {
        console.error("ADMIN WORKSPACE TYPING PUBLISH ERROR:", error)
      })
    }

    window.addEventListener("admin:workspace-typing-publish", handleTypingPublish)
    return () => window.removeEventListener("admin:workspace-typing-publish", handleTypingPublish)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let alive = true
    let userChannel: any = null
    let typingChannel: any = null

    async function markNotificationRead(notificationId: string) {
      if (!notificationId) return

      try {
        await fetch(`/api/admin/notifications/${notificationId}/read`, {
          method: "POST",
          cache: "no-store",
        })
      } catch {
        // Do not break realtime UI because read-sync failed.
      }
    }

    async function subscribe() {
      try {
        const firstTokenRequest = await getCachedAblyTokenRequest()
        const clientId = firstTokenRequest.clientId

        if (!alive || !clientId) return

        const client = new Ably.Realtime({
          authCallback: (_tokenParams, callback) => {
            void getCachedAblyTokenRequest()
              .then((nextTokenRequest) => {
                callback(null, nextTokenRequest as any)
              })
              .catch((error) => {
                callback(error, null)
              })
          },
          autoConnect: true,
          closeOnUnload: true,
        })

        clientRef.current = client
        const connected = await waitForConnected(client)

        if (!alive || !connected) {
          client.close()
          return
        }

        userChannel = client.channels.get(`admin:user:${clientId}`)
        typingChannel = client.channels.get("admin:workspace:typing")
        typingChannelRef.current = typingChannel

        await typingChannel.subscribe("typing", (message: any) => {
          const data = message.data as WorkspaceTypingPayload | null
          if (!data || data.type !== "workspace_typing") return
          if (data.senderId === clientId) return

          window.dispatchEvent(
            new CustomEvent("admin:workspace-typing", {
              detail: data,
            }),
          )
        })

        await userChannel.subscribe((message: any) => {
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

          const isDmEvent = data.type === "team_dm_message"
          const senderId = data.senderId || ""
          const notificationId = data.notification?.id || ""
          const activeDmId = activeDmIdRef.current
          const isSameOpenDm = isDmEvent && senderId && activeDmId === senderId
          const mutedDmMemberIds = getMutedDmMemberIds()
          const isMutedSender = isDmEvent && senderId && mutedDmMemberIds.has(senderId)
          const popupsEnabled = getPopupsEnabled()

          if (isSameOpenDm) {
            if (notificationId) void markNotificationRead(notificationId)
            return
          }

          if (data.notification) {
            window.dispatchEvent(
              new CustomEvent("admin:notification-created", {
                detail: data.notification,
              }),
            )
          }

          if (!popupsEnabled || isMutedSender) return

          const notification = data.notification

          const nextToast: ToastState = {
            id: eventId,
            title:
              cleanText(notification?.title, "") ||
              (isDmEvent ? "New direct message" : "New notification"),
            body:
              cleanText(notification?.body, "") ||
              (data.dmMessage
                ? `${data.dmMessage.author}: ${data.dmMessage.content}`
                : "Something new happened in the admin workspace."),
            href:
              notification?.href ||
              (senderId ? `/admin/workspace?dm=${senderId}` : null),
            type: cleanText(notification?.type || data.type, "system_alert"),
          }

          setToast(nextToast)

          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)

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
      startedRef.current = false

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)

      if (userChannel) void userChannel.unsubscribe()
      if (typingChannel) void typingChannel.unsubscribe("typing")

      const activeClient = clientRef.current
      clientRef.current = null
      typingChannelRef.current = null

      if (activeClient) activeClient.close()
    }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-40px)]">
      <button
        type="button"
        onClick={() => {
          if (toast.href) window.location.href = toast.href
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

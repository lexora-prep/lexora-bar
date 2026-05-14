"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

const HEARTBEAT_INTERVAL_MS = 60_000
const LOGIN_ACTIVITY_FLAG = "lexora_track_login_after_redirect"

function getActivitySource(pathname: string) {
  if (typeof window !== "undefined") {
    const shouldTrackLogin =
      window.localStorage.getItem(LOGIN_ACTIVITY_FLAG) === "true"

    if (shouldTrackLogin) {
      window.localStorage.removeItem(LOGIN_ACTIVITY_FLAG)
      return "login"
    }
  }

  if (pathname.startsWith("/dashboard")) return "dashboard"
  if (pathname.startsWith("/mbe")) return "mbe"
  if (pathname.startsWith("/flashcards")) return "flashcards"
  if (pathname.startsWith("/rule-training")) return "rule_training"
  if (pathname.startsWith("/rule-bank")) return "rule_bank"
  if (pathname.startsWith("/study-plan")) return "study_plan"
  if (pathname.startsWith("/analytics")) return "analytics"
  if (pathname.startsWith("/weak-areas")) return "weak_areas"
  if (pathname.startsWith("/review")) return "review"

  return "app"
}

export default function UserActivityHeartbeat() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const lastSentAtRef = useRef<number>(0)

  useEffect(() => {
    let stopped = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function sendHeartbeat(force = false) {
      try {
        const now = Date.now()

        if (!force && now - lastSentAtRef.current < 20_000) {
          return
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error || !session?.access_token) {
          return
        }

        lastSentAtRef.current = now

        await fetch("/api/activity/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            source: getActivitySource(pathname),
          }),
          keepalive: true,
        }).catch(() => {
          // Silent by design. Heartbeat must never interrupt the user.
        })
      } catch (error) {
        console.warn("Activity heartbeat failed:", error)
      }
    }

    sendHeartbeat(true)

    intervalId = setInterval(() => {
      if (!stopped && document.visibilityState === "visible") {
        sendHeartbeat()
      }
    }, HEARTBEAT_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat(true)
      }
    }

    function handleFocus() {
      sendHeartbeat(true)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      stopped = true

      if (intervalId) {
        clearInterval(intervalId)
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [pathname, supabase])

  return null
}
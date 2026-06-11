"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ProgressHistoryAnalyticsData } from "../types"

type UseProgressHistoryParams = {
  enabled: boolean
  appliedRange: string
  appliedStartDate?: string
  appliedEndDate?: string
}

type ProgressHistoryState = {
  data: ProgressHistoryAnalyticsData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useProgressHistory({
  enabled,
  appliedRange,
  appliedStartDate = "",
  appliedEndDate = "",
}: UseProgressHistoryParams): ProgressHistoryState {
  const [data, setData] = useState<ProgressHistoryAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const dataRef = useRef<ProgressHistoryAnalyticsData | null>(null)
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  const load = useCallback(async () => {
    if (!enabled) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        range: appliedRange,
        timezoneOffset: String(new Date().getTimezoneOffset()),
        refresh: String(Date.now()),
      })

      if (
        appliedRange === "custom" &&
        appliedStartDate &&
        appliedEndDate
      ) {
        params.set("start", appliedStartDate)
        params.set("end", appliedEndDate)
      }

      const response = await fetch(
        `/api/progress-history?${params.toString()}`,
        {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      )

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          body?.error || "Progress history could not be loaded."
        )
      }

      if (requestId !== requestIdRef.current) return

      const nextData = body as ProgressHistoryAnalyticsData
      dataRef.current = nextData
      setData(nextData)
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return
      }

      if (requestId !== requestIdRef.current) return

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Progress history could not be loaded."
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [
    enabled,
    appliedRange,
    appliedStartDate,
    appliedEndDate,
    refreshKey,
  ])

  useEffect(() => {
    void load()

    return () => {
      controllerRef.current?.abort()
    }
  }, [load])

  useEffect(() => {
    if (!enabled) return

    function handleFocus() {
      void load()
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void load()
      }
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("pageshow", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("pageshow", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [enabled, load])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

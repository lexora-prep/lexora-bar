"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StrengthsWeaknessesAnalyticsData } from "../types"

type UseStrengthsWeaknessesParams = {
  enabled: boolean
  appliedRange: string
  appliedStartDate?: string
  appliedEndDate?: string
}

type StrengthsWeaknessesState = {
  data: StrengthsWeaknessesAnalyticsData | null
  loading: boolean
  error: string | null
}

export function useStrengthsWeaknesses({
  enabled,
  appliedRange,
  appliedStartDate = "",
  appliedEndDate = "",
}: UseStrengthsWeaknessesParams): StrengthsWeaknessesState {
  const [data, setData] =
    useState<StrengthsWeaknessesAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataRef = useRef<StrengthsWeaknessesAnalyticsData | null>(null)
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const load = useCallback(async () => {
    if (!enabled) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      if (!dataRef.current) {
        setLoading(true)
      }

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
        `/api/strengths-weaknesses?${params.toString()}`,
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
          body?.error ||
            "Strengths and weaknesses analytics could not be loaded."
        )
      }

      if (requestId !== requestIdRef.current) return

      const nextData = body as StrengthsWeaknessesAnalyticsData
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
          : "Strengths and weaknesses analytics could not be loaded."
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
  ])

  useEffect(() => {
    if (!enabled) return

    void load()

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void load()
      }
    }

    const refreshOnFocus = () => {
      void load()
    }

    const refreshOnPageShow = () => {
      void load()
    }

    const refreshOnLearningProgress = () => {
      void load()
    }

    window.addEventListener("focus", refreshOnFocus)
    window.addEventListener("pageshow", refreshOnPageShow)
    window.addEventListener(
      "lexora:learning-progress-updated",
      refreshOnLearningProgress
    )
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.removeEventListener("focus", refreshOnFocus)
      window.removeEventListener("pageshow", refreshOnPageShow)
      window.removeEventListener(
        "lexora:learning-progress-updated",
        refreshOnLearningProgress
      )
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      controllerRef.current?.abort()
    }
  }, [enabled, load])

  return { data, loading, error }
}

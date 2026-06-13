"use client"

import { useEffect, useState } from "react"
import type { TrendPoint } from "../types"

type TrendAnalyticsParams = {
  userId: string | null
  appliedRange: string
  appliedStartDate: string
  appliedEndDate: string
}

type TrendAnalyticsState = {
  trend: TrendPoint[]
  loading: boolean
  error: string | null
}

export function useTrendAnalytics({
  userId,
  appliedRange,
  appliedStartDate,
  appliedEndDate,
}: TrendAnalyticsParams): TrendAnalyticsState {
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setTrend([])
      setLoading(false)
      return
    }

    if (
      appliedRange === "custom" &&
      (!appliedStartDate || !appliedEndDate)
    ) {
      setTrend([])
      setLoading(false)
      return
    }

    const resolvedUserId = userId
    const controller = new AbortController()
    let active = true

    async function loadTrend() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          userId: resolvedUserId,
        })

        if (appliedRange === "custom") {
          params.set("start", appliedStartDate)
          params.set("end", appliedEndDate)
        } else {
          params.set("range", appliedRange)
        }

        const response = await fetch(
          `/api/trend-analytics?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(
            `Trend analytics failed with status ${response.status}`
          )
        }

        const data = await response.json()

        if (!active) return

        setTrend(
          Array.isArray(data?.trend)
            ? data.trend
            : []
        )
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return
        }

        if (!active) return

        console.error(
          "TREND ANALYTICS LOAD ERROR:",
          requestError
        )

        setTrend([])

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load trend analytics."
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadTrend()

    return () => {
      active = false
      controller.abort()
    }
  }, [
    userId,
    appliedRange,
    appliedStartDate,
    appliedEndDate,
  ])

  return {
    trend,
    loading,
    error,
  }
}

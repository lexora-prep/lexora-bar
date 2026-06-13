"use client"

import { useEffect, useState } from "react"
import type {
  BLLSubjectStat,
  DashboardData,
  WeakArea,
} from "../types"

type CoreAnalyticsState = {
  dashboard: DashboardData | null
  bllSubjects: BLLSubjectStat[]
  weakAreas: WeakArea[]
  loading: boolean
  error: string | null
}

const EMPTY_DASHBOARD: DashboardData = {
  bllScore: 0,
  ruleAttempts: 0,
  prevBLL: 0,
}

export function useCoreAnalytics(
  userId: string | null
): CoreAnalyticsState {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [bllSubjects, setBLLSubjects] =
    useState<BLLSubjectStat[]>([])

  const [weakAreas, setWeakAreas] =
    useState<WeakArea[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }

    const resolvedUserId = userId
    const controller = new AbortController()
    let active = true

    async function loadCoreAnalytics() {
      try {
        setLoading(true)
        setError(null)

        const [
          dashboardResponse,
          subjectsResponse,
          weakAreasResponse,
        ] = await Promise.all([
          fetch(
            `/api/dashboard-analytics?userId=${encodeURIComponent(resolvedUserId)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          ),

          fetch(
            `/api/bll-subject-analytics?userId=${encodeURIComponent(resolvedUserId)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          ),

          fetch(
            `/api/weak-areas?userId=${encodeURIComponent(resolvedUserId)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          ),
        ])

        if (!dashboardResponse.ok) {
          throw new Error(
            `Dashboard analytics failed with status ${dashboardResponse.status}`
          )
        }

        if (!subjectsResponse.ok) {
          throw new Error(
            `Subject analytics failed with status ${subjectsResponse.status}`
          )
        }

        if (!weakAreasResponse.ok) {
          throw new Error(
            `Weak-area analytics failed with status ${weakAreasResponse.status}`
          )
        }

        const [
          dashboardData,
          subjectsData,
          weakAreasData,
        ] = await Promise.all([
          dashboardResponse.json(),
          subjectsResponse.json(),
          weakAreasResponse.json(),
        ])

        if (!active) return

        setDashboard({
          ...EMPTY_DASHBOARD,
          ...dashboardData,
        })

        setBLLSubjects(
          Array.isArray(subjectsData?.subjects)
            ? subjectsData.subjects
            : []
        )

        setWeakAreas(
          Array.isArray(weakAreasData?.weakAreas)
            ? weakAreasData.weakAreas
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
          "CORE ANALYTICS LOAD ERROR:",
          requestError
        )

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load analytics."
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCoreAnalytics()

    return () => {
      active = false
      controller.abort()
    }
  }, [userId])

  return {
    dashboard,
    bllSubjects,
    weakAreas,
    loading,
    error,
  }
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Target, TrendingDown, TrendingUp } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type WeakAreaItem = {
  id?: string | number
  ruleId?: string | number
  subject?: string
  accuracy?: number
  attempts?: number
  rule?: string
  title?: string
  trend?: "up" | "down"
  needsPractice?: boolean
  priority?: number
}

type WeakAreasApiResponse = {
  weakAreas?: WeakAreaItem[]
  count?: number
  error?: string
}

export default function WeakAreas() {
  const [data, setData] = useState<WeakAreaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [apiCount, setApiCount] = useState<number>(0)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setLoading(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
      } catch (err) {
        console.error("LOAD USER ERROR:", err)
        setLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    async function loadWeakAreas() {
      if (!userId) return

      try {
        setLoading(true)

        const res = await fetch(`/api/weak-areas?userId=${userId}`, {
          cache: "no-store",
        })

        const result: WeakAreasApiResponse | WeakAreaItem[] = await res.json()

        console.log("WEAK AREAS API RESULT:", result)

        if (Array.isArray(result)) {
          console.log("WEAK AREAS ARRAY LENGTH:", result.length)
          setData(result)
          setApiCount(result.length)
        } else {
          const weakAreas = Array.isArray(result?.weakAreas) ? result.weakAreas : []
          const count =
            typeof result?.count === "number" ? result.count : weakAreas.length

          console.log("WEAK AREAS COUNT:", count)
          console.log("WEAK AREAS ARRAY LENGTH:", weakAreas.length)

          setData(weakAreas)
          setApiCount(count)
        }
      } catch (err) {
        console.error("WEAK AREAS FETCH ERROR:", err)
        setData([])
        setApiCount(0)
      } finally {
        setLoading(false)
      }
    }

    loadWeakAreas()
  }, [userId])

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
            Weak Area Training
          </h1>

          <p className="mt-1.5 text-[14px] text-slate-500">
            Rules that need more attention based on accuracy and repeated performance.
          </p>
        </div>

        {!loading && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600">
            Weak areas: {apiCount}
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading weak areas...
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-[18px] font-semibold text-slate-900">
            No weak areas yet
          </div>

          <div className="mt-3 text-[15px] leading-8 text-slate-500">
            Your weak areas will appear here after you complete enough rule practice.
            Train more rules first and Lexora will flag the ones that need work.
          </div>

          <button
            onClick={() => router.push("/rule-training")}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Start Rule Training
          </button>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((item, index) => {
            const itemId = item.id || item.ruleId || index
            const accuracy = Number(item.accuracy ?? 0)
            const attempts = Number(item.attempts ?? 0)
            const ruleTitle = item.rule || item.title || "Rule"
            const subject = item.subject || "Unknown"
            const trend = item.trend || "down"
            const needsPractice = !!item.needsPractice

            return (
              <div
                key={itemId}
                className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="min-h-[56px] text-[15px] font-semibold leading-7 text-slate-900">
                      <div className="line-clamp-2">{ruleTitle}</div>
                    </div>

                    <div className="mt-1 text-[12px] text-slate-500">
                      {subject} • {attempts} attempts
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[12px] font-semibold text-rose-600">
                    {accuracy}%
                  </div>
                </div>

                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                    style={{ width: `${Math.max(6, Math.min(accuracy, 100))}%` }}
                  />
                </div>

                <div className="mb-4 flex min-h-[22px] items-center justify-between gap-2 text-[12px]">
                  <div className="inline-flex min-w-0 items-center gap-1.5 text-slate-500">
                    <Target size={13} />
                    <span className="truncate">
                      {needsPractice ? "Flagged by system" : "Needs review"}
                    </span>
                  </div>

                  <div
                    className={`inline-flex shrink-0 items-center gap-1 ${
                      trend === "up" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {trend === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{trend === "up" ? "Improving" : "Declining"}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-stretch gap-2">
                  <button
                    onClick={() => {
                      router.push(`/rule-training?weak=${itemId}&mode=weak`)
                    }}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Start Quiz
                  </button>

                  <button
                    onClick={() => router.push(`/rule/${itemId}`)}
                    className="flex h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Rule
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
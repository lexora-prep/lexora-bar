"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function WeakAreas() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

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

        const res = await fetch(`/api/weak-areas?userId=${userId}`)
        const result = await res.json()

        if (Array.isArray(result)) {
          setData(result)
        } else if (Array.isArray(result?.weakAreas)) {
          setData(result.weakAreas)
        } else {
          setData([])
        }
      } catch (err) {
        console.error("WEAK AREAS FETCH ERROR:", err)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadWeakAreas()
  }, [userId])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Weak Area Training
        </h1>

        <p className="text-sm text-gray-400 mt-1">
          Automatically flagged using accuracy and recency analysis.
          Red means it needs attention.
        </p>
      </div>

      {loading && (
        <div className="max-w-xl rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading weak areas...
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="max-w-xl rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <div className="font-semibold text-slate-900">
            No weak areas yet
          </div>

          <div className="text-sm text-slate-500 leading-6">
            Your weak areas will appear here after you start training rules.
            Complete a few rule attempts first, then Lexora will flag topics that need more work.
          </div>

          <button
            onClick={() => router.push("/rule-training")}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
          >
            Start Rule Training
          </button>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="space-y-4 max-w-xl">
          {data.map((item, index) => {
            const itemId = item.id || item.ruleId || index
            const accuracy = Number(item.accuracy ?? item.mastery ?? 0)
            const attempts = Number(item.attempts ?? 0)
            const ruleTitle = item.rule || item.title || "Rule"
            const subject = item.subject || "Unknown"
            const trend = item.trend || "down"

            return (
              <div
                key={itemId}
                className="p-5 rounded-xl border bg-white shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      {ruleTitle}
                    </div>

                    <div className="text-xs text-gray-400">
                      {subject} · {attempts} attempts
                    </div>
                  </div>

                  <div className="text-sm">
                    {trend === "up" && (
                      <span className="text-green-500">
                        ↑ improving
                      </span>
                    )}

                    {trend === "down" && (
                      <span className="text-red-500">
                        ↓ declining
                      </span>
                    )}

                    <span className="ml-2 font-semibold text-red-500">
                      {accuracy}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-red-500"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    Recent avg: {accuracy}%
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      router.push(`/rule-training?weak=${itemId}&mode=weak`)
                    }}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Start Targeted Quiz
                  </button>

                  <button
                    onClick={() => router.push(`/rule/${itemId}`)}
                    className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Review Rule
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
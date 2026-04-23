"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function RuleHeatmap() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [weakAreas, setWeakAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    async function load() {
      if (!userId) return

      try {
        setLoading(true)

        const res = await fetch(`/api/rule-weak-areas?userId=${userId}`)
        const data = await res.json()

        setWeakAreas(data.subjects || [])
      } catch (err) {
        console.error("RULE HEATMAP LOAD ERROR:", err)
        setWeakAreas([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Rule Mastery Heatmap
        </h2>

        <div className="text-sm text-slate-500">
          Loading heatmap...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900 mb-4">
        Rule Mastery Heatmap
      </h2>

      {weakAreas.length === 0 ? (
        <div className="text-sm text-slate-500">
          No mastery data yet. Start training rules to see your heatmap.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weakAreas.map((s) => {
            let color = "bg-red-100 text-red-600"

            if (s.mastery >= 80) color = "bg-green-100 text-green-600"
            else if (s.mastery >= 60) color = "bg-blue-100 text-blue-600"
            else if (s.mastery >= 30) color = "bg-yellow-100 text-yellow-700"

            return (
              <div
                key={s.subject}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-slate-800">
                    {s.subject}
                  </div>

                  <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
                    {s.mastery}%
                  </span>
                </div>

                <div className="text-xs text-slate-500 mb-3">
                  Mastery Score
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-red-500">
                    Critical: {s.critical}
                  </div>

                  <div className="text-yellow-600">
                    Needs Work: {s.needsWork}
                  </div>

                  <div className="text-blue-500">
                    Improving: {s.improving}
                  </div>

                  <div className="text-green-600">
                    Mastered: {s.mastered}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
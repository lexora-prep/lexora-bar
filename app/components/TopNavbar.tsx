"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

type TopNavbarProps = {
  collapsed?: boolean
}

export default function TopNavbar({ collapsed }: TopNavbarProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userName, setUserName] = useState("there")
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [hasStudyPlan, setHasStudyPlan] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTopbarData() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          setLoading(false)
          return
        }

        const profileRes = await fetch(`/api/profile?userId=${user.id}`)
        if (profileRes.ok) {
          const profile = await profileRes.json()

          if (profile?.full_name) {
            setUserName(profile.full_name)
          } else if (profile?.email) {
            const emailName = String(profile.email).split("@")[0]
            setUserName(emailName)
          }
        }

        const planRes = await fetch(`/api/study-plan?userId=${user.id}`)
        if (planRes.ok) {
          const plan = await planRes.json()

          if (plan?.examDate) {
            setHasStudyPlan(true)

            const exam = new Date(plan.examDate)
            const today = new Date()

            exam.setHours(0, 0, 0, 0)
            today.setHours(0, 0, 0, 0)

            const diffMs = exam.getTime() - today.getTime()
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

            setDaysLeft(diffDays >= 0 ? diffDays : 0)
          } else {
            setHasStudyPlan(false)
            setDaysLeft(null)
          }
        } else {
          setHasStudyPlan(false)
          setDaysLeft(null)
        }
      } catch (err) {
        console.error("TOP NAVBAR LOAD ERROR:", err)
      } finally {
        setLoading(false)
      }
    }

    loadTopbarData()
  }, [supabase])

  const greeting = getGreeting()

  return (
    <div className="bg-white border-b border-slate-200 px-6 md:px-8 py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Sparkles size={16} />
            <span className="text-sm font-semibold">
              Lexora Prep
            </span>
          </div>

          <div className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
            {loading ? "Loading..." : `${greeting}, ${userName}`}
          </div>

          <div className="text-sm md:text-base text-slate-500 mt-2 leading-7">
            {loading ? (
              "Loading your progress..."
            ) : hasStudyPlan && daysLeft !== null ? (
              <>
                Your bar exam is in{" "}
                <span className="font-semibold text-blue-600">
                  {daysLeft} {daysLeft === 1 ? "day" : "days"}
                </span>
                . Stay consistent and keep building your score.
              </>
            ) : (
              <>
                Set your study plan to see your exam countdown and daily targets.
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="relative h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
          >
            <Bell className="mx-auto" size={20} />
            <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
          </button>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
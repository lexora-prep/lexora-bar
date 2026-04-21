"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Bell, X } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type TopNavbarProps = {
  collapsed?: boolean
}

type AnnouncementItem = {
  id: string
  title: string
  body: string
  created_at?: string
}

export default function TopNavbar({ collapsed }: TopNavbarProps) {
  const supabase = useMemo(() => createClient(), [])

  const [userName, setUserName] = useState("there")
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [hasStudyPlan, setHasStudyPlan] = useState(false)
  const [loading, setLoading] = useState(true)

  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)

  const announcementRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        announcementRef.current &&
        !announcementRef.current.contains(event.target as Node)
      ) {
        setAnnouncementOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  async function loadAnnouncements() {
    setAnnouncementsLoading(true)

    try {
      const res = await fetch("/api/announcements/active", {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setAnnouncements([])
        return
      }

      setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : [])
    } catch (error) {
      console.error("ANNOUNCEMENTS LOAD ERROR:", error)
      setAnnouncements([])
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  async function handleBellClick() {
    const nextOpen = !announcementOpen
    setAnnouncementOpen(nextOpen)

    if (nextOpen) {
      await loadAnnouncements()
    }
  }

  const greeting = getGreeting()
  const hasAnnouncements = announcements.length > 0

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5 md:px-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[15px] font-medium tracking-[-0.02em] text-slate-900 md:text-[17px]">
            {loading ? "Loading..." : `${greeting}, ${userName}`}
          </div>

          <div className="mt-2 text-[13px] font-normal leading-6 text-slate-500 md:text-[14px]">
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
              <>Set your study plan to see your exam countdown and daily targets.</>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-3" ref={announcementRef}>
          <button
            type="button"
            onClick={handleBellClick}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Open announcements"
          >
            <Bell size={18} />
            <span
              className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ${
                hasAnnouncements ? "bg-red-500" : "bg-slate-300"
              }`}
            />
          </button>

          {announcementOpen && (
            <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Announcements
                  </div>
                  <div className="text-xs text-slate-500">
                    Updates from Lexora
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAnnouncementOpen(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close announcements"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {announcementsLoading ? (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    Loading announcements...
                  </div>
                ) : announcements.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {announcements.map((item) => (
                      <div key={item.id} className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </div>

                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {item.body}
                        </div>

                        {item.created_at && (
                          <div className="mt-2 text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    No announcements right now.
                  </div>
                )}
              </div>
            </div>
          )}
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
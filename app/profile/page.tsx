"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  full_name: string | null
  law_school: string | null
  jurisdiction: string | null
  exam_month: number | null
  exam_year: number | null
  mbe_access?: boolean
  subscription_tier?: string | null
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        setError("")
        setSuccess("")

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          setError("Unable to load user.")
          return
        }

        const res = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error || "Failed to load profile.")
          return
        }

        const profile: ProfileData = await res.json()

        setUserId(profile.id)
        setEmail(profile.email || "")
        setFullName(profile.full_name || "")
        setLawSchool(profile.law_school || "")
        setJurisdiction(profile.jurisdiction || "")
        setExamMonth(profile.exam_month ? String(profile.exam_month) : "")
        setExamYear(profile.exam_year ? String(profile.exam_year) : "")
      } catch (err) {
        console.error("PROFILE PAGE LOAD ERROR:", err)
        setError("Something went wrong while loading profile.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const monthNumber = examMonth.trim() ? Number(examMonth) : null
      const yearNumber = examYear.trim() ? Number(examYear) : null

      if (monthNumber !== null && (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12)) {
        setError("Exam month must be between 1 and 12.")
        return
      }

      if (yearNumber !== null && (Number.isNaN(yearNumber) || yearNumber < 2024 || yearNumber > 2100)) {
        setError("Exam year is not valid.")
        return
      }

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          fullName,
          lawSchool,
          jurisdiction,
          examMonth: monthNumber,
          examYear: yearNumber,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to save profile.")
        return
      }

      setSuccess("Profile updated successfully.")
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err)
      setError("Something went wrong while saving.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal account information.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading profile...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Law school
                </label>
                <input
                  value={lawSchool}
                  onChange={(e) => setLawSchool(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="Law school"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Jurisdiction
                </label>
                <input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. California, New York, UBE"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Exam month
                </label>
                <input
                  value={examMonth}
                  onChange={(e) => setExamMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="1 to 12"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Exam year
                </label>
                <input
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. 2026"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
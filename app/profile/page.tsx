"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { User, GraduationCap, Scale, CalendarRange, Save } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const EXAM_MONTHS = [
  { value: 2, label: "February" },
  { value: 7, label: "July" },
]

const EXAM_YEARS = Array.from({ length: 25 }, (_, i) => 2026 + i)

type ProfileResponse = {
  id: string
  email: string | null
  full_name: string | null
  law_school: string | null
  jurisdiction: string | null
  exam_month: number | null
  exam_year: number | null
  mbe_access?: boolean
}

const STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")

  useEffect(() => {
    async function loadProfile() {
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

        const res = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data: ProfileResponse = await res.json()

        setEmail(data.email ?? "")
        setFullName(data.full_name ?? "")
        setLawSchool(data.law_school ?? "")
        setJurisdiction(data.jurisdiction ?? "")
        setExamMonth(data.exam_month ? String(data.exam_month) : "")
        setExamYear(data.exam_year ? String(data.exam_year) : "")
      } catch (err) {
        console.error("LOAD PROFILE ERROR:", err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  async function handleSave() {
    if (!userId) return

    try {
      setSaving(true)

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          fullName,
          lawSchool,
          jurisdiction,
          examMonth: examMonth ? Number(examMonth) : null,
          examYear: examYear ? Number(examYear) : null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        alert(data?.error || data?.message || "Failed to save profile.")
        return
      }

      alert("Profile saved.")
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err)
      alert("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-5">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-5">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
            Profile
          </h1>
          <p className="mt-2 text-[14px] text-slate-500">
            Manage your personal and exam information.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <User size={18} className="text-violet-600" />
              <h2 className="text-[16px] font-semibold text-slate-900">
                Personal Information
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                />
              </Field>

              <Field label="Email">
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Law School">
                <input
                  type="text"
                  value={lawSchool}
                  onChange={(e) => setLawSchool(e.target.value)}
                  placeholder="Enter your law school"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                />
              </Field>

              <Field label="Jurisdiction">
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                >
                  <option value="">Select jurisdiction</option>
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarRange size={18} className="text-blue-600" />
              <h2 className="text-[16px] font-semibold text-slate-900">
                Exam Settings
              </h2>
            </div>

            <div className="grid gap-4">
              <Field label="Exam Month">
                <select
                  value={examMonth}
                  onChange={(e) => setExamMonth(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                >
                  <option value="">Select month</option>
                  {EXAM_MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Exam Year">
                <select
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                >
                  <option value="">Select year</option>
                  {EXAM_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <GraduationCap size={16} className="text-slate-500" />
                  Profile summary
                </div>

                <div className="mt-3 space-y-2 text-[13px] text-slate-600">
                  <div>
                    <span className="font-medium text-slate-800">Name:</span>{" "}
                    {fullName || "Not set"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Law school:</span>{" "}
                    {lawSchool || "Not set"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Jurisdiction:</span>{" "}
                    {jurisdiction || "Not set"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Exam:</span>{" "}
                    {examMonth
                      ? EXAM_MONTHS.find((m) => String(m.value) === examMonth)?.label
                      : "Not set"}{" "}
                    {examYear || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
              saving
                ? "cursor-not-allowed bg-slate-400"
                : "bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_100%)] hover:opacity-95"
            }`}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}
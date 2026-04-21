"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

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

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!fullName.trim()) {
        setError("Full name is required.")
        return
      }

      if (!email.trim()) {
        setError("Email is required.")
        return
      }

      if (!password.trim() || password.length < 6) {
        setError("Password must be at least 6 characters.")
        return
      }

      if (!jurisdiction.trim()) {
        setError("Please select your jurisdiction.")
        return
      }

      const monthNumber = examMonth.trim() ? Number(examMonth) : null
      const yearNumber = examYear.trim() ? Number(examYear) : null

      if (
        monthNumber !== null &&
        (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12)
      ) {
        setError("Exam month must be between 1 and 12.")
        return
      }

      if (
        yearNumber !== null &&
        (Number.isNaN(yearNumber) || yearNumber < 2024 || yearNumber > 2100)
      ) {
        setError("Exam year is not valid.")
        return
      }

      const inviteCheck = await fetch("/api/beta-invite-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const inviteData = await inviteCheck.json().catch(() => null)

      if (!inviteCheck.ok || !inviteData?.allowed) {
        setError("Lexora Prep is currently in private beta. Your email is not approved yet.")
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError("Failed to create account.")
        return
      }

      const profileRes = await fetch("/api/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: data.user.id,
          email: email.trim(),
          fullName: fullName.trim(),
          lawSchool: lawSchool.trim(),
          jurisdiction: jurisdiction.trim(),
          examMonth: monthNumber,
          examYear: yearNumber,
        }),
      })

      const profileData = await profileRes.json().catch(() => null)

      if (!profileRes.ok) {
        setError(profileData?.error || "Failed to create profile.")
        return
      }

      router.push("/dashboard")
    } catch (err) {
      console.error("REGISTER ERROR:", err)
      setError("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">Create account</h1>

        <input
          className="w-full rounded-md border p-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-2"
          placeholder="Law school"
          value={lawSchool}
          onChange={(e) => setLawSchool(e.target.value)}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Jurisdiction
          </label>
          <select
            className="w-full rounded-md border bg-white p-2"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            <option value="">Select your jurisdiction</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <input
          className="w-full rounded-md border p-2"
          placeholder="Exam month (1-12)"
          value={examMonth}
          onChange={(e) => setExamMonth(e.target.value)}
        />

        <input
          className="w-full rounded-md border p-2"
          placeholder="Exam year"
          value={examYear}
          onChange={(e) => setExamYear(e.target.value)}
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </main>
  )
}
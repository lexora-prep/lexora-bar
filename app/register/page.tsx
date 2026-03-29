"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

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
      const inviteCheck = await fetch("/api/beta-invite-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const inviteData = await inviteCheck.json()

      if (!inviteCheck.ok || !inviteData.allowed) {
        setError("Lexora Prep is currently in private beta. Your email is not approved yet.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        await fetch("/api/create-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: data.user.id,
            email,
            fullName,
            lawSchool,
            jurisdiction,
            examMonth: Number(examMonth),
            examYear: Number(examYear),
          }),
        })
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <form onSubmit={handleRegister} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create account</h1>

        <input className="w-full border rounded-md p-2" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Law school" value={lawSchool} onChange={(e)=>setLawSchool(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Jurisdiction" value={jurisdiction} onChange={(e)=>setJurisdiction(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Exam month (1-12)" value={examMonth} onChange={(e)=>setExamMonth(e.target.value)} />
        <input className="w-full border rounded-md p-2" placeholder="Exam year" value={examYear} onChange={(e)=>setExamYear(e.target.value)} />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </main>
  )
}
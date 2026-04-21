"use client"

import { useState } from "react"

import { useRouter } from "next/navigation"

import Link from "next/link"

import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {

  const router = useRouter()

  const supabase = createClient()

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [error, setError] = useState("")

  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {

    e.preventDefault()

    setError("")

    setLoading(true)

    try {

      const { error } = await supabase.auth.signInWithPassword({

        email,

        password,

      })

      if (error) {

        setError(error.message)

        return

      }

      router.push("/dashboard")

      router.refresh()

    } catch {

      setError("Something went wrong.")

    } finally {

      setLoading(false)

    }

  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-white px-6">

      <form

        onSubmit={handleLogin}

        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 p-6 shadow-sm"

      >

        <h1 className="text-2xl font-semibold">Log in</h1>

        <input

          className="w-full border rounded-md p-2"

          placeholder="Email"

          type="email"

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          autoComplete="email"

        />

        <input

          className="w-full border rounded-md p-2"

          placeholder="Password"

          type="password"

          value={password}

          onChange={(e) => setPassword(e.target.value)}

          autoComplete="current-password"

        />

        <div className="flex justify-end">

          <Link

            href="/forgot-password"

            className="text-sm text-blue-600 hover:underline"

          >

            Forgot password?

          </Link>

        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button

          disabled={loading}

          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition disabled:opacity-60"

        >

          {loading ? "Logging in..." : "Log in"}

        </button>

        <div className="text-sm text-slate-500 text-center">

          Don’t have an account?{" "}

          <Link href="/register" className="text-blue-600 hover:underline">

            Create account

          </Link>

        </div>

      </form>

    </main>

  )

}
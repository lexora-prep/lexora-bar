"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

type PasswordChecks = {
  minLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }
}

function isStrongPassword(password: string) {
  const checks = getPasswordChecks(password)
  return (
    checks.minLength &&
    checks.hasUppercase &&
    checks.hasNumber &&
    checks.hasSpecial
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password])

  useEffect(() => {
    let mounted = true

    async function initializeRecoverySession() {
      try {
        setCheckingLink(true)
        setError("")

        // 1) PKCE flow: /reset-password?code=...
        const url = new URL(window.location.href)
        const code = url.searchParams.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            if (mounted) {
              setError(error.message || "This password reset link is invalid or has expired.")
              setReady(false)
            }
            return
          }

          // Remove the code from the URL after successful exchange
          window.history.replaceState({}, document.title, "/reset-password")

          if (mounted) {
            setReady(true)
          }
          return
        }

        // 2) Fallback: implicit flow with hash tokens
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash

        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            if (mounted) {
              setError(error.message || "Unable to verify reset link.")
              setReady(false)
            }
            return
          }

          // Remove sensitive tokens from the URL
          window.history.replaceState({}, document.title, "/reset-password")

          if (mounted) {
            setReady(true)
          }
          return
        }

        // 3) Final fallback: if Supabase already established a recovery session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          if (mounted) {
            setReady(true)
          }
          return
        }

        if (mounted) {
          setError("This password reset link is invalid or has expired.")
          setReady(false)
        }
      } catch {
        if (mounted) {
          setError("Something went wrong while validating the reset link.")
          setReady(false)
        }
      } finally {
        if (mounted) {
          setCheckingLink(false)
        }
      }
    }

    initializeRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
        setCheckingLink(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!ready) {
      setError("This password reset link is invalid or has expired.")
      return
    }

    if (!isStrongPassword(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character."
      )
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message || "Unable to update password.")
        return
      }

      setSuccess("Your password has been changed successfully.")

      await supabase.auth.signOut()

      setTimeout(() => {
        router.replace("/login?reset=success")
      }, 1200)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your new password below.
          </p>
        </div>

        {checkingLink ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Verifying your reset link...
          </div>
        ) : null}

        {!checkingLink && error && !ready ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex text-sm font-medium text-slate-900 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        ) : null}

        {!checkingLink && ready ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="mb-2 font-medium text-slate-900">Password requirements</p>
              <ul className="space-y-1">
                <li>{passwordChecks.minLength ? "✓" : "•"} At least 8 characters</li>
                <li>{passwordChecks.hasUppercase ? "✓" : "•"} At least 1 uppercase letter</li>
                <li>{passwordChecks.hasNumber ? "✓" : "•"} At least 1 number</li>
                <li>{passwordChecks.hasSpecial ? "✓" : "•"} At least 1 special character</li>
              </ul>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Change password"}
            </button>

            <div className="text-sm text-slate-600">
              <Link href="/login" className="font-medium text-slate-900 hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
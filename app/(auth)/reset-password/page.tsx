"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

          window.history.replaceState({}, document.title, "/reset-password")

          if (mounted) {
            setReady(true)
          }
          return
        }

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

          window.history.replaceState({}, document.title, "/reset-password")

          if (mounted) {
            setReady(true)
          }
          return
        }

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
    <main className="min-h-screen overflow-hidden bg-[#F7F8FC] text-[#0E1B35]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute right-[-120px] top-[-160px] h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-[#0E1B35]/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(124,58,237,0.04),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(14,27,53,0.04),transparent_55%)]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#E2E6F0] bg-[#F7F8FC]/95 px-5 backdrop-blur-xl md:px-12">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/lexora-logo-transparent.png"
              alt="Lexora Prep logo"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
            <div className="text-[17px] font-bold tracking-[-0.03em] text-[#0E1B35]">
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </div>
          </Link>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-[10px] border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to login
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center px-5 py-12 md:py-16">
          <div className="w-full max-w-[480px]">
            <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_24px_60px_rgba(14,27,53,0.12),0_8px_20px_rgba(14,27,53,0.06)] md:p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
                  <LockKeyhole className="h-7 w-7 text-[#7C3AED]" />
                </div>

                <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-[#0E1B35]">
                  Reset password
                </h1>

                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Enter your new password below.
                </p>
              </div>

              {checkingLink ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-sm text-[#475569]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
                  Verifying your reset link...
                </div>
              ) : null}

              {!checkingLink && error && !ready ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {error}
                  </div>

                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center justify-center rounded-xl border border-[#CDD3E6] bg-white px-4 py-3 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#0E1B35]"
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
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        disabled={loading}
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-12 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#0E1B35]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0E1B35]">
                      <ShieldCheck className="h-4 w-4 text-[#7C3AED]" />
                      Password requirements
                    </div>

                    <div className="grid gap-2">
                      <PasswordRequirement
                        valid={passwordChecks.minLength}
                        label="At least 8 characters"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasUppercase}
                        label="At least 1 uppercase letter"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasNumber}
                        label="At least 1 number"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasSpecial}
                        label="At least 1 special character"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Confirm new password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        disabled={loading}
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-12 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#0E1B35]"
                        aria-label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                      {success}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 py-4 text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(14,27,53,0.24)] transition hover:-translate-y-0.5 hover:bg-[#162B55] hover:shadow-[0_8px_24px_rgba(14,27,53,0.32)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      "Change password"
                    )}
                  </button>

                  <div className="rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-center text-sm text-[#64748B]">
                    Remember your password?{" "}
                    <Link
                      href="/login"
                      className="font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
                    >
                      Back to login
                    </Link>
                  </div>
                </form>
              ) : null}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#94A3B8]">
              Lexora Prep is a supplemental educational tool and does not
              guarantee bar exam success.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function PasswordRequirement({
  valid,
  label,
}: {
  valid: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <CheckCircle2
        className={
          valid ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-[#CBD5E1]"
        }
      />
      <span className={valid ? "text-[#1E293B]" : "text-[#94A3B8]"}>
        {label}
      </span>
    </div>
  )
}
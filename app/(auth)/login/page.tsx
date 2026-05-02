"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.")
      setIsLoading(false)
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (loginError) {
      setError(loginError.message || "Unable to sign in. Please check your credentials.")
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
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
            href="/"
            className="group inline-flex items-center gap-2 rounded-[10px] border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to main page
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center px-5 py-12 md:py-16">
          <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_460px] lg:items-center">
            <div className="hidden lg:block">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-2 text-sm font-bold text-[#5B21B6]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-[11px] text-white">
                  ★
                </span>
                Black Letter Law Rule Training
              </div>

              <h1 className="max-w-2xl font-serif text-[58px] font-normal leading-[1.06] tracking-[-0.03em] text-[#0E1B35] xl:text-[64px]">
                Welcome back to{" "}
                <span className="italic text-[#5B21B6]">Lexora Prep.</span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-8 text-[#475569]">
                Continue your rule memorization, flashcards, weak-area review,
                spaced repetition, and study analytics from your dashboard.
              </p>

              <div className="mt-9 grid max-w-xl grid-cols-3 gap-4">
                <div className="rounded-[20px] border border-[#E2E6F0] bg-white p-5 shadow-[0_4px_16px_rgba(14,27,53,0.08)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F3F0FF] text-sm font-extrabold text-[#7C3AED]">
                    01
                  </div>
                  <div className="text-sm font-bold text-[#0E1B35]">Recall</div>
                  <div className="mt-1 text-xs leading-5 text-[#64748B]">
                    Retype rules from memory.
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#E2E6F0] bg-white p-5 shadow-[0_4px_16px_rgba(14,27,53,0.08)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F3F0FF] text-sm font-extrabold text-[#7C3AED]">
                    02
                  </div>
                  <div className="text-sm font-bold text-[#0E1B35]">Review</div>
                  <div className="mt-1 text-xs leading-5 text-[#64748B]">
                    Train weak areas faster.
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#E2E6F0] bg-white p-5 shadow-[0_4px_16px_rgba(14,27,53,0.08)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F3F0FF] text-sm font-extrabold text-[#7C3AED]">
                    03
                  </div>
                  <div className="text-sm font-bold text-[#0E1B35]">Retain</div>
                  <div className="mt-1 text-xs leading-5 text-[#64748B]">
                    Build long-term rule memory.
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[460px]">
              <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_24px_60px_rgba(14,27,53,0.12),0_8px_20px_rgba(14,27,53,0.06)] md:p-8">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
                    <LockKeyhole className="h-7 w-7 text-[#7C3AED]" />
                  </div>

                  <h2 className="font-serif text-4xl font-normal tracking-[-0.03em] text-[#0E1B35]">
                    Log in
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Access your Lexora Prep dashboard and continue your rule
                    training.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Email
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Password
                      </label>

                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-12 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
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

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 py-4 text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(14,27,53,0.24)] transition hover:-translate-y-0.5 hover:bg-[#162B55] hover:shadow-[0_8px_24px_rgba(14,27,53,0.32)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Log in to dashboard"
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-center text-sm text-[#64748B]">
                  New to Lexora Prep?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
                  >
                    Create an account
                  </Link>
                </div>

                <div className="mt-5 text-center">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#0E1B35]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Return to the main website
                  </Link>
                </div>
              </div>

              <p className="mt-5 text-center text-xs leading-5 text-[#94A3B8]">
                Lexora Prep is a supplemental educational tool and does not
                guarantee bar exam success.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
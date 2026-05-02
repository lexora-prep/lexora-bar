"use client"

import { FormEvent, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  School,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const JURISDICTIONS = [
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
  "Guam",
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
  "Northern Mariana Islands",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Palau",
  "Pennsylvania",
  "Puerto Rico",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virgin Islands",
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasLetter: /[A-Za-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    }
  }, [password])

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
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

      if (
        !password.trim() ||
        password.length < 8 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
      ) {
        setError(
          "Password must be at least 8 characters and include a letter, a number, and a special symbol."
        )
        return
      }

      if (!lawSchool.trim()) {
        setError("Law school is required.")
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
        (Number.isNaN(monthNumber) || ![2, 7].includes(monthNumber))
      ) {
        setError("Please select either February or July for the exam month.")
        return
      }

      if (
        yearNumber !== null &&
        (Number.isNaN(yearNumber) || yearNumber < 2024 || yearNumber > 2100)
      ) {
        setError("Exam year is not valid.")
        return
      }

      const normalizedEmail = email.trim().toLowerCase()

      const inviteCheck = await fetch("/api/beta-invite-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      const inviteData = await inviteCheck.json().catch(() => null)

      if (!inviteCheck.ok || !inviteData?.allowed) {
        setError(
          "Lexora Prep is currently in private beta. Your email is not approved yet."
        )
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
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
          email: normalizedEmail,
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
      router.refresh()
    } catch (err) {
      console.error("REGISTER ERROR:", err)
      setError("Something went wrong.")
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
            href="/"
            className="group inline-flex items-center gap-2 rounded-[10px] border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to main page
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center px-5 py-12 md:py-16">
          <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_520px] lg:items-start">
            <div className="hidden lg:flex lg:flex-col lg:justify-center lg:self-start lg:pt-24">
              <h1 className="max-w-2xl font-serif text-[48px] font-normal leading-[1.08] tracking-[-0.03em] text-[#0E1B35] xl:text-[54px]">
                Create your{" "}
                <span className="italic text-[#5B21B6]">Lexora Prep</span>{" "}
                account.
              </h1>

              <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#475569]">
                Start training black letter law recall with focused rule review,
                flashcards, weak-area tracking, and clean study analytics.
              </p>

              <div className="mt-8 grid max-w-xl gap-4">
                <InfoCard
                  icon={<GraduationCap className="h-5 w-5 text-[#7C3AED]" />}
                  title="Built for bar candidates"
                  body="Designed for students preparing for UBE-style subjects and MEE rule recitation."
                />

                <InfoCard
                  icon={<ShieldCheck className="h-5 w-5 text-[#7C3AED]" />}
                  title="Supplemental study tool"
                  body="Lexora Prep helps with memorization and recall. It does not replace a full bar prep course."
                />

                <InfoCard
                  icon={<UserPlus className="h-5 w-5 text-[#7C3AED]" />}
                  title="Simple account setup"
                  body="Create your account, enter your study details, and continue directly to your dashboard."
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-[520px]">
              <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_24px_60px_rgba(14,27,53,0.12),0_8px_20px_rgba(14,27,53,0.06)] md:p-8">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
                    <UserPlus className="h-7 w-7 text-[#7C3AED]" />
                  </div>

                  <h2 className="font-serif text-4xl font-normal tracking-[-0.03em] text-[#0E1B35]">
                    Create account
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Enter your email and bar exam details.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Full name
                    </label>

                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-12 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#0E1B35]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] p-4">
                      <PasswordRequirement
                        valid={passwordChecks.minLength}
                        label="At least 8 characters"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasLetter}
                        label="Includes at least one letter"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasNumber}
                        label="Includes at least one number"
                      />
                      <PasswordRequirement
                        valid={passwordChecks.hasSpecial}
                        label="Includes at least one special symbol"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lawSchool"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Law school
                    </label>

                    <div className="relative">
                      <School className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="lawSchool"
                        name="lawSchool"
                        type="text"
                        autoComplete="organization"
                        value={lawSchool}
                        onChange={(e) => setLawSchool(e.target.value)}
                        placeholder="Your law school"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="jurisdiction"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Jurisdiction
                    </label>

                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <select
                        id="jurisdiction"
                        name="jurisdiction"
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="h-[52px] w-full appearance-none rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-3 pl-12 pr-12 text-sm text-[#0E1B35] outline-none transition focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      >
                        <option value="" className="bg-white text-[#0E1B35]">
                          Select your jurisdiction
                        </option>
                        {JURISDICTIONS.map((item) => (
                          <option
                            key={item}
                            value={item}
                            className="bg-white text-[#0E1B35]"
                          >
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="examMonth"
                        className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Exam month
                      </label>

                      <div className="relative">
                        <select
                          id="examMonth"
                          name="examMonth"
                          value={examMonth}
                          onChange={(e) => setExamMonth(e.target.value)}
                          className="h-[52px] w-full appearance-none rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-3 pr-12 text-sm text-[#0E1B35] outline-none transition focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                        >
                          <option value="" className="bg-white text-[#0E1B35]">
                            Select month
                          </option>
                          <option value="2" className="bg-white text-[#0E1B35]">
                            February
                          </option>
                          <option value="7" className="bg-white text-[#0E1B35]">
                            July
                          </option>
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="examYear"
                        className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Exam year
                      </label>

                      <input
                        id="examYear"
                        name="examYear"
                        inputMode="numeric"
                        value={examYear}
                        onChange={(e) => setExamYear(e.target.value)}
                        placeholder="2026"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      {error}
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
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-center text-sm text-[#64748B]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
                  >
                    Log in
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
                guarantee bar exam success. Users should verify jurisdiction-specific
                requirements and rules with the applicable bar admission authority.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-[#E2E6F0] bg-white p-5 shadow-[0_4px_16px_rgba(14,27,53,0.08)]">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F3F0FF]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-[#0E1B35]">{title}</div>
        <div className="mt-1 text-sm leading-6 text-[#64748B]">{body}</div>
      </div>
    </div>
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
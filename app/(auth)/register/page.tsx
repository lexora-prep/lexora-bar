"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  School,
  ShoppingCart,
  User,
  UserPlus,
  X,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { LegalDocumentView } from "@/components/legal/LegalDocumentView"
import {
  getLegalDocument,
  type LegalDocumentKey,
} from "@/lib/legal/legal-content"

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

const PLANS = {
  free: {
    id: "free",
    label: "Free",
    eyebrow: "Demo Access",
    price: "$0",
    billing: "",
    description: "Try Lexora Prep with limited rule recall access.",
    buttonText: "Create account and start free",
    nextStep: "Dashboard access after registration.",
    features: [
      "Limited BLL rule access",
      "Basic recall practice",
      "No credit card required",
    ],
  },
  "bll-monthly": {
    id: "bll-monthly",
    label: "BLL Monthly",
    eyebrow: "Core Memorization",
    price: "$19.99",
    billing: "/mo",
    description: "Full Black Letter Law rule training access.",
    buttonText: "Create account and continue",
    nextStep: "Paddle checkout after registration.",
    features: [
      "Full BLL rule access",
      "Spaced repetition and flashcards",
      "Smart study plan",
      "Weak rule targeting",
      "Performance analytics",
    ],
  },
  premium: {
    id: "premium",
    label: "Premium",
    eyebrow: "Advanced Training",
    price: "$24.99",
    billing: "/mo",
    description: "Advanced tools for stronger rule memory and focused review.",
    buttonText: "Create account and continue",
    nextStep: "Paddle checkout after registration.",
    features: [
      "Everything in BLL Monthly",
      "120 Golden Rules",
      "120 Golden Flashcards",
      "Advanced rule sets",
      "Priority training tools",
      "Performance analytics",
    ],
  },
} as const

type PlanId = keyof typeof PLANS

function isPlanId(value: string | null): value is PlanId {
  return value === "free" || value === "bll-monthly" || value === "premium"
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("free")
  const selectedPlan = PLANS[selectedPlanId]

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalDocumentKey | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const planFromUrl = params.get("plan")

    if (isPlanId(planFromUrl)) {
      setSelectedPlanId(planFromUrl)
      window.localStorage.setItem("lexora_selected_plan", planFromUrl)
      return
    }

    const storedPlan = window.localStorage.getItem("lexora_selected_plan")
    if (isPlanId(storedPlan)) {
      setSelectedPlanId(storedPlan)
    }
  }, [])

  useEffect(() => {
    if (!legalModal) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLegalModal(null)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [legalModal])

  function updateSelectedPlan(planId: PlanId) {
    setSelectedPlanId(planId)
    window.localStorage.setItem("lexora_selected_plan", planId)

    const url = new URL(window.location.href)
    url.searchParams.set("plan", planId)
    window.history.replaceState({}, "", url.toString())
  }

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

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
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

      if (!acceptedTerms) {
        setError(
          "Please confirm that you agree to the Terms and Conditions, Privacy Policy, Refund Policy, and platform use rules."
        )
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

      if (monthNumber !== null && yearNumber !== null) {
        const now = new Date()
        const examDate = new Date(yearNumber, monthNumber - 1, 1)
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        if (examDate < currentMonth) {
          setError(
            "This exam date has already passed. Please select a future bar exam month and year."
          )
          return
        }
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
          inviteData?.reason ||
            "Registration is not available for this email right now."
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
          selectedPlan: selectedPlanId,
        }),
      })

      const profileData = await profileRes.json().catch(() => null)

      if (!profileRes.ok) {
        setError(profileData?.error || "Failed to create profile.")
        return
      }

      window.localStorage.setItem("lexora_selected_plan", selectedPlanId)
      window.localStorage.setItem("lexora_first_dashboard_animation", "true")

      const legalAcceptanceRes = await fetch("/api/legal-acceptances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: normalizedEmail,
          selectedPlan: selectedPlanId,
          registrationMode: inviteData?.mode || "private_beta",
          termsAccepted: true,
          privacyAccepted: true,
          refundAccepted: true,
          platformRulesAccepted: true,
        }),
      })

      const legalAcceptanceData = await legalAcceptanceRes
        .json()
        .catch(() => null)

      if (!legalAcceptanceRes.ok) {
        setError(
          legalAcceptanceData?.error ||
            "Account created, but legal acceptance could not be recorded. Please contact support."
        )
        return
      }

      fetch("/api/welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: fullName.trim(),
          selectedPlan: selectedPlan.label,
        }),
      }).catch(() => {
        console.warn("Welcome email request failed.")
      })

      if (selectedPlanId === "free") {
        router.push("/dashboard")
        router.refresh()
        return
      }

      router.push(`/checkout?plan=${selectedPlanId}&registered=1`)
      router.refresh()
    } catch (err) {
      console.error("REGISTER ERROR:", err)
      setError("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#F7F8FC] text-[#0E1B35] selection:bg-transparent"
      onCopy={(event) => {
        const target = event.target as HTMLElement | null
        const tagName = target?.tagName?.toLowerCase()

        if (
          tagName !== "input" &&
          tagName !== "textarea" &&
          tagName !== "select"
        ) {
          event.preventDefault()
        }
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute right-[-120px] top-[-160px] h-[520px] w-[520px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-[#0E1B35]/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(124,58,237,0.04),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(14,27,53,0.04),transparent_55%)]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#E2E6F0] bg-[#F7F8FC]/95 px-5 backdrop-blur-xl md:px-12">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Lexora Prep logo"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
            <div className="text-[17px] font-extrabold tracking-[-0.03em] text-[#0E1B35]">
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </div>
          </Link>

          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-[12px] border border-[#CDD3E6] bg-white px-4 py-2 text-sm font-bold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to main page
          </Link>
        </header>

        <section className="flex flex-1 justify-center px-5 py-8 md:py-10">
          <div className="grid w-full max-w-[1180px] gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-[92px]">
              <div className="rounded-[28px] border border-[#E2E6F0] bg-white/95 p-6 shadow-[0_22px_55px_rgba(14,27,53,0.10)] backdrop-blur">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
                    <ShoppingCart className="h-5 w-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.17em] text-[#7C3AED]">
                      Selected plan
                    </div>
                    <div className="mt-0.5 text-lg font-black tracking-[-0.03em] text-[#0E1B35]">
                      {selectedPlan.label}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#6D28D9] p-5 text-white shadow-[0_18px_45px_rgba(14,27,53,0.18)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C4B5FD]">
                    {selectedPlan.eyebrow}
                  </div>

                  <div className="mt-3 flex items-end gap-1">
                    <div className="text-[42px] font-black leading-none tracking-[-0.08em]">
                      {selectedPlan.price}
                    </div>
                    {selectedPlan.billing ? (
                      <div className="pb-1 text-lg font-black text-white/65">
                        {selectedPlan.billing}
                      </div>
                    ) : null}
                  </div>

                  <p className="mt-4 max-w-[280px] text-sm leading-6 text-white/72">
                    {selectedPlan.description}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                    Change plan
                  </div>

                  <div className="grid gap-2">
                    {(Object.keys(PLANS) as PlanId[]).map((planId) => {
                      const plan = PLANS[planId]
                      const active = selectedPlanId === planId

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => updateSelectedPlan(planId)}
                          className={
                            active
                              ? "flex items-center justify-between rounded-2xl border border-[#7C3AED] bg-[#F3F0FF] px-4 py-3 text-left shadow-[0_10px_24px_rgba(124,58,237,0.10)]"
                              : "flex items-center justify-between rounded-2xl border border-[#E2E6F0] bg-white px-4 py-3 text-left transition hover:border-[#C4B5FD] hover:bg-[#FBFAFF]"
                          }
                        >
                          <div>
                            <div className="text-sm font-black text-[#0E1B35]">
                              {plan.label}
                            </div>
                            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                              {plan.eyebrow}
                            </div>
                          </div>

                          <div className="text-sm font-black text-[#0E1B35]">
                            {plan.price}
                            <span className="text-xs text-[#94A3B8]">
                              {plan.billing}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E2E6F0] pt-5">
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                    Included
                  </div>

                  <div className="grid gap-2">
                    {selectedPlan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm font-bold leading-6 text-[#334155]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-xs font-semibold leading-5 text-[#64748B]">
                  {selectedPlan.nextStep} Paid access begins only after
                  successful checkout.
                </p>
              </div>
            </aside>

            <div className="w-full">
              <div className="rounded-[28px] border border-[#E2E6F0] bg-white p-6 shadow-[0_24px_60px_rgba(14,27,53,0.12),0_8px_20px_rgba(14,27,53,0.06)] md:p-8">
                <div className="mb-8 border-b border-[#E2E6F0] pb-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-[560px]">
                      <h1 className="font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.035em] text-[#0E1B35] md:text-[48px]">
                        Create your{" "}
                        <span className="italic text-[#5B21B6]">
                          Lexora Prep
                        </span>{" "}
                        account.
                      </h1>

                      <p className="mt-4 text-[15px] leading-7 text-[#475569]">
                        Start rule recall training with focused review, spaced
                        repetition, weak-area tracking, and clean study
                        analytics.
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-3">
                      <UserPlus className="h-5 w-5 text-[#7C3AED]" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7C3AED]">
                          Account setup
                        </div>
                        <div className="text-sm font-black text-[#0E1B35]">
                          {selectedPlan.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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

                <form
                  onSubmit={handleRegister}
                  className="mx-auto max-w-[560px] space-y-5"
                >
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
                      <PasswordRequirement
                        valid={
                          confirmPassword.length > 0 &&
                          password === confirmPassword
                        }
                        label="Passwords match"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                    >
                      Confirm password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="h-[52px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-4 pl-12 pr-4 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
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

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] p-4 text-left">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#CBD5E1] accent-[#7C3AED]"
                    />

                    <span className="text-xs leading-5 text-[#64748B]">
                      I agree to Lexora Prep&apos;s{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("terms")}
                        className="font-black text-[#7C3AED] hover:text-[#5B21B6]"
                      >
                        Terms and Conditions
                      </button>
                      ,{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("privacy")}
                        className="font-black text-[#7C3AED] hover:text-[#5B21B6]"
                      >
                        Privacy Policy
                      </button>
                      , and{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("refund")}
                        className="font-black text-[#7C3AED] hover:text-[#5B21B6]"
                      >
                        Refund Policy
                      </button>
                      . I understand that Lexora Prep is a supplemental
                      educational tool, does not guarantee bar exam passage, and
                      may not be abused, copied, scraped, resold, or used to
                      extract protected platform content.
                    </span>
                  </label>

                  {selectedPlanId !== "free" ? (
                    <div className="flex items-start gap-3 rounded-2xl bg-[#F3F0FF] p-4 text-xs leading-5 text-[#5B21B6]">
                      <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        After registration, you will continue to Paddle checkout
                        for the selected paid plan. Payment, taxes, invoices,
                        cancellations, and refund processing are handled by
                        Paddle as Merchant of Record.
                      </div>
                    </div>
                  ) : null}

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
                      selectedPlan.buttonText
                    )}
                  </button>
                </form>

                <div className="mx-auto mt-6 max-w-[560px] rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-4 text-center text-sm text-[#64748B]">
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
                guarantee bar exam success. Users should verify
                jurisdiction-specific requirements and rules with the applicable
                bar admission authority.
              </p>
            </div>
          </div>
        </section>
      </div>

      {legalModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1B35]/50 px-4 py-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLegalModal(null)
            }
          }}
        >
          <div className="flex max-h-[88vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-[#E2E6F0] bg-white shadow-[0_30px_90px_rgba(14,27,53,0.30)]">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] px-5 py-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                  Legal document
                </div>
                <div className="mt-1 text-sm font-black text-[#0E1B35]">
                  Read without leaving registration
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E6F0] bg-[#F7F8FC] text-[#64748B] transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
                aria-label="Close legal document"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-6 md:px-8">
              <LegalDocumentView
                document={getLegalDocument(legalModal)}
                modal
              />
            </div>

            <div className="border-t border-[#E2E6F0] bg-[#F7F8FC] px-5 py-4">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-[#0E1B35] text-sm font-extrabold text-white transition hover:bg-[#162B55]"
              >
                Close and return to registration
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
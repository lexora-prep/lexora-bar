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
type LegalModalType = "terms" | "privacy" | "refund" | null

type SavedRegisterForm = {
  selectedPlanId: PlanId
  fullName: string
  email: string
  lawSchool: string
  jurisdiction: string
  examMonth: string
  examYear: string
  acceptedTerms: boolean
}

function isPlanId(value: string | null): value is PlanId {
  return value === "free" || value === "bll-monthly" || value === "premium"
}

const REGISTER_FORM_STORAGE_KEY = "lexora_register_form_draft"

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
  const [legalModal, setLegalModal] = useState<LegalModalType>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const planFromUrl = params.get("plan")

    let draft: SavedRegisterForm | null = null

    try {
      const rawDraft = window.localStorage.getItem(REGISTER_FORM_STORAGE_KEY)
      draft = rawDraft ? JSON.parse(rawDraft) : null
    } catch {
      draft = null
    }

    if (draft) {
      if (isPlanId(draft.selectedPlanId)) {
        setSelectedPlanId(draft.selectedPlanId)
      }

      setFullName(draft.fullName || "")
      setEmail(draft.email || "")
      setLawSchool(draft.lawSchool || "")
      setJurisdiction(draft.jurisdiction || "")
      setExamMonth(draft.examMonth || "")
      setExamYear(draft.examYear || "")
      setAcceptedTerms(Boolean(draft.acceptedTerms))
    }

    if (isPlanId(planFromUrl)) {
      setSelectedPlanId(planFromUrl)
      window.localStorage.setItem("lexora_selected_plan", planFromUrl)
    } else if (!draft) {
      const storedPlan = window.localStorage.getItem("lexora_selected_plan")
      if (isPlanId(storedPlan)) {
        setSelectedPlanId(storedPlan)
      }
    }

    setDraftLoaded(true)
  }, [])

  useEffect(() => {
    if (!draftLoaded) return

    const draft: SavedRegisterForm = {
      selectedPlanId,
      fullName,
      email,
      lawSchool,
      jurisdiction,
      examMonth,
      examYear,
      acceptedTerms,
    }

    window.localStorage.setItem(REGISTER_FORM_STORAGE_KEY, JSON.stringify(draft))
  }, [
    draftLoaded,
    selectedPlanId,
    fullName,
    email,
    lawSchool,
    jurisdiction,
    examMonth,
    examYear,
    acceptedTerms,
  ])

  useEffect(() => {
    if (!legalModal) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLegalModal(null)
      }
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleEscape)
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

      window.localStorage.removeItem(REGISTER_FORM_STORAGE_KEY)

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
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-[#E2E6F0] bg-[#F7F8FC]/95 px-4 backdrop-blur-xl md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Lexora Prep logo"
              width={40}
              height={40}
              className="h-8 w-8 object-contain"
              priority
            />
            <div className="text-[16px] font-extrabold tracking-[-0.03em] text-[#0E1B35]">
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </div>
          </Link>

          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border border-[#CDD3E6] bg-white px-3.5 py-2 text-xs font-bold text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35] md:text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back
          </Link>
        </header>

        <section className="flex flex-1 justify-center px-4 py-5 md:px-6 md:py-7">
          <div className="grid w-full max-w-[1120px] gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-[78px]">
              <div className="rounded-[24px] border border-[#E2E6F0] bg-white/95 p-4 shadow-[0_18px_44px_rgba(14,27,53,0.10)] backdrop-blur">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF]">
                    <ShoppingCart className="h-5 w-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                      Selected plan
                    </div>
                    <div className="text-base font-black tracking-[-0.03em] text-[#0E1B35]">
                      {selectedPlan.label}
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] bg-gradient-to-br from-[#0E1B35] via-[#1E2E61] to-[#6D28D9] p-4 text-white shadow-[0_14px_34px_rgba(14,27,53,0.18)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.17em] text-[#C4B5FD]">
                    {selectedPlan.eyebrow}
                  </div>

                  <div className="mt-2 flex items-end gap-1">
                    <div className="text-[36px] font-black leading-none tracking-[-0.08em]">
                      {selectedPlan.price}
                    </div>
                    {selectedPlan.billing ? (
                      <div className="pb-1 text-base font-black text-white/65">
                        {selectedPlan.billing}
                      </div>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-white/72">
                    {selectedPlan.description}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
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
                              ? "flex items-center justify-between rounded-2xl border border-[#7C3AED] bg-[#F3F0FF] px-3.5 py-2.5 text-left shadow-[0_10px_24px_rgba(124,58,237,0.10)]"
                              : "flex items-center justify-between rounded-2xl border border-[#E2E6F0] bg-white px-3.5 py-2.5 text-left transition hover:border-[#C4B5FD] hover:bg-[#FBFAFF]"
                          }
                        >
                          <div>
                            <div className="text-sm font-black text-[#0E1B35]">
                              {plan.label}
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                              {plan.eyebrow}
                            </div>
                          </div>

                          <div className="text-sm font-black text-[#0E1B35]">
                            {plan.price}
                            <span className="text-[11px] text-[#94A3B8]">
                              {plan.billing}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 border-t border-[#E2E6F0] pt-4">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                    Included
                  </div>

                  <div className="grid gap-1.5">
                    {selectedPlan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-xs font-bold leading-5 text-[#334155]"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7C3AED]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-[11px] font-semibold leading-5 text-[#64748B]">
                  {selectedPlan.nextStep} Paid access begins only after
                  successful checkout.
                </p>
              </div>
            </aside>

            <div className="w-full">
              <div className="rounded-[24px] border border-[#E2E6F0] bg-white p-5 shadow-[0_22px_54px_rgba(14,27,53,0.11),0_8px_18px_rgba(14,27,53,0.05)] md:p-6">
                <div className="mb-5 border-b border-[#E2E6F0] pb-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-[560px]">
                      <h1 className="font-serif text-[34px] font-normal leading-[1.05] tracking-[-0.04em] text-[#0E1B35] md:text-[42px]">
                        Create your{" "}
                        <span className="italic text-[#5B21B6]">
                          Lexora Prep
                        </span>{" "}
                        account.
                      </h1>

                      <p className="mt-3 text-sm leading-6 text-[#475569]">
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

                <form onSubmit={handleRegister} className="mx-auto max-w-[620px] space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CompactInput
                      id="fullName"
                      label="Full name"
                      icon={<User className="h-4.5 w-4.5 text-[#94A3B8]" />}
                      value={fullName}
                      onChange={setFullName}
                      placeholder="Your full name"
                      autoComplete="name"
                    />

                    <CompactInput
                      id="email"
                      label="Email"
                      type="email"
                      icon={<Mail className="h-4.5 w-4.5 text-[#94A3B8]" />}
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="password"
                        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Password
                      </label>

                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className="h-[48px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-3 pl-11 pr-11 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#0E1B35]"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4.5 w-4.5" />
                          ) : (
                            <Eye className="h-4.5 w-4.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <CompactInput
                      id="confirmPassword"
                      label="Confirm password"
                      type={showPassword ? "text" : "password"}
                      icon={
                        <LockKeyhole className="h-4.5 w-4.5 text-[#94A3B8]" />
                      }
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] p-3 md:grid-cols-2">
                    <PasswordRequirement
                      valid={passwordChecks.minLength}
                      label="At least 8 characters"
                    />
                    <PasswordRequirement
                      valid={passwordChecks.hasLetter}
                      label="Includes one letter"
                    />
                    <PasswordRequirement
                      valid={passwordChecks.hasNumber}
                      label="Includes one number"
                    />
                    <PasswordRequirement
                      valid={passwordChecks.hasSpecial}
                      label="Includes one special symbol"
                    />
                    <PasswordRequirement
                      valid={
                        confirmPassword.length > 0 &&
                        password === confirmPassword
                      }
                      label="Passwords match"
                    />
                  </div>

                  <CompactInput
                    id="lawSchool"
                    label="Law school"
                    icon={<School className="h-4.5 w-4.5 text-[#94A3B8]" />}
                    value={lawSchool}
                    onChange={setLawSchool}
                    placeholder="Your law school"
                    autoComplete="organization"
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_0.85fr_0.85fr]">
                    <div>
                      <label
                        htmlFor="jurisdiction"
                        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Jurisdiction
                      </label>

                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                        <select
                          id="jurisdiction"
                          name="jurisdiction"
                          value={jurisdiction}
                          onChange={(e) => setJurisdiction(e.target.value)}
                          className="h-[48px] w-full appearance-none rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-3 pl-11 pr-10 text-sm text-[#0E1B35] outline-none transition focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                        >
                          <option value="" className="bg-white text-[#0E1B35]">
                            Select jurisdiction
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
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="examMonth"
                        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
                      >
                        Exam month
                      </label>

                      <div className="relative">
                        <select
                          id="examMonth"
                          name="examMonth"
                          value={examMonth}
                          onChange={(e) => setExamMonth(e.target.value)}
                          className="h-[48px] w-full appearance-none rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-3.5 py-3 pr-10 text-sm text-[#0E1B35] outline-none transition focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                        >
                          <option value="" className="bg-white text-[#0E1B35]">
                            Month
                          </option>
                          <option value="2" className="bg-white text-[#0E1B35]">
                            February
                          </option>
                          <option value="7" className="bg-white text-[#0E1B35]">
                            July
                          </option>
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="examYear"
                        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
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
                        className="h-[48px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-3.5 py-3 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] p-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#CBD5E1] accent-[#7C3AED]"
                    />

                    <span className="text-[11.5px] leading-5 text-[#64748B]">
                      I agree to Lexora Prep&apos;s{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("terms")}
                        className="font-black text-[#7C3AED] underline-offset-2 hover:text-[#5B21B6] hover:underline"
                      >
                        Terms and Conditions
                      </button>
                      ,{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("privacy")}
                        className="font-black text-[#7C3AED] underline-offset-2 hover:text-[#5B21B6] hover:underline"
                      >
                        Privacy Policy
                      </button>
                      , and{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal("refund")}
                        className="font-black text-[#7C3AED] underline-offset-2 hover:text-[#5B21B6] hover:underline"
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
                    <div className="flex items-start gap-3 rounded-2xl bg-[#F3F0FF] p-3.5 text-[11.5px] leading-5 text-[#5B21B6]">
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
                    className="flex h-[50px] w-full items-center justify-center rounded-2xl bg-[#0E1B35] px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(14,27,53,0.24)] transition hover:-translate-y-0.5 hover:bg-[#162B55] hover:shadow-[0_8px_24px_rgba(14,27,53,0.32)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

                <div className="mx-auto mt-4 max-w-[620px] rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] px-4 py-3 text-center text-sm text-[#64748B]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#94A3B8]">
                Lexora Prep is a supplemental educational tool and does not
                guarantee bar exam success.
              </p>
            </div>
          </div>
        </section>
      </div>

      <LegalModal modal={legalModal} onClose={() => setLegalModal(null)} />
    </main>
  )
}

function CompactInput({
  id,
  label,
  type = "text",
  icon,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8]"
      >
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          {icon}
        </div>
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-[48px] w-full rounded-2xl border border-[#E2E6F0] bg-[#F7F8FC] py-3 pl-11 pr-3.5 text-sm text-[#0E1B35] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1E3A72] focus:bg-white focus:ring-4 focus:ring-[#0E1B35]/[0.07]"
        />
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
    <div className="flex items-center gap-2 text-[11.5px]">
      <CheckCircle2
        className={
          valid ? "h-3.5 w-3.5 text-emerald-600" : "h-3.5 w-3.5 text-[#CBD5E1]"
        }
      />
      <span className={valid ? "text-[#1E293B]" : "text-[#94A3B8]"}>
        {label}
      </span>
    </div>
  )
}

function LegalModal({
  modal,
  onClose,
}: {
  modal: LegalModalType
  onClose: () => void
}) {
  if (!modal) return null

  const title =
    modal === "terms"
      ? "Terms and Conditions"
      : modal === "privacy"
        ? "Privacy Policy"
        : "Refund Policy"

  const eyebrow =
    modal === "terms"
      ? "Platform rules"
      : modal === "privacy"
        ? "Data protection"
        : "Billing and refunds"

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E1B35]/55 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_rgba(14,27,53,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E6F0] bg-[#F7F8FC] px-6 py-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7C3AED]">
              {eyebrow}
            </div>
            <h2 className="mt-1 font-serif text-[34px] font-normal leading-none tracking-[-0.04em] text-[#0E1B35]">
              {title}
            </h2>
            <p className="mt-2 text-xs font-semibold text-[#94A3B8]">
              Last updated: April 29, 2026
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#CDD3E6] bg-white text-[#64748B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
            aria-label="Close legal window"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          {modal === "terms" ? <TermsContent /> : null}
          {modal === "privacy" ? <PrivacyContent /> : null}
          {modal === "refund" ? <RefundContent /> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E2E6F0] bg-[#F7F8FC] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#CDD3E6] bg-white px-5 py-3 text-sm font-black text-[#1E293B] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            Close and continue registration
          </button>
        </div>
      </div>
    </div>
  )
}

function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-[#E2E6F0] py-5 last:border-b-0">
      <h3 className="text-base font-black tracking-[-0.02em] text-[#0E1B35]">
        {title}
      </h3>
      <div className="mt-2 space-y-3 text-sm leading-7 text-[#475569]">
        {children}
      </div>
    </section>
  )
}

function TermsContent() {
  return (
    <div>
      <div className="rounded-[22px] border border-[#DDD6FE] bg-[#F3F0FF] p-4 text-sm font-semibold leading-7 text-[#5B21B6]">
        Lexora Prep is a supplemental educational tool for Black Letter Law
        memorization. It is not a law firm, legal advisor, law school, official
        bar authority, or guarantee of exam success.
      </div>

      <LegalSection title="1. Educational purpose only">
        <p>
          Lexora Prep is designed to support Black Letter Law memorization and
          rule training. The platform provides educational study tools, rule
          recall practice, flashcards, analytics, and related learning features.
        </p>
      </LegalSection>

      <LegalSection title="2. Supplemental study tool">
        <p>
          Lexora Prep is not a full commercial bar preparation course and should
          not be used as your only study resource. You remain responsible for
          completing full preparation with appropriate materials.
        </p>
      </LegalSection>

      <LegalSection title="3. No guarantee of results">
        <p>
          Lexora Prep does not guarantee that you will pass any bar examination,
          receive a particular score, improve your score, be admitted to
          practice law, or achieve any academic, professional, or licensing
          result.
        </p>
      </LegalSection>

      <LegalSection title="4. User responsibility">
        <p>
          You are responsible for your own study decisions, preparation
          strategy, use of the platform, and reliance on any educational
          content. Legal rules may vary by jurisdiction and may change over
          time.
        </p>
      </LegalSection>

      <LegalSection title="5. Account use and security">
        <p>
          Each account is for one individual user only. You must provide
          accurate account information and keep your login credentials secure.
          You may not share, sell, transfer, or permit another person to use
          your account.
        </p>
      </LegalSection>

      <LegalSection title="6. Prohibited conduct">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Copying, scraping, downloading, reproducing, publishing, selling, or
            redistributing Lexora Prep content without permission.
          </li>
          <li>
            Sharing account access, passwords, paid materials, screenshots,
            rule banks, flashcards, or premium materials with others.
          </li>
          <li>
            Using bots, crawlers, automation tools, or unauthorized scripts to
            access the platform.
          </li>
          <li>
            Attempting to bypass payment, subscription limits, access controls,
            or security features.
          </li>
          <li>
            Using the platform for unlawful, abusive, fraudulent, or harmful
            purposes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          All Lexora Prep materials are owned by Lexora Prep or its licensors
          and are protected by applicable law. You receive a limited, revocable,
          non-transferable license to use the platform for personal study only.
        </p>
      </LegalSection>

      <LegalSection title="8. Subscriptions and payments">
        <p>
          Paid subscriptions are billed according to the plan selected at
          checkout. Payments are processed through Paddle. Lexora Prep does not
          store full credit card numbers on its own servers.
        </p>
      </LegalSection>

      <LegalSection title="9. Cancellation and refunds">
        <p>
          You may cancel your subscription at any time. Cancellation stops
          future renewal charges but does not automatically create a refund.
          Refunds are handled according to the Refund Policy.
        </p>
      </LegalSection>

      <LegalSection title="10. Content accuracy">
        <p>
          Lexora Prep aims to provide accurate and useful educational summaries,
          but we do not warrant that all content is complete, current, or error
          free. Users should verify important rules with official sources,
          licensed bar preparation materials, or applicable primary law when
          necessary.
        </p>
      </LegalSection>

      <LegalSection title="11. Platform changes">
        <p>
          Lexora Prep may update, improve, modify, suspend, or remove platform
          features over time to maintain service quality, stability, compliance,
          and product performance.
        </p>
      </LegalSection>

      <LegalSection title="12. Suspension or termination">
        <p>
          We may suspend or terminate your account if you violate these Terms,
          misuse the platform, or engage in conduct that may harm Lexora Prep,
          users, or third parties.
        </p>
      </LegalSection>

      <LegalSection title="13. Disclaimers and limitation of liability">
        <p>
          Lexora Prep is provided on an as is and as available basis. To the
          fullest extent permitted by law, we disclaim all warranties, express or
          implied. To the fullest extent permitted by law, Lexora Prep and its
          affiliates will not be liable for indirect, incidental, consequential,
          or exemplary damages.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>For questions, contact support@lexoraprep.com.</p>
      </LegalSection>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div>
      <div className="rounded-[22px] border border-[#DDD6FE] bg-[#F3F0FF] p-4 text-sm font-semibold leading-7 text-[#5B21B6]">
        Lexora Prep does not sell your personal data. Payment processing is
        handled through Paddle, and Lexora Prep does not store full card
        details.
      </div>

      <LegalSection title="1. Information we collect">
        <p>
          We may collect information you provide directly, including your name,
          email address, account credentials, subscription status, support
          messages, feedback, and other information you choose to submit.
        </p>
      </LegalSection>

      <LegalSection title="2. Study and platform data">
        <p>
          We may collect study-related data, including subjects reviewed, rules
          accessed, flashcard progress, completion status, weak areas, study
          plan settings, selected plan, and platform usage data.
        </p>
      </LegalSection>

      <LegalSection title="3. Payment information">
        <p>
          Payments are processed through Paddle. Lexora Prep does not store full
          credit card numbers or payment card information on its own servers.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <p>
          We use information to create and manage accounts, provide platform
          features, process billing through Paddle, respond to support requests,
          improve the platform, prevent fraud, maintain security, and comply
          with legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="5. We do not sell personal data">
        <p>
          Lexora Prep does not sell your personal data or provide it to third
          parties for their independent advertising purposes.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and similar technologies">
        <p>
          We may use cookies and similar technologies to keep users logged in,
          remember preferences, support security, and analyze usage. Necessary
          cookies are required for core platform functionality.
        </p>
      </LegalSection>

      <LegalSection title="7. Data security">
        <p>
          We use reasonable technical and organizational safeguards to protect
          user information. No internet-based service can guarantee complete
          security.
        </p>
      </LegalSection>

      <LegalSection title="8. User choices">
        <p>
          You may request access, correction, deletion, or account closure by
          contacting support. Some information may need to be retained where
          required for legal, billing, fraud prevention, or legitimate business
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>For privacy questions, contact support@lexoraprep.com.</p>
      </LegalSection>
    </div>
  )
}

function RefundContent() {
  return (
    <div>
      <div className="rounded-[22px] border border-[#DDD6FE] bg-[#F3F0FF] p-4 text-sm font-semibold leading-7 text-[#5B21B6]">
        Refunds are not automatic. A refund may be available within 14 calendar
        days of the initial purchase if the account has not substantially used
        paid materials.
      </div>

      <LegalSection title="1. Fourteen-day refund window">
        <p>
          You may request a refund within 14 calendar days of your initial
          purchase, subject to the usage requirement and the other conditions in
          this Refund Policy.
        </p>
      </LegalSection>

      <LegalSection title="2. Usage requirement">
        <p>
          To qualify for a refund, the account must not have substantially
          accessed, used, copied, or consumed paid materials under the selected
          plan. Lexora Prep may deny refund requests where paid content has been
          meaningfully used.
        </p>
      </LegalSection>

      <LegalSection title="3. Non-refundable situations">
        <p>Refunds are generally not available when:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The request is made after the 14 calendar day refund window.</li>
          <li>Paid materials were substantially accessed or used.</li>
          <li>The account violated the Terms and Conditions.</li>
          <li>The user forgot to cancel before renewal.</li>
          <li>The user copied, scraped, shared, or attempted to extract protected platform content.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Subscription cancellation">
        <p>
          You may cancel your subscription to stop future billing. Cancellation
          does not automatically create a refund unless the refund request
          satisfies this Refund Policy.
        </p>
      </LegalSection>

      <LegalSection title="5. Payment processor">
        <p>
          Refunds are processed through Paddle. Processing times may depend on
          Paddle, your bank, card issuer, payment method, or applicable payment
          network.
        </p>
      </LegalSection>

      <LegalSection title="6. How to request a refund">
        <p>
          Contact support@lexoraprep.com within the applicable refund window.
          Include the email used for purchase, date of purchase, selected plan,
          and reason for the request.
        </p>
      </LegalSection>
    </div>
  )
}
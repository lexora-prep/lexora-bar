"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Headphones,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  User,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const EXAM_MONTHS = [
  { value: 2, label: "February" },
  { value: 7, label: "July" },
]

type ProfileResponse = {
  id: string
  email: string | null
  full_name: string | null
  law_school: string | null
  jurisdiction: string | null
  exam_month: number | null
  exam_year: number | null
  subscription_tier?: string | null
  billing_status?: string | null
  billing_interval?: string | null
  billing_period_ends_at?: string | null
  created_at?: string | null
  mbe_access?: boolean
}

type SettingsTab = "profile" | "security" | "subscription" | "support" | "danger"

function formatPlan(plan?: string | null) {
  if (!plan || plan === "free") return "Free"
  if (plan === "bll-monthly" || plan === "bll_monthly" || plan === "bll") return "BLL Monthly"
  if (plan === "premium") return "Premium"
  return plan
}

function formatMonth(value: string) {
  return EXAM_MONTHS.find((month) => String(month.value) === value)?.label || "Not set"
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Not set"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState("")
  const [devConfirmUrl, setDevConfirmUrl] = useState("")

  const planLabel = formatPlan(profile?.subscription_tier)
  const isPaid = planLabel !== "Free" || profile?.billing_status === "active"
  const accountStatus = profile?.billing_status === "active" || isPaid ? "Active" : "Free"
  const billingCycle =
    profile?.billing_interval === "year"
      ? "Annual"
      : profile?.billing_interval === "month"
        ? "Monthly"
        : isPaid
          ? "Monthly"
          : "None"

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2600)
  }

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

        setProfile(data)
        setEmail(data.email ?? user.email ?? "")
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

  async function handleSaveProfile() {
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
        showToast(data?.error || data?.message || "Failed to save profile.")
        return
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              law_school: lawSchool,
            }
          : prev,
      )

      showToast("Profile saved.")
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err)
      showToast("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    setPasswordError("")
    setPasswordMessage("")

    const cleanPassword = newPassword.trim()
    const cleanConfirmPassword = confirmNewPassword.trim()

    if (cleanPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.")
      return
    }

    if (
      !/[A-Za-z]/.test(cleanPassword) ||
      !/\d/.test(cleanPassword) ||
      !/[^A-Za-z0-9]/.test(cleanPassword)
    ) {
      setPasswordError("Password must include a letter, a number, and a special character.")
      return
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setPasswordError("Passwords do not match.")
      return
    }

    try {
      setPasswordSaving(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("PASSWORD SESSION ERROR:", sessionError)
        setPasswordError(sessionError.message || "Unable to verify your login session.")
        return
      }

      if (!session) {
        setPasswordError("Your login session expired. Please log out, log back in, and try again.")
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: cleanPassword,
      })

      if (error) {
        console.error("PASSWORD UPDATE SUPABASE ERROR:", error)
        setPasswordError(error.message || "Unable to update password.")
        return
      }

      setNewPassword("")
      setConfirmNewPassword("")
      setPasswordMessage("Password updated successfully. Use the new password the next time you log in.")
      showToast("Password updated.")
    } catch (err) {
      console.error("PASSWORD UPDATE ERROR:", err)
      setPasswordError("Unable to update password. Please try again or use Forgot Password from the login page.")
    } finally {
      setPasswordSaving(false)
    }
  }

  async function signOutCurrentDevice() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleDeleteAccountRequest() {
    try {
      setDeleteError("")
      setDeleteSuccess("")
      setDevConfirmUrl("")

      if (deleteConfirmText !== "DELETE") {
        setDeleteError('Please type DELETE exactly to confirm.')
        return
      }

      setDeleteLoading(true)

      const res = await fetch("/api/account/delete-request", {
        method: "POST",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setDeleteError(data?.error || data?.message || "Failed to start account deletion.")
        return
      }

      setDeleteSuccess(data?.message || "Deletion request created. Check your email to confirm.")
      if (data?.devConfirmUrl) {
        setDevConfirmUrl(data.devConfirmUrl)
      }
      setDeleteConfirmText("")
      showToast("Deletion request created.")
    } catch (err) {
      console.error("DELETE ACCOUNT ERROR:", err)
      setDeleteError("Something went wrong while requesting account deletion.")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleCancelDeletion() {
    try {
      setDeleteLoading(true)
      setDeleteError("")
      setDeleteSuccess("")
      setDevConfirmUrl("")

      const res = await fetch("/api/account/delete-cancel", {
        method: "POST",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setDeleteError(data?.error || data?.message || "Failed to cancel deletion.")
        return
      }

      setDeleteSuccess(data?.message || "Deletion cancelled.")
      showToast("Deletion cancelled.")
    } catch (err) {
      console.error("CANCEL DELETE ERROR:", err)
      setDeleteError("Something went wrong while cancelling deletion.")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-slate-500">
        Loading account settings...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit border-r border-slate-200 pr-6">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Account
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Settings
            </div>
          </div>

          <nav className="space-y-1">
            <SettingsNavItem active={activeTab === "profile"} icon={<User />} label="Profile" onClick={() => setActiveTab("profile")} />
            <SettingsNavItem active={activeTab === "security"} icon={<ShieldCheck />} label="Security" onClick={() => setActiveTab("security")} />
            <SettingsNavItem active={activeTab === "subscription"} icon={<Crown />} label="Subscription" onClick={() => setActiveTab("subscription")} />
            <SettingsNavItem active={activeTab === "support"} icon={<Headphones />} label="Support" onClick={() => setActiveTab("support")} />
            <SettingsNavItem danger active={activeTab === "danger"} icon={<AlertTriangle />} label="Danger Zone" onClick={() => setActiveTab("danger")} />
          </nav>

          <div className="mt-8 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6D4AFF] text-sm font-semibold text-white">
                {(fullName || email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {fullName || "User"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {planLabel} learner
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {activeTab !== "subscription" ? (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                {activeTab === "profile" ? "Profile" : null}
                {activeTab === "security" ? "Security" : null}
                {activeTab === "subscription" ? "Subscription" : null}
                {activeTab === "support" ? "Support" : null}
                {activeTab === "danger" ? "Danger Zone" : null}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {activeTab === "profile"
                  ? "Manage your personal information. Exam details are locked to protect your study plan."
                  : null}
                {activeTab === "security"
                  ? "Update your password and manage the current session."
                  : null}
                {activeTab === "subscription"
                  ? "View billing details, plan access, and included premium features."
                  : null}
                {activeTab === "support" ? null : null}
                {activeTab === "danger"
                  ? "Request deletion only after confirming the action."
                  : null}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Account {accountStatus.toLowerCase()}
            </div>
          </div>
          ) : null}

          {activeTab === "profile" ? (
            <section className="max-w-[860px]">
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <Field label="Full name">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClass}
                    placeholder="Enter your full name"
                  />
                </Field>

                <Field label="Email address">
                  <LockedText value={email || "Not set"} icon={<Mail size={15} />} />
                  <p className="mt-2 text-xs text-slate-400">
                    Email changes require verification through authentication.
                  </p>
                </Field>

                <Field label="Law school">
                  <input
                    type="text"
                    value={lawSchool}
                    onChange={(event) => setLawSchool(event.target.value)}
                    className={inputClass}
                    placeholder="Enter your law school"
                  />
                </Field>

                <Field label="Jurisdiction">
                  <LockedText value={jurisdiction || "Not set"} />
                </Field>

                <Field label="Exam month">
                  <LockedText value={formatMonth(examMonth)} />
                </Field>

                <Field label="Exam year">
                  <LockedText value={examYear || "Not set"} />
                </Field>
              </div>

              <div className="mt-6 border-l-2 border-violet-300 bg-violet-50/60 px-4 py-3 text-sm leading-6 text-violet-700">
                Jurisdiction and exam date are locked because changing them can affect your rule universe, study plan, due reviews, and analytics. Contact support if these details need to be changed.
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={primaryButtonClass}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "security" ? (
            <section className="max-w-[760px]">
              <div className="mb-6 border-l-2 border-violet-300 bg-violet-50/60 px-4 py-3 text-sm leading-6 text-violet-700">
                Password changes are handled securely through Supabase authentication. Lexora Prep never stores or displays your password.
              </div>

              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                <Field label="Login email">
                  <LockedText value={email || "Not set"} icon={<Mail size={15} />} />
                </Field>

                <Field label="Current session">
                  <LockedText value="Current browser session" />
                </Field>

                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      setPasswordError("")
                      setPasswordMessage("")
                    }}
                    className={inputClass}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirm password">
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => {
                      setConfirmNewPassword(event.target.value)
                      setPasswordError("")
                      setPasswordMessage("")
                    }}
                    className={inputClass}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Use at least 8 characters with a letter, number, and special character.
              </p>

              {passwordError ? <InlineNotice tone="error">{passwordError}</InlineNotice> : null}
              {passwordMessage ? <InlineNotice tone="success">{passwordMessage}</InlineNotice> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={signOutCurrentDevice} className={secondaryButtonClass}>
                  <LogOut size={16} />
                  Sign out current device
                </button>

                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={passwordSaving}
                  className={primaryButtonClass}
                >
                  <LockKeyhole size={16} />
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "subscription" ? (
            <section className="max-w-[820px]">
              <div className="overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-[0_24px_70px_rgba(109,74,255,0.10)]">
                <div className="border-b border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-6 py-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-[#6D4AFF]">
                        <Crown size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
                          Your Subscription
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Your plan and access overview.
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {accountStatus}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Current plan</div>
                      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {planLabel}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <div className="text-xs font-medium text-slate-500">Renews on</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {formatDate(profile?.billing_period_ends_at)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-500">Billing cycle</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {billingCycle}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <div className="text-xs font-medium text-slate-500">Member since</div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {formatDate(profile?.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px bg-slate-200" />

                  <div>
                    <div className="text-sm font-semibold text-slate-950">Plan includes</div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        "Full BLL rule access",
                        "Rule Training",
                        "Spaced repetition",
                        "Weak rule targeting",
                        "Study progress tracking",
                        "Analytics",
                        "Reports",
                        "PDF export",
                        "120 Golden Rules",
                        "120 Golden Flashcards",
                        "Priority support",
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[#6D4AFF]">
                            <CheckCircle2 size={13} />
                          </span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => router.push("/subscription")}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-violet-200 bg-white px-5 text-sm font-semibold text-[#6D4AFF] transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-50 active:scale-[0.98]"
                    >
                      Manage payment
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/subscription")}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[#6D4AFF] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(109,74,255,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98]"
                    >
                      Change plan
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "support" ? (
            <section className="max-w-[760px]">
              <div className="border-y border-slate-200 py-5">
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Open the support center to create tickets, reply to support, or review previous account and billing requests.
                </p>
              </div>

              <div className="mt-6">
                <button type="button" onClick={() => router.push("/support")} className={primaryButtonClass}>
                  <Headphones size={16} />
                  Open support center
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "danger" ? (
            <section className="max-w-[760px]">
              <div className="border-l-2 border-red-300 bg-red-50/70 px-4 py-3 text-sm leading-6 text-red-700">
                Type DELETE to request account deletion. For safety, the system uses an email confirmation step before deletion is scheduled.
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label='Type "DELETE" to confirm'>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(event) => {
                      setDeleteConfirmText(event.target.value)
                      setDeleteError("")
                      setDeleteSuccess("")
                      setDevConfirmUrl("")
                    }}
                    className={inputClass}
                    placeholder="DELETE"
                  />
                </Field>

                <button
                  type="button"
                  onClick={handleDeleteAccountRequest}
                  disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                  className={dangerButtonClass}
                >
                  <AlertTriangle size={16} />
                  {deleteLoading ? "Requesting..." : "Request deletion"}
                </button>
              </div>

              {deleteError ? <InlineNotice tone="error">{deleteError}</InlineNotice> : null}
              {deleteSuccess ? <InlineNotice tone="success">{deleteSuccess}</InlineNotice> : null}

              {devConfirmUrl ? (
                <div className="mt-4 text-sm">
                  <a href={devConfirmUrl} className="font-semibold text-violet-600 underline underline-offset-4">
                    Open development confirmation link
                  </a>
                </div>
              ) : null}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={deleteLoading}
                  className={secondaryButtonClass}
                >
                  Cancel pending deletion
                </button>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          {toast}
        </div>
      ) : null}
    </div>
  )
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,74,255,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:text-[#6D4AFF] active:scale-[0.98]"

const dangerButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 active:scale-[0.98]"

function SettingsNavItem({
  icon,
  label,
  active,
  danger = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  active: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
        active
          ? danger
            ? "bg-red-50 text-red-600"
            : "bg-violet-50 text-[#6D4AFF]"
          : danger
            ? "text-red-600 hover:bg-red-50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </button>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  danger = false,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  danger?: boolean
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={danger ? "text-red-500" : "text-[#6D4AFF]"}>
        <span className="[&>svg]:h-6 [&>svg]:w-6">{icon}</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  )
}

function LockedText({
  value,
  icon,
}: {
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
      <span>{value}</span>
      <span className="text-slate-400">{icon || <LockKeyhole size={15} />}</span>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid min-h-[54px] grid-cols-[1fr_auto] items-center gap-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

function InlineNotice({
  tone,
  children,
}: {
  tone: "success" | "error"
  children: ReactNode
}) {
  return (
    <div
      className={`mt-4 border-l-2 px-4 py-3 text-sm leading-6 ${
        tone === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-red-300 bg-red-50 text-red-700"
      }`}
    >
      {children}
    </div>
  )
}

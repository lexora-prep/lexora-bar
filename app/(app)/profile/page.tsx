"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Crown,
  GraduationCap,
  Headphones,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  User,
  WalletCards,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const EXAM_MONTHS = [
  { value: 2, label: "February" },
  { value: 7, label: "July" },
]

type SettingsTab = "profile" | "subscription" | "security" | "support" | "danger"

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

function formatPlan(plan?: string | null) {
  if (!plan || plan === "free") return "Free"
  if (plan === "bll-monthly" || plan === "bll_monthly" || plan === "bll") return "BLL Monthly"
  if (plan === "premium") return "Premium"
  return plan
}

function formatExamMonth(value: string) {
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
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const planLabel = formatPlan(profile?.subscription_tier)
  const isPaid = planLabel !== "Free" || profile?.billing_status === "active"
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm font-semibold text-slate-500">
        Loading account settings...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-5 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.05)] lg:sticky lg:top-6 lg:h-fit">
          <div className="px-3 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Account
            </div>
            <div className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
              Settings
            </div>
          </div>

          <nav className="space-y-1.5">
            <SettingsNavItem active={activeTab === "profile"} icon={<User />} label="Profile" onClick={() => setActiveTab("profile")} />
            <SettingsNavItem active={activeTab === "subscription"} icon={<Crown />} label="Subscription" onClick={() => setActiveTab("subscription")} />
            <SettingsNavItem active={activeTab === "security"} icon={<ShieldCheck />} label="Security" onClick={() => setActiveTab("security")} />
            <SettingsNavItem active={activeTab === "support"} icon={<Headphones />} label="Support" onClick={() => setActiveTab("support")} />
            <SettingsNavItem danger active={activeTab === "danger"} icon={<AlertTriangle />} label="Danger Zone" onClick={() => setActiveTab("danger")} />
          </nav>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6D4AFF] text-base font-black text-white">
                {(fullName || email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">
                  {fullName || "User"}
                </div>
                <div className="truncate text-xs font-semibold text-slate-500">
                  {planLabel} learner
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[30px] font-black tracking-[-0.04em] text-slate-950">
                {activeTab === "profile" ? "Profile" : null}
                {activeTab === "subscription" ? "Subscription" : null}
                {activeTab === "security" ? "Security" : null}
                {activeTab === "support" ? "Support" : null}
                {activeTab === "danger" ? "Danger Zone" : null}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                {activeTab === "profile"
                  ? "Manage your personal information. Exam details are locked to protect your study plan."
                  : null}
                {activeTab === "subscription"
                  ? "Review your plan, billing cycle, and payment controls."
                  : null}
                {activeTab === "security"
                  ? "Manage password and login controls."
                  : null}
                {activeTab === "support"
                  ? "Get help with your account, billing, or technical issues."
                  : null}
                {activeTab === "danger"
                  ? "Permanent account actions that require confirmation."
                  : null}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="text-xs font-black text-slate-600">
                {isPaid ? "Account active" : "Free account"}
              </div>
            </div>
          </div>

          {activeTab === "profile" ? (
            <SectionCard>
              <SectionHeader icon={<User />} title="Profile Information" subtitle="Only name and law school are editable." />

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full name">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Enter your full name"
                  />
                </Field>

                <Field label="Email address">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Email changes require verification through authentication.
                  </p>
                </Field>

                <Field label="Law school">
                  <input
                    type="text"
                    value={lawSchool}
                    onChange={(event) => setLawSchool(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Enter your law school"
                  />
                </Field>

                <Field label="Jurisdiction">
                  <LockedValue value={jurisdiction || "Not set"} />
                </Field>

                <Field label="Exam month">
                  <LockedValue value={formatExamMonth(examMonth)} />
                </Field>

                <Field label="Exam year">
                  <LockedValue value={examYear || "Not set"} />
                </Field>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-semibold leading-5 text-violet-700">
                Jurisdiction and exam date are locked because changing them can affect your rule universe, study plan, due reviews, and analytics. Contact support if these details need to be changed.
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(109,74,255,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "subscription" ? (
            <SectionCard>
              <SectionHeader icon={<WalletCards />} title="Subscription" subtitle="Your plan and payment controls." />

              <div className="rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5">
                <div className="grid gap-5 md:grid-cols-4">
                  <InfoBlock label="Current plan" value={planLabel} large />
                  <InfoBlock label="Billing cycle" value={billingCycle} />
                  <InfoBlock label="Renews on" value={formatDate(profile?.billing_period_ends_at)} />
                  <InfoBlock label="BLL access" value={isPaid ? "Enabled" : "Limited"} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => router.push("/subscription")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:text-[#6D4AFF] active:scale-[0.98]"
                >
                  Manage payment
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/subscription")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(109,74,255,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98]"
                >
                  Change plan
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                Subscription billing, invoices, payment method updates, cancellation, and upgrades are managed through the Subscription page and Paddle.
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "security" ? (
            <SectionCard>
              <SectionHeader icon={<LockKeyhole />} title="Password Management" subtitle="Change your password securely." />

              <p className="mb-5 text-sm font-medium leading-6 text-slate-500">
                Password changes are handled through Supabase authentication. Lexora Prep never stores or displays your password.
              </p>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Current login email">
                  <LockedValue value={email || "Not set"} />
                </Field>

                <Field label="Current device">
                  <LockedValue value="Current browser session" />
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
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                Use at least 8 characters with a letter, number, and special character.
              </p>

              {passwordError ? <InlineNotice tone="error">{passwordError}</InlineNotice> : null}
              {passwordMessage ? <InlineNotice tone="success">{passwordMessage}</InlineNotice> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={signOutCurrentDevice}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:text-[#6D4AFF] active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  Sign out current device
                </button>

                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={passwordSaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(109,74,255,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <LockKeyhole size={16} />
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "support" ? (
            <SectionCard>
              <SectionHeader icon={<Headphones />} title="Support" subtitle="Choose the issue type and open support." />

              <div className="grid gap-4 md:grid-cols-3">
                <SupportCard title="Billing issue" description="Payment, invoice, plan, or cancellation question." />
                <SupportCard title="Account issue" description="Login, password, profile, or access problem." />
                <SupportCard title="Technical issue" description="Bug, broken page, performance, or data issue." />
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push("/support")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(109,74,255,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5B21B6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <Headphones size={16} />
                  Open support page
                </button>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "danger" ? (
            <SectionCard danger>
              <SectionHeader danger icon={<AlertTriangle />} title="Danger Zone" subtitle="Permanent account actions." />

              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
                Deleting an account can remove access and account data. This action should only be enabled after typed confirmation and after backend deletion logic is fully verified.
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <Field label='Type "DELETE" to confirm'>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="DELETE"
                  />
                </Field>

                <button
                  type="button"
                  disabled={deleteConfirm !== "DELETE"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-red-200 disabled:hover:translate-y-0"
                >
                  <Trash2 size={16} />
                  Delete account
                </button>
              </div>
            </SectionCard>
          ) : null}
        </main>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          {toast}
        </div>
      ) : null}
    </div>
  )
}

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
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition-all duration-200 active:scale-[0.98] ${
        active
          ? danger
            ? "bg-red-50 text-red-600"
            : "bg-violet-50 text-[#6D4AFF]"
          : danger
            ? "text-red-600 hover:bg-red-50"
            : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </button>
  )
}

function SectionCard({
  children,
  danger = false,
}: {
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section
      className={`rounded-[30px] border bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:p-7 ${
        danger ? "border-red-200" : "border-slate-200"
      }`}
    >
      {children}
    </section>
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
    <div className="mb-6 flex items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          danger ? "bg-red-50 text-red-600" : "bg-violet-50 text-[#6D4AFF]"
        }`}
      >
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div>
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
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
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  )
}

function LockedValue({ value }: { value: string }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500">
      <span>{value}</span>
      <LockKeyhole size={15} className="text-slate-400" />
    </div>
  )
}

function InfoBlock({
  label,
  value,
  large = false,
}: {
  label: string
  value: string
  large?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={large ? "mt-1 text-2xl font-black text-slate-950" : "mt-1 text-sm font-black text-slate-950"}>
        {value}
      </div>
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
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {children}
    </div>
  )
}

function SupportCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm font-black text-slate-950">{title}</div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  )
}

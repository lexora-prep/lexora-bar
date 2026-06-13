"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  CalendarRange,
  CheckCircle2,
  Crown,
  Database,
  GraduationCap,
  Laptop,
  LockKeyhole,
  Mail,
  Monitor,
  Save,
  Shield,
  Target,
  User,
  WalletCards,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const EXAM_MONTHS = [
  { value: 2, label: "February" },
  { value: 7, label: "July" },
]

const EXAM_YEARS = Array.from({ length: 25 }, (_, i) => 2026 + i)

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

const STATES = [
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
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
]

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

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [lawSchool, setLawSchool] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [examMonth, setExamMonth] = useState("")
  const [examYear, setExamYear] = useState("")
  const [profile, setProfile] = useState<ProfileResponse | null>(null)

  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

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

  async function handleSave() {
    if (!userId) return

    try {
      setSaving(true)
      setSaveError("")
      setSaveMessage("")

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
        setSaveError(data?.error || data?.message || "Failed to save profile.")
        return
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              law_school: lawSchool,
              jurisdiction,
              exam_month: examMonth ? Number(examMonth) : null,
              exam_year: examYear ? Number(examYear) : null,
            }
          : prev,
      )

      setSaveMessage("Profile saved successfully.")
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err)
      setSaveError("Failed to save profile.")
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
    } catch (err) {
      console.error("PASSWORD UPDATE ERROR:", err)
      setPasswordError("Unable to update password. Please try again or use Forgot Password from the login page.")
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] p-6 text-sm font-semibold text-slate-500">
        Loading account settings...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#10172A]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200/80 bg-white/70 p-6 backdrop-blur-xl lg:block">
          <div className="mb-8 flex items-center gap-3">
            <img src="/icon.png" alt="Lexora Prep" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-[22px] font-black uppercase tracking-[0.16em] text-[#18213F]">
                Lexora
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.55em] text-[#7C3AED]">
                Prep
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarItem active icon={<User />} label="Profile" />
            <SidebarItem icon={<Crown />} label="Subscription" />
            <SidebarItem icon={<Target />} label="Study Preferences" />
            <SidebarItem icon={<Bell />} label="Notifications" />
            <SidebarItem icon={<Shield />} label="Security" />
            <SidebarItem icon={<Database />} label="Privacy & Data" />
            <SidebarItem icon={<Monitor />} label="Connected Devices" />
            <SidebarItem danger icon={<AlertTriangle />} label="Danger Zone" />
          </nav>

          <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-black text-slate-900">Need help?</div>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              Visit Help Center or contact support for account issues.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
            >
              Help Center
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-black text-white">
                {(fullName || email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-900">
                  {fullName || "User"}
                </div>
                <div className="truncate text-xs font-semibold text-slate-500">
                  {planLabel} learner
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[30px] font-black tracking-[-0.04em] text-slate-950">
                  Account Settings
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  Manage your profile, study preferences, subscription, security, and account controls.
                </p>
              </div>

              <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4">
                <StatusPill icon={<Crown />} label="Current plan" value={planLabel} />
                <StatusPill icon={<CheckCircle2 />} label="Account status" value={accountStatus} success />
                <StatusPill icon={<CheckCircle2 />} label="BLL access" value={isPaid ? "Enabled" : "Limited"} success={isPaid} />
                <StatusPill icon={<Shield />} label="MBE access" value={profile?.mbe_access ? "Enabled" : "Not enabled"} success={Boolean(profile?.mbe_access)} />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <Card>
                <CardHeader icon={<User />} title="Profile Information" subtitle="Your personal and study information." />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value)
                        setSaveError("")
                        setSaveMessage("")
                      }}
                      placeholder="Enter your full name"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </Field>

                  <Field label="Email address">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-slate-400">
                      Email changes require verification through authentication.
                    </div>
                  </Field>

                  <Field label="Law school">
                    <input
                      type="text"
                      value={lawSchool}
                      onChange={(event) => {
                        setLawSchool(event.target.value)
                        setSaveError("")
                        setSaveMessage("")
                      }}
                      placeholder="Enter your law school"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </Field>

                  <Field label="Jurisdiction">
                    <select
                      value={jurisdiction}
                      onChange={(event) => {
                        setJurisdiction(event.target.value)
                        setSaveError("")
                        setSaveMessage("")
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Select jurisdiction</option>
                      {STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Exam month">
                    <select
                      value={examMonth}
                      onChange={(event) => {
                        setExamMonth(event.target.value)
                        setSaveError("")
                        setSaveMessage("")
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Select month</option>
                      {EXAM_MONTHS.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Exam year">
                    <select
                      value={examYear}
                      onChange={(event) => {
                        setExamYear(event.target.value)
                        setSaveError("")
                        setSaveMessage("")
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Select year</option>
                      {EXAM_YEARS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {saveError ? <Notice tone="error">{saveError}</Notice> : null}
                {saveMessage ? <Notice tone="success">{saveMessage}</Notice> : null}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6D4AFF] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,74,255,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save profile"}
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black text-white">
                      {(fullName || email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-950">
                        {fullName || "Name not set"}
                      </div>
                      <div className="text-sm font-semibold text-slate-500">
                        Preparing for {formatMonth(examMonth)} {examYear || "exam"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader icon={<Crown />} title="Subscription" subtitle="Your plan and access overview." />

                <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow label="Current plan" value={planLabel} large />
                    <InfoRow label="Renews on" value={formatDate(profile?.billing_period_ends_at)} />
                    <InfoRow label="Billing cycle" value={billingCycle} />
                    <InfoRow label="Member since" value={formatDate(profile?.created_at)} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "Rule Training",
                    "Spaced Review",
                    "Analytics",
                    "Weak Area Tracking",
                    "Reports",
                    "PDF Export",
                    "BLL Access",
                    "Priority Support",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CheckCircle2 size={16} className="text-[#6D4AFF]" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => router.push("/subscription")}
                    className="h-11 rounded-xl border border-violet-200 bg-white px-4 text-sm font-black text-violet-700 shadow-sm hover:bg-violet-50"
                  >
                    Manage payment
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/subscription")}
                    className="h-11 rounded-xl bg-[#6D4AFF] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,74,255,0.20)] hover:bg-[#5B21B6]"
                  >
                    Change plan
                  </button>
                </div>
              </Card>

              <Card>
                <CardHeader icon={<Target />} title="Study Preferences" subtitle="Customize your study experience." />

                <PreferenceRow icon={<CalendarRange />} label="Exam date" value={`${formatMonth(examMonth)} ${examYear || ""}`.trim() || "Not set"} />
                <PreferenceRow icon={<GraduationCap />} label="Jurisdiction" value={jurisdiction || "Not set"} />
                <PreferenceRow icon={<Target />} label="Learner type" value={jurisdiction ? "UBE Candidate" : "Not set"} />
                <PreferenceRow icon={<CheckCircle2 />} label="Auto-generate daily plan" value="Enabled" />


              </Card>

              <Card>
                <CardHeader icon={<Bell />} title="Notifications" subtitle="Control how you receive updates." />

                <ToggleRow label="Study reminders" description="Get reminders for scheduled study sessions." />
                <ToggleRow label="Due review reminders" description="Receive reminders for due and overdue reviews." />
                <ToggleRow label="Weekly progress report" description="Summary of your weekly study progress." />
                <ToggleRow label="Product announcements" description="Important updates and new features." />


              </Card>

              <Card>
                <CardHeader icon={<LockKeyhole />} title="Security" subtitle="Password and account protection." />

                <p className="mb-4 text-sm font-medium leading-6 text-slate-500">
                  Update your password securely through Supabase authentication. Lexora Prep never stores or displays your password.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="New password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        setPasswordError("")
                        setPasswordMessage("")
                      }}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </Field>
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-500">
                  Use at least 8 characters with a letter, number, and special character.
                </div>

                {passwordError ? <Notice tone="error">{passwordError}</Notice> : null}
                {passwordMessage ? <Notice tone="success">{passwordMessage}</Notice> : null}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <LockKeyhole size={16} />
                    {passwordSaving ? "Updating..." : "Update password"}
                  </button>
                </div>
              </Card>

              <Card>
                <CardHeader icon={<Database />} title="Privacy & Data" subtitle="Manage data controls and privacy settings." />

                <PreferenceRow icon={<Database />} label="Account data" value="Stored securely" />
                <PreferenceRow icon={<Shield />} label="Privacy controls" value="Available" />
                <PreferenceRow icon={<Mail />} label="Email communication" value={email || "Not set"} />


              </Card>

              <Card>
                <CardHeader icon={<Laptop />} title="Connected Devices" subtitle="Review active sessions and devices." />

                <PreferenceRow icon={<Laptop />} label="Current session" value="Active browser session" />
                <PreferenceRow icon={<Shield />} label="Session security" value="Managed by Supabase" />


              </Card>

              <Card>
                <CardHeader danger icon={<AlertTriangle />} title="Danger Zone" subtitle="Account deletion and irreversible controls." />

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  Account deletion should require confirmation and should not be triggered from a fake button.
                </div>


              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  active = false,
  danger = false,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  danger?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
        active
          ? "bg-violet-50 text-[#6D4AFF]"
          : danger
            ? "text-red-600 hover:bg-red-50"
            : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </div>
  )
}

function StatusPill({
  icon,
  label,
  value,
  success = false,
}: {
  icon: ReactNode
  label: string
  value: string
  success?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          success ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-[#6D4AFF]"
        }`}
      >
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-black text-slate-950">{value}</div>
      </div>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-6">
      {children}
    </section>
  )
}

function CardHeader({
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
    <div className="mb-5 flex items-start gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          danger ? "bg-red-50 text-red-600" : "bg-violet-50 text-[#6D4AFF]"
        }`}
      >
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div>
        <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">{title}</h2>
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
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({
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

function PreferenceRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-[#6D4AFF]">
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        </div>
        <div className="text-sm font-bold text-slate-700">{label}</div>
      </div>
      <div className="text-right text-sm font-bold text-slate-500">{value}</div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <div>
        <div className="text-sm font-black text-slate-800">{label}</div>
        <div className="mt-0.5 text-xs font-medium text-slate-500">{description}</div>
      </div>
      <div className="flex h-6 w-11 items-center rounded-full bg-[#6D4AFF] p-1 shadow-inner">
        <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
      </div>
    </div>
  )
}

function Notice({
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

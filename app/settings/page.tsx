"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string | null
  mbe_access: boolean
  pending_deletion?: boolean
  deletion_requested_at?: string | null
}

type PreferenceData = {
  email_announcements: boolean
  study_reminders: boolean
  sound_effects: boolean
  compact_mode: boolean
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState("")

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [subscriptionTier, setSubscriptionTier] = useState("free")
  const [mbeAccess, setMbeAccess] = useState(false)

  const [emailAnnouncements, setEmailAnnouncements] = useState(true)
  const [studyReminders, setStudyReminders] = useState(true)
  const [soundEffects, setSoundEffects] = useState(false)
  const [compactMode, setCompactMode] = useState(false)

  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [devConfirmUrl, setDevConfirmUrl] = useState("")
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const [deletionRequestedAt, setDeletionRequestedAt] = useState("")

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        setError("")
        setSuccess("")
        setDeleteError("")
        setDeleteSuccess("")

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          setError("Unable to load settings.")
          return
        }

        const [profileRes, prefsRes] = await Promise.all([
          fetch(`/api/profile?userId=${user.id}`, { cache: "no-store" }),
          fetch("/api/settings/preferences", { cache: "no-store" }),
        ])

        if (!profileRes.ok) {
          const data = await profileRes.json().catch(() => null)
          setError(data?.error || "Failed to load profile settings.")
          return
        }

        const profile: ProfileData = await profileRes.json()

        setEmail(profile.email || "")
        setFullName(profile.full_name || "")
        setSubscriptionTier(profile.subscription_tier || "free")
        setMbeAccess(!!profile.mbe_access)
        setPendingDeletion(!!profile.pending_deletion)
        setDeletionRequestedAt(profile.deletion_requested_at || "")

        if (prefsRes.ok) {
          const prefs: PreferenceData = await prefsRes.json()
          setEmailAnnouncements(!!prefs.email_announcements)
          setStudyReminders(!!prefs.study_reminders)
          setSoundEffects(!!prefs.sound_effects)
          setCompactMode(!!prefs.compact_mode)
        }
      } catch (err) {
        console.error("SETTINGS LOAD ERROR:", err)
        setError("Something went wrong while loading settings.")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [supabase])

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSavingPrefs(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailAnnouncements,
          studyReminders,
          soundEffects,
          compactMode,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Failed to save settings.")
        return
      }

      setSuccess("Settings saved successfully.")
    } catch (err) {
      console.error("SETTINGS SAVE ERROR:", err)
      setError("Failed to save settings.")
    } finally {
      setSavingPrefs(false)
    }
  }

  async function handleDeleteAccount() {
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

      setDeleteSuccess(data?.message || "Deletion request created.")
      if (data?.devConfirmUrl) {
        setDevConfirmUrl(data.devConfirmUrl)
      }
      setDeleteConfirmText("")
    } catch (err) {
      console.error("DELETE ACCOUNT ERROR:", err)
      setDeleteError("Something went wrong while requesting account deletion.")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleCancelDeletion() {
    try {
      setCancelLoading(true)
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

      setPendingDeletion(false)
      setDeletionRequestedAt("")
      setDeleteSuccess(data?.message || "Deletion cancelled.")
    } catch (err) {
      console.error("CANCEL DELETE ERROR:", err)
      setDeleteError("Something went wrong while cancelling deletion.")
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account preferences, notifications, security, and account actions.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          {(error || success) && (
            <div className="space-y-3">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSavePreferences} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Account Preferences</h2>
              <p className="mt-1 text-sm text-slate-500">
                Basic account information and product access overview.
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    value={fullName}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    value={email}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Subscription tier
                  </label>
                  <input
                    value={subscriptionTier}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm capitalize text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    MBE access
                  </label>
                  <input
                    value={mbeAccess ? "Enabled" : "Not enabled"}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Authentication and account protection settings.
              </p>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">Password management</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Password updates and reauthentication flow will be connected through Supabase.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">Current login email</div>
                  <div className="mt-1 text-sm text-slate-500">{email || "No email loaded"}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
              <p className="mt-1 text-sm text-slate-500">
                Control reminders and product communication preferences.
              </p>

              <div className="mt-5 space-y-4">
                <ToggleRow
                  title="Email announcements"
                  description="Receive important Lexora product updates and announcements."
                  checked={emailAnnouncements}
                  onChange={setEmailAnnouncements}
                />

                <ToggleRow
                  title="Study reminders"
                  description="Receive reminders for your study schedule and practice sessions."
                  checked={studyReminders}
                  onChange={setStudyReminders}
                />

                <ToggleRow
                  title="Sound effects"
                  description="Enable future sound cues during training and study sessions."
                  checked={soundEffects}
                  onChange={setSoundEffects}
                />

                <ToggleRow
                  title="Compact mode"
                  description="Use a tighter layout when this preference is connected to the UI."
                  checked={compactMode}
                  onChange={setCompactMode}
                />
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingPrefs ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </section>
          </form>

          <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            <p className="mt-1 text-sm text-slate-500">
              Permanently delete your account. This action requires confirmation.
            </p>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="text-sm font-medium text-red-700">Delete account</div>
              <div className="mt-1 text-sm text-red-600">
                Type <span className="font-semibold">DELETE</span> to confirm. An email confirmation step will be used when email is configured.
              </div>

              {pendingDeletion && (
                <div className="mb-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Your account is scheduled for deletion.
                  {deletionRequestedAt && (
                    <div className="mt-1">
                      Requested at: {new Date(deletionRequestedAt).toLocaleString()}
                    </div>
                  )}
                  <div className="mt-2">
                    You can cancel this request during the 14 day recovery period.
                  </div>
                </div>
              )}

              <div className="mt-4 max-w-sm">
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </div>

              {(deleteError || deleteSuccess || devConfirmUrl) && (
                <div className="mt-4 space-y-3">
                  {deleteError && (
                    <div className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-600">
                      {deleteError}
                    </div>
                  )}
                  {deleteSuccess && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {deleteSuccess}
                    </div>
                  )}
                  {devConfirmUrl && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 break-all">
                      Dev confirmation link:{" "}
                      <a className="underline" href={devConfirmUrl}>
                        {devConfirmUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deleteLoading ? "Submitting..." : "Delete account"}
                </button>
              </div>

              {pendingDeletion && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleCancelDeletion}
                    disabled={cancelLoading}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {cancelLoading ? "Cancelling..." : "Cancel deletion request"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-slate-900" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  )
}
"use client"

import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

export default function DeleteAccountConfirmClient() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("token") || "", [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState("")

  async function handleConfirm() {
    try {
      setLoading(true)
      setError("")
      setSuccess("")
      setScheduledDeletionAt("")

      const res = await fetch("/api/account/delete-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to confirm deletion.")
        return
      }

      setSuccess("Your account is now scheduled for deletion.")
      setScheduledDeletionAt(data?.scheduledDeletionAt || "")
    } catch (err) {
      console.error("DELETE CONFIRM PAGE ERROR:", err)
      setError("Something went wrong while confirming deletion.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Confirm account deletion</h1>
        <p className="mt-2 text-sm text-slate-500">
          This will start a 14 day recovery period. You can cancel deletion during that time.
        </p>

        {!token && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Missing or invalid deletion token.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
            {scheduledDeletionAt && (
              <div className="mt-2 text-sm text-green-700">
                Scheduled deletion date: {new Date(scheduledDeletionAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            disabled={!token || loading || !!success}
            onClick={handleConfirm}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Confirming..." : "Confirm deletion"}
          </button>
        </div>
      </div>
    </div>
  )
}
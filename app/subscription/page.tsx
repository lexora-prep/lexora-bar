"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type ProfileData = {
  id: string
  email: string
  subscription_tier: string | null
  mbe_access: boolean
}

export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("free")
  const [mbeAccess, setMbeAccess] = useState(false)

  useEffect(() => {
    async function loadSubscription() {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          setError("Unable to load subscription data.")
          return
        }

        const res = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error || "Failed to load subscription data.")
          return
        }

        const profile: ProfileData = await res.json()

        setEmail(profile.email || "")
        setPlan(profile.subscription_tier || "free")
        setMbeAccess(!!profile.mbe_access)
      } catch (err) {
        console.error("SUBSCRIPTION PAGE LOAD ERROR:", err)
        setError("Something went wrong while loading subscription.")
      } finally {
        setLoading(false)
      }
    }

    loadSubscription()
  }, [supabase])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Subscription</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your current plan and access status.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading subscription...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Account</div>
            <div className="mt-2 text-base font-medium text-slate-900">{email}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Current plan</div>
            <div className="mt-2 text-2xl font-semibold capitalize text-slate-900">
              {plan}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">MBE access</div>
            <div className="mt-2 text-base font-medium text-slate-900">
              {mbeAccess ? "Enabled" : "Not enabled"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Billing status</div>
            <div className="mt-2 text-base font-medium text-slate-900">
              {plan === "free" ? "No paid subscription yet" : "Active"}
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Billing management will appear here once payment integration is added.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
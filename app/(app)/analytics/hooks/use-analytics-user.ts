"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type {
  ProfileData,
  SubscriptionTier,
} from "../types"

type AnalyticsUserState = {
  userId: string | null
  loadingUser: boolean
  subscriptionTier: SubscriptionTier
  billingStatus: string
  error: string | null
}

export function useAnalyticsUser(): AnalyticsUserState {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free")
  const [billingStatus, setBillingStatus] = useState("free")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadUser() {
      try {
        setLoadingUser(true)
        setError(null)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (!active) return

        if (authError) {
          throw authError
        }

        if (!user) {
          router.replace("/login")
          return
        }

        setUserId(user.id)

        const profileResponse = await fetch("/api/profile", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!profileResponse.ok) {
          throw new Error(
            `Profile request failed with status ${profileResponse.status}`
          )
        }

        const profile =
          (await profileResponse.json()) as ProfileData

        if (!active) return

        setSubscriptionTier(
          profile.subscription_tier || "free"
        )

        setBillingStatus(
          profile.billing_status || "free"
        )
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return
        }

        if (!active) return

        console.error(
          "ANALYTICS USER LOAD ERROR:",
          requestError
        )

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load analytics user."
        )
      } finally {
        if (active) {
          setLoadingUser(false)
        }
      }
    }

    void loadUser()

    return () => {
      active = false
      controller.abort()
    }
  }, [router, supabase])

  return {
    userId,
    loadingUser,
    subscriptionTier,
    billingStatus,
    error,
  }
}

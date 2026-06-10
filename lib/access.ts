import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export type AccessTier = "free" | "bll" | "premium"

export const FREE_RULE_LIMIT_TOTAL = 25

export const FREE_RULE_SUBJECTS = [
  "Contracts",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Evidence",
  "Real Property",
]

const ACTIVE_BILLING_STATUSES = new Set([
  "active",
  "trialing",
  "paid",
])

function normalizeTier(value: unknown): AccessTier {
  const clean = String(value ?? "").trim().toLowerCase()

  if (clean === "premium") return "premium"
  if (clean === "bll") return "bll"
  if (clean === "bll_monthly") return "bll"
  if (clean === "monthly") return "bll"

  return "free"
}

function hasActiveBilling(value: unknown) {
  const clean = String(value ?? "").trim().toLowerCase()
  return ACTIVE_BILLING_STATUSES.has(clean)
}

export function upgradeRequiredResponse(feature = "This feature") {
  return NextResponse.json(
    {
      ok: false,
      error: "UPGRADE_REQUIRED",
      message: `${feature} requires a paid subscription.`,
    },
    { status: 402 }
  )
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status: 403 }
  )
}

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized",
    },
    { status: 401 }
  )
}

export async function getUserEntitlement() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false as const,
      response: unauthorizedResponse(),
    }
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      is_blocked: true,
      subscription_tier: true,
      billing_status: true,
      mbe_access: true,
    },
  })

  if (!profile) {
    return {
      ok: false as const,
      response: unauthorizedResponse(),
    }
  }

  if (profile.is_blocked) {
    return {
      ok: false as const,
      response: forbiddenResponse("Account blocked"),
    }
  }

  const rawTier = normalizeTier(profile.subscription_tier)
  const activeBilling = hasActiveBilling(profile.billing_status)

  const tier: AccessTier =
    rawTier === "premium" && activeBilling
      ? "premium"
      : rawTier === "bll" && activeBilling
        ? "bll"
        : "free"

  return {
    ok: true as const,
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
    tier,
    isFree: tier === "free",
    isBLL: tier === "bll" || tier === "premium",
    isPremium: tier === "premium",
    canUseRuleBank: tier === "bll" || tier === "premium",
    canUseBLLFlashcards: tier === "bll" || tier === "premium",
    canUseMBE: tier === "premium" && profile.mbe_access === true,
    canUseGoldenPack: tier === "premium",
    canUseCustomRules: tier === "premium",
  }
}

export async function requireBLL(feature = "This BLL feature") {
  const access = await getUserEntitlement()
  if (!access.ok) return access

  if (!access.isBLL) {
    return {
      ok: false as const,
      response: upgradeRequiredResponse(feature),
    }
  }

  return access
}

export async function requirePremium(feature = "This premium feature") {
  const access = await getUserEntitlement()
  if (!access.ok) return access

  if (!access.isPremium) {
    return {
      ok: false as const,
      response: upgradeRequiredResponse(feature),
    }
  }

  return access
}

export function isFreeSampleSubject(subjectName: unknown) {
  const clean = String(subjectName ?? "").trim().toLowerCase()

  return FREE_RULE_SUBJECTS.some(
    (subject) => subject.toLowerCase() === clean
  )
}

export function isGoldenRuleType(ruleType: unknown) {
  const clean = String(ruleType ?? "").trim().toLowerCase()

  return [
    "golden",
    "golden_120",
    "most_tested",
    "highly_tested",
  ].includes(clean)
}
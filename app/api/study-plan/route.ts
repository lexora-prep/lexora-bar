import { prisma } from "@/lib/prisma"
import { getApplicableRuleUniverse } from "@/lib/rules/registry"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createUserNotification, logUserActivity } from "@/lib/user-activity"

type RuleSet = "emergency" | "priority" | "golden" | "core" | "full"

type ExamRegime =
  | "UBE_CURRENT"
  | "NEXTGEN"
  | "CALIFORNIA_CURRENT"
  | "FLORIDA_CURRENT"
  | "FLORIDA_NEXTGEN"
  | "STATE_SPECIFIC"
  | "TERRITORY_SPECIAL"
  | "LOCAL_COMPONENT"

type JurisdictionGroup =
  | "UBE / Uniform Current"
  | "California"
  | "Florida"
  | "State-Specific / Non-UBE"
  | "Territories / Special"
  | "Local Component"

type JurisdictionOption = {
  code: string
  name: string
  group: JurisdictionGroup
  nextGenStart?: string
  needsVerification?: boolean
  localComponent?: boolean
}

type ActiveRuleIdentity = {
  id: string
  subject_id: string | null
  topic_id: string | null
  subtopic_id: string | null
  title: string
  prompt_question: string | null
  updated_at: Date | null
  created_at: Date | null
  rule_type: string | null
}

const JURISDICTION_OPTIONS: JurisdictionOption[] = [
  { code: "AL", name: "Alabama", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AK", name: "Alaska", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AZ", name: "Arizona", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "AR", name: "Arkansas", group: "UBE / Uniform Current" },
  { code: "CO", name: "Colorado", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "CT", name: "Connecticut", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "DC", name: "District of Columbia", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "GU", name: "Guam", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "ID", name: "Idaho", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "IL", name: "Illinois", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "IN", name: "Indiana", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "IA", name: "Iowa", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "KS", name: "Kansas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "KY", name: "Kentucky", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "ME", name: "Maine", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MD", name: "Maryland", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MA", name: "Massachusetts", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MI", name: "Michigan", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MN", name: "Minnesota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MO", name: "Missouri", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MT", name: "Montana", group: "UBE / Uniform Current" },
  { code: "NE", name: "Nebraska", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NH", name: "New Hampshire", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NJ", name: "New Jersey", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NM", name: "New Mexico", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NY", name: "New York", group: "UBE / Uniform Current", nextGenStart: "2028-07-01", localComponent: true },
  { code: "NC", name: "North Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "ND", name: "North Dakota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MP", name: "Northern Mariana Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "OH", name: "Ohio", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "OK", name: "Oklahoma", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "OR", name: "Oregon", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "PW", name: "Palau", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "PA", name: "Pennsylvania", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "RI", name: "Rhode Island", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "SC", name: "South Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "TN", name: "Tennessee", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "TX", name: "Texas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VI", name: "U.S. Virgin Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "UT", name: "Utah", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VT", name: "Vermont", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WA", name: "Washington", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "WV", name: "West Virginia", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WI", name: "Wisconsin", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "WY", name: "Wyoming", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "CA", name: "California", group: "California", needsVerification: true },
  { code: "FL", name: "Florida", group: "Florida", nextGenStart: "2028-07-01" },
  { code: "DE", name: "Delaware", group: "State-Specific / Non-UBE", nextGenStart: "2028-02-01" },
  { code: "GA", name: "Georgia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "HI", name: "Hawaii", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "LA", name: "Louisiana", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "MS", name: "Mississippi", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "NV", name: "Nevada", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "SD", name: "South Dakota", group: "State-Specific / Non-UBE", nextGenStart: "2027-07-01" },
  { code: "VA", name: "Virginia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "PR", name: "Puerto Rico", group: "Territories / Special", needsVerification: true },
]

async function getAuthorizedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, error: null }
}

function parseDateOnly(value: unknown) {
  const clean = String(value ?? "").slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null

  const [year, month, day] = clean.split("-").map(Number)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function startOfCalendarDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  )
}

function toDateKey(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addCalendarDays(date: Date, amount: number) {
  const next = startOfCalendarDay(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return startOfCalendarDay(next)
}

function isWeekend(date: Date) {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function cleanDateArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((date) => String(date).slice(0, 10))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    )
  ).sort()
}

function normalizeRuleSet(value: unknown): RuleSet {
  const clean = String(value ?? "").trim().toLowerCase()

  if (clean === "emergency") return "emergency"
  if (clean === "priority") return "priority"
  if (clean === "golden") return "golden"
  if (clean === "full") return "full"

  return "core"
}

function normalizeRulePackages(value: unknown, fallback: RuleSet): string[] {
  if (!Array.isArray(value)) return [fallback]

  const packages = Array.from(
    new Set(value.map((item) => normalizeRuleSet(item)))
  )

  return packages.length > 0 ? packages : [fallback]
}

function getDaysUntilExam(examDate: Date) {
  const today = startOfCalendarDay(new Date())
  const exam = startOfCalendarDay(examDate)
  const diff = exam.getTime() - today.getTime()

  return Math.max(0, Math.ceil(diff / 86400000))
}

function getRecommendedRuleSet(daysUntilExam: number, isPremium: boolean): RuleSet {
  if (daysUntilExam <= 14) return "emergency"
  if (daysUntilExam <= 45) return "priority"
  if (daysUntilExam <= 90) return "core"
  return isPremium ? "full" : "core"
}

function normalizeJurisdictionCode(value: unknown) {
  const clean = String(value ?? "").trim()

  if (!clean) return "UBE"
  if (clean.toUpperCase() === "UBE") return "UBE"

  const direct = JURISDICTION_OPTIONS.find(
    (item) => item.code.toLowerCase() === clean.toLowerCase()
  )

  if (direct) return direct.code

  const byName = JURISDICTION_OPTIONS.find(
    (item) => item.name.toLowerCase() === clean.toLowerCase()
  )

  return byName?.code ?? "UBE"
}

function getJurisdictionOption(code: string): JurisdictionOption {
  const normalized = normalizeJurisdictionCode(code)

  if (normalized === "UBE") {
    return {
      code: "UBE",
      name: "UBE / Uniform Current",
      group: "UBE / Uniform Current",
    }
  }

  return (
    JURISDICTION_OPTIONS.find((item) => item.code === normalized) ?? {
      code: "UBE",
      name: "UBE / Uniform Current",
      group: "UBE / Uniform Current",
    }
  )
}

function getEffectiveExamRegime(code: string, examDate: Date): ExamRegime {
  const normalized = normalizeJurisdictionCode(code)
  const option = getJurisdictionOption(normalized)

  if (normalized === "UBE") return "UBE_CURRENT"
  if (option.code === "CA") return "CALIFORNIA_CURRENT"

  const nextGenDate = option.nextGenStart ? parseDateOnly(option.nextGenStart) : null

  const hasNextGenStarted =
    !!nextGenDate && startOfCalendarDay(examDate) >= startOfCalendarDay(nextGenDate)

  if (option.code === "FL") {
    return hasNextGenStarted ? "FLORIDA_NEXTGEN" : "FLORIDA_CURRENT"
  }

  if (hasNextGenStarted) return "NEXTGEN"
  if (option.group === "State-Specific / Non-UBE") return "STATE_SPECIFIC"
  if (option.group === "Territories / Special") return "TERRITORY_SPECIAL"
  if (option.group === "Local Component") return "LOCAL_COMPONENT"

  return "UBE_CURRENT"
}

function calculateTotalStudyDays({
  startDate,
  examDate,
  studyWeekends,
  offDates,
  onDates,
}: {
  startDate: Date
  examDate: Date
  studyWeekends: boolean
  offDates: string[]
  onDates: string[]
}) {
  let totalDays = 0
  const offDateSet = new Set(offDates.map((date) => String(date).slice(0, 10)))
  const onDateSet = new Set(onDates.map((date) => String(date).slice(0, 10)))

  let current = startOfCalendarDay(startDate)
  const end = startOfCalendarDay(examDate)

  while (current <= end) {
    const key = toDateKey(current)
    const weekend = isWeekend(current)
    const manuallyOn = onDateSet.has(key)
    const manuallyOff = offDateSet.has(key)
    const weekendOff = !studyWeekends && weekend && !manuallyOn

    if (manuallyOn || (!manuallyOff && !weekendOff)) {
      totalDays += 1
    }

    current = addCalendarDays(current, 1)
  }

  return totalDays
}

function makeCanonicalRuleKey(rule: {
  subject_id?: string | null
  topic_id?: string | null
  subtopic_id?: string | null
  title?: string | null
}) {
  return [
    String(rule.subject_id ?? "").trim().toLowerCase(),
    String(rule.topic_id ?? "").trim().toLowerCase(),
    String(rule.subtopic_id ?? "").trim().toLowerCase(),
    String(rule.title ?? "").trim().toLowerCase(),
  ].join("::")
}

function isBetterCanonicalRule(
  candidate: {
    prompt_question?: string | null
    updated_at?: Date | null
    created_at?: Date | null
  },
  current?: {
    prompt_question?: string | null
    updated_at?: Date | null
    created_at?: Date | null
  } | null
) {
  if (!current) return true

  const candidateHasPrompt = !!String(candidate.prompt_question ?? "").trim()
  const currentHasPrompt = !!String(current.prompt_question ?? "").trim()

  if (candidateHasPrompt && !currentHasPrompt) return true
  if (!candidateHasPrompt && currentHasPrompt) return false

  const candidateUpdated = candidate.updated_at?.getTime() ?? 0
  const currentUpdated = current.updated_at?.getTime() ?? 0

  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated

  const candidateCreated = candidate.created_at?.getTime() ?? 0
  const currentCreated = current.created_at?.getTime() ?? 0

  return candidateCreated > currentCreated
}

function shouldIncludeRuleForSet(rule: ActiveRuleIdentity, ruleSet: RuleSet) {
  const type = String(rule.rule_type ?? "").trim().toLowerCase()

  if (ruleSet === "core") return rule.rule_type === null || type === "core"
  if (ruleSet === "full") return true

  if (ruleSet === "golden") {
    return [
      "golden",
      "golden_120",
      "most_tested",
      "high_yield",
      "priority",
    ].includes(type)
  }

  if (ruleSet === "priority") {
    return [
      "priority",
      "golden",
      "golden_120",
      "most_tested",
      "high_yield",
      "emergency",
    ].includes(type)
  }

  if (ruleSet === "emergency") {
    return [
      "emergency",
      "priority",
      "golden",
      "golden_120",
      "most_tested",
      "high_yield",
    ].includes(type)
  }

  return rule.rule_type === null
}

function buildCanonicalRuleCount(
  activeRules: ActiveRuleIdentity[],
  ruleSet: RuleSet
) {
  const canonicalRules = new Map<string, ActiveRuleIdentity>()

  for (const rule of activeRules) {
    if (!shouldIncludeRuleForSet(rule, ruleSet)) continue
    if (!rule.subject_id || !String(rule.title ?? "").trim()) continue

    const key = makeCanonicalRuleKey(rule)
    const existing = canonicalRules.get(key)

    if (isBetterCanonicalRule(rule, existing)) {
      canonicalRules.set(key, rule)
    }
  }

  return canonicalRules.size
}

async function getCanonicalActiveRuleCount(ruleSet: RuleSet) {
  const activeRules = await prisma.rules.findMany({
    where: {
      is_active: true,
    },
    select: {
      id: true,
      subject_id: true,
      topic_id: true,
      subtopic_id: true,
      title: true,
      prompt_question: true,
      updated_at: true,
      created_at: true,
      rule_type: true,
    },
  })

  const packageCount = buildCanonicalRuleCount(activeRules, ruleSet)

  if (packageCount > 0) return packageCount

  return buildCanonicalRuleCount(activeRules, "core")
}

async function getApplicableRuleCountForPlan(params: {
  jurisdictionCode: string
  examRegimeCode: ExamRegime
  examDate: Date
  ruleSet: RuleSet
}) {
  if (params.ruleSet !== "core") {
    return getCanonicalActiveRuleCount(params.ruleSet)
  }

  const universe = await getApplicableRuleUniverse({
    jurisdictionCode: params.jurisdictionCode,
    examRegimeCode: params.examRegimeCode,
    examDate: params.examDate,
  })

  return universe.totals.rules
}

async function getProfile(userId: string) {
  return prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      jurisdiction: true,
      mbe_access: true,
      subscription_tier: true,
      billing_status: true,
    },
  })
}

function isPremiumProfile(profile: Awaited<ReturnType<typeof getProfile>>) {
  const tier = String(profile?.subscription_tier ?? "").toLowerCase()
  return tier === "premium" || profile?.mbe_access === true
}

function sanitizeRuleSetForEntitlement(ruleSet: RuleSet, isPremium: boolean) {
  if (ruleSet === "full" && !isPremium) return "core"
  return ruleSet
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const body = await req.json()

    const userId = String(body.userId ?? "").trim()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const startDate = parseDateOnly(body.startDate)
    const examDate = parseDateOnly(body.examDate)
    const studyWeekends = Boolean(body.studyWeekends ?? true)
    const offDates = cleanDateArray(body.offDates)
    const onDates = cleanDateArray(body.onDates)

    if (!startDate || !examDate) {
      return NextResponse.json(
        { error: "Missing or invalid dates" },
        { status: 400 }
      )
    }

    if (startDate > examDate) {
      return NextResponse.json(
        { error: "Start date cannot be after exam date" },
        { status: 400 }
      )
    }

    const existingPlan = await prisma.studyPlan.findUnique({
      where: { userId },
    })

    const profile = await getProfile(userId)
    const isPremium = isPremiumProfile(profile)
    const daysUntilExam = getDaysUntilExam(examDate)
    const recommendedRuleSet = getRecommendedRuleSet(daysUntilExam, isPremium)

    const userManuallySelectedRulePackage =
      body.userManuallySelectedRulePackage === true ||
      (body.userManuallySelectedRulePackage !== false &&
        existingPlan?.userManuallySelectedRulePackage === true)

    const requestedRuleSet = sanitizeRuleSetForEntitlement(
      normalizeRuleSet(body.ruleSet ?? existingPlan?.ruleSet ?? recommendedRuleSet),
      isPremium
    )

    const ruleSet = userManuallySelectedRulePackage
      ? requestedRuleSet
      : recommendedRuleSet

    const jurisdictionCode = normalizeJurisdictionCode(
      body.jurisdictionCode ??
        body.jurisdiction ??
        existingPlan?.jurisdictionCode ??
        profile?.jurisdiction ??
        "UBE"
    )

    const jurisdiction = getJurisdictionOption(jurisdictionCode)
    const examRegime = getEffectiveExamRegime(jurisdictionCode, examDate)

    const rulePackages = normalizeRulePackages(
      body.rulePackages ?? existingPlan?.rulePackages,
      ruleSet
    ).map((item) => sanitizeRuleSetForEntitlement(normalizeRuleSet(item), isPremium))

    const customRulesEnabled = Boolean(
      body.customRulesEnabled ?? existingPlan?.customRulesEnabled ?? false
    )

    const studyRound = Math.max(
      1,
      Number(body.studyRound ?? existingPlan?.studyRound ?? 1) || 1
    )

    const totalDays = calculateTotalStudyDays({
      startDate,
      examDate,
      studyWeekends,
      offDates,
      onDates,
    })

    if (totalDays <= 0) {
      return NextResponse.json(
        { error: "No active study days left. Remove some days off." },
        { status: 400 }
      )
    }

    const totalRules = await getApplicableRuleCountForPlan({
      jurisdictionCode: jurisdiction.code,
      examRegimeCode: examRegime,
      examDate,
      ruleSet,
    })
    const safeTotalRules = totalRules > 0 ? totalRules : 1
    const dailyRules = Math.max(1, Math.ceil(safeTotalRules / totalDays))
    const dailyMBE = 0

    const plan = await prisma.studyPlan.upsert({
      where: { userId },
      update: {
        startDate,
        examDate,
        studyWeekends,
        totalDays,
        dailyRules,
        dailyMBE,
        offDates,
        onDates,
        jurisdictionCode: jurisdiction.code,
        jurisdictionName: jurisdiction.name,
        examRegime,
        ruleSet,
        rulePackages,
        customRulesEnabled,
        studyRound,
        userManuallySelectedRulePackage,
        updatedAt: new Date(),
      },
      create: {
        userId,
        startDate,
        examDate,
        studyWeekends,
        totalDays,
        dailyRules,
        dailyMBE,
        offDates,
        onDates,
        jurisdictionCode: jurisdiction.code,
        jurisdictionName: jurisdiction.name,
        examRegime,
        ruleSet,
        rulePackages,
        customRulesEnabled,
        studyRound,
        userManuallySelectedRulePackage,
      },
    })

    const planAction = existingPlan ? "study_plan.updated" : "study_plan.created"
    const planTitle = existingPlan ? "Study plan updated" : "Study plan created"
    const suppressNotification = body.suppressNotification === true

    const activityPromise = logUserActivity({
      userId,
      actorUserId: user.id,
      action: planAction,
      entityType: "study_plan",
      entityId: plan.id,
      title: planTitle,
      body: `Study plan saved for ${jurisdiction.name}.`,
      metadata: {
        studyPlanId: plan.id,
        jurisdictionCode: jurisdiction.code,
        jurisdictionName: jurisdiction.name,
        examRegime,
        ruleSet,
        totalDays,
        dailyRules,
        dailyMBE,
        offDates,
        onDates,
        suppressNotification,
      },
    })

    if (suppressNotification) {
      await activityPromise
    } else {
      await Promise.all([
        createUserNotification({
          userId,
          type: "study_plan",
          title: planTitle,
          body: `Your study plan for ${jurisdiction.name} was saved successfully.`,
          link: "/study-plan",
          severity: "normal",
          metadata: {
            studyPlanId: plan.id,
            jurisdictionCode: jurisdiction.code,
            jurisdictionName: jurisdiction.name,
            examRegime,
            ruleSet,
            totalDays,
            dailyRules,
            dailyMBE,
          },
        }),
        activityPromise,
      ])
    }

    return NextResponse.json({
      ...plan,
      startDate: toDateKey(plan.startDate),
      examDate: toDateKey(plan.examDate),
      ruleSet,
      recommendedRuleSet,
      totalRules: safeTotalRules,
    })
  } catch (err) {
    console.error("Study plan error:", err)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const plan = await prisma.studyPlan.findUnique({
      where: { userId },
    })

    if (!plan) {
      return NextResponse.json(null)
    }

    const ruleSet = normalizeRuleSet(plan.ruleSet)
    const totalRules = await getCanonicalActiveRuleCount(ruleSet)
    const safeTotalRules = totalRules > 0 ? totalRules : 1

    return NextResponse.json({
      ...plan,
      startDate: toDateKey(plan.startDate),
      examDate: toDateKey(plan.examDate),
      ruleSet,
      totalRules: safeTotalRules,
    })
  } catch (err) {
    console.error("GET STUDY PLAN ERROR:", err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existingPlan = await prisma.studyPlan.findUnique({
      where: { userId },
      select: {
        id: true,
        jurisdictionCode: true,
        jurisdictionName: true,
        examRegime: true,
        ruleSet: true,
      },
    })

    const deleteResult = await prisma.studyPlan.deleteMany({
      where: { userId },
    })

    if (deleteResult.count > 0) {
      await Promise.all([
        createUserNotification({
          userId,
          type: "study_plan",
          title: "Study plan deleted",
          body: "Your study plan was deleted.",
          link: "/study-plan",
          severity: "normal",
          metadata: {
            studyPlanId: existingPlan?.id ?? null,
            jurisdictionCode: existingPlan?.jurisdictionCode ?? null,
            jurisdictionName: existingPlan?.jurisdictionName ?? null,
            examRegime: existingPlan?.examRegime ?? null,
            ruleSet: existingPlan?.ruleSet ?? null,
          },
        }),
        logUserActivity({
          userId,
          actorUserId: user.id,
          action: "study_plan.deleted",
          entityType: "study_plan",
          entityId: existingPlan?.id ?? null,
          title: "Study plan deleted",
          body: "Study plan deleted by user.",
          metadata: {
            studyPlanId: existingPlan?.id ?? null,
            jurisdictionCode: existingPlan?.jurisdictionCode ?? null,
            jurisdictionName: existingPlan?.jurisdictionName ?? null,
            examRegime: existingPlan?.examRegime ?? null,
            ruleSet: existingPlan?.ruleSet ?? null,
          },
        }),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE STUDY PLAN ERROR:", err)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
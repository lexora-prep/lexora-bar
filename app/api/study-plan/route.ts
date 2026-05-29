import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

type RuleSet = "core"

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

function normalizeDateOnly(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
}

function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function cleanOffDates(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((date) => String(date).slice(0, 10))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    )
  )
}

function normalizeRuleSet(_value: unknown): RuleSet {
  return "core"
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

  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(examDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const currentDateString = toDateKey(current)
    const weekend = isWeekend(current)
    const manuallyOn = onDateSet.has(currentDateString)
    const manuallyOff = offDateSet.has(currentDateString)
    const weekendOff = !studyWeekends && weekend && !manuallyOn

    if (manuallyOn || (!manuallyOff && !weekendOff)) {
      totalDays++
    }

    current.setDate(current.getDate() + 1)
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

  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated
  }

  const candidateCreated = candidate.created_at?.getTime() ?? 0
  const currentCreated = current.created_at?.getTime() ?? 0

  return candidateCreated > currentCreated
}

function shouldIncludeRuleForSet(rule: ActiveRuleIdentity, _ruleSet: RuleSet) {
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

  return buildCanonicalRuleCount(activeRules, ruleSet)
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedUser()
    if (auth.error || !auth.user) return auth.error

    const { user } = auth
    const body = await req.json()

    const userId = body.userId
    const startDate = normalizeDateOnly(body.startDate)
    const examDate = normalizeDateOnly(body.examDate)
    const studyWeekends = Boolean(body.studyWeekends ?? true)
    const offDates = cleanOffDates(body.offDates)
    const onDates = cleanOffDates(body.onDates)
    const ruleSet = normalizeRuleSet(body.ruleSet)

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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

    const totalRules = await getCanonicalActiveRuleCount(ruleSet)
    const safeTotalRules = totalRules > 0 ? totalRules : 1
    const dailyRules = Math.max(1, Math.ceil(safeTotalRules / totalDays))
    const dailyMBE = 50

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
        ruleSet,
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
        ruleSet,
      },
    })

    return NextResponse.json({
      ...plan,
      ruleSet,
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

    const plan = await prisma.studyPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    if (!plan) {
      return NextResponse.json(null)
    }

    const ruleSet = normalizeRuleSet(plan.ruleSet)
    const totalRules = await getCanonicalActiveRuleCount(ruleSet)
    const safeTotalRules = totalRules > 0 ? totalRules : 1

    return NextResponse.json({
      ...plan,
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

    await prisma.studyPlan.deleteMany({
      where: { userId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE STUDY PLAN ERROR:", err)
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
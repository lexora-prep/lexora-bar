import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function makeRuleKey(rule: {
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

function isBetterRule(
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

async function getCanonicalRuleByIdentity(input: {
  subject_id?: string | null
  topic_id?: string | null
  subtopic_id?: string | null
  title?: string | null
}) {
  if (!input.subject_id || !input.title) return null

  const candidates = await prisma.rules.findMany({
    where: {
      is_active: true,
      subject_id: input.subject_id,
      topic_id: input.topic_id ?? null,
      subtopic_id: input.subtopic_id ?? null,
      title: input.title,
      NOT: {
        prompt_question: null,
      },
    },
    include: {
      topics: true,
      subtopics: true,
      subjects: true,
    },
    orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
  })

  const usable = candidates.filter((rule) => !!String(rule.prompt_question ?? "").trim())
  if (usable.length === 0) return null

  let best = usable[0]
  for (const candidate of usable) {
    if (isBetterRule(candidate, best)) {
      best = candidate
    }
  }

  return best
}

async function getCanonicalRandomRule() {
  const rawRules = await prisma.rules.findMany({
    where: {
      is_active: true,
      NOT: {
        prompt_question: null,
      },
    },
    include: {
      topics: true,
      subtopics: true,
      subjects: true,
    },
    orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
  })

  const canonicalMap = new Map<string, (typeof rawRules)[number]>()

  for (const rule of rawRules) {
    if (!String(rule.prompt_question ?? "").trim()) continue

    const key = makeRuleKey(rule)
    const existing = canonicalMap.get(key)

    if (isBetterRule(rule, existing)) {
      canonicalMap.set(key, rule)
    }
  }

  const canonicalRules = Array.from(canonicalMap.values())
  if (canonicalRules.length === 0) return null

  const randomIndex = Math.floor(Math.random() * canonicalRules.length)
  return canonicalRules[randomIndex]
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const mode = searchParams.get("mode") || "random"
    const userId = searchParams.get("userId")

    let rule: any = null

    if (mode === "weak" && userId) {
      const weakProgress = await prisma.user_rule_progress.findFirst({
        where: {
          user_id: userId,
          attempts: { gt: 3 },
          correct_count: { lt: 2 },
        },
        orderBy: [{ updated_at: "desc" }],
        include: {
          rules: {
            include: {
              topics: true,
              subtopics: true,
              subjects: true,
            },
          },
        },
      })

      if (weakProgress?.rules) {
        rule =
          (await getCanonicalRuleByIdentity({
            subject_id: weakProgress.rules.subject_id,
            topic_id: weakProgress.rules.topic_id,
            subtopic_id: weakProgress.rules.subtopic_id,
            title: weakProgress.rules.title,
          })) ?? null
      }
    } else if (mode === "review" && userId) {
      const reviewProgress = await prisma.user_rule_progress.findFirst({
        where: {
          user_id: userId,
          next_review_at: {
            lte: new Date(),
          },
        },
        orderBy: [{ next_review_at: "asc" }],
        include: {
          rules: {
            include: {
              topics: true,
              subtopics: true,
              subjects: true,
            },
          },
        },
      })

      if (reviewProgress?.rules) {
        rule =
          (await getCanonicalRuleByIdentity({
            subject_id: reviewProgress.rules.subject_id,
            topic_id: reviewProgress.rules.topic_id,
            subtopic_id: reviewProgress.rules.subtopic_id,
            title: reviewProgress.rules.title,
          })) ?? null
      }
    } else {
      rule = await getCanonicalRandomRule()
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error("RULES NEXT ERROR:", error)
    return NextResponse.json({ error: "Failed to load next rule" }, { status: 500 })
  }
}
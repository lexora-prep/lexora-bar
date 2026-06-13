import { NextResponse } from "next/server"
import { enforceRateLimit } from "@/lib/rate-limit"
import {
  getApplicableRuleUniverse,
  getApplicableRuleUniverseForUser,
  type ApplicableRegistryRule,
} from "@/lib/rules/registry"
import { prisma } from "@/lib/prisma"

function toRuleResponse(rule: ApplicableRegistryRule) {
  return {
    id: rule.id,
    external_key: rule.externalKey,
    title: rule.title,
    rule_text: rule.ruleText,
    prompt_question: rule.promptQuestion,
    subject_id: rule.subjectId,
    topic_id: rule.topicId,
    subtopic_id: rule.subtopicId,
    source_type: rule.sourceType,
    publication_status: rule.publicationStatus,
    source_package: rule.sourcePackage,
    priority_weight: rule.priorityWeight,
    jurisdiction_code: rule.jurisdictionCode,
    exam_regime_code: rule.examRegimeCode,
    subjects: {
      id: rule.subjectId,
      name: rule.subjectName,
    },
    topics: rule.topicId
      ? {
          id: rule.topicId,
          name: rule.topicName,
        }
      : null,
    subtopics: rule.subtopicId
      ? {
          id: rule.subtopicId,
          name: rule.subtopicName,
        }
      : null,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const mode = searchParams.get("mode") || "random"
    const userId = searchParams.get("userId")

    const rateLimitResponse = await enforceRateLimit(req, {
      key: "rules-next",
      limit: 120,
      window: "1 m",
      identifier: userId ? `user:${userId}` : null,
    })

    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const ruleUniverse = userId
      ? await getApplicableRuleUniverseForUser(userId)
      : await getApplicableRuleUniverse({ jurisdictionCode: "UBE" })

    const applicableRules = ruleUniverse.rules.filter((rule) =>
      String(rule.promptQuestion ?? "").trim()
    )

    if (applicableRules.length === 0) {
      return NextResponse.json(
        {
          error: "No published rules are available for this jurisdiction and exam date.",
          ruleUniverse: {
            jurisdiction: ruleUniverse.jurisdiction,
            examRegime: ruleUniverse.examRegime,
            effectiveDate: ruleUniverse.effectiveDate,
            totalRules: ruleUniverse.totals.rules,
            source: ruleUniverse.source,
          },
        },
        { status: 404 }
      )
    }

    const applicableRuleIds = new Set(applicableRules.map((rule) => rule.id))
    const ruleById = new Map(applicableRules.map((rule) => [rule.id, rule]))

    let selectedRule: ApplicableRegistryRule | null = null

    if (mode === "weak" && userId) {
      const weakProgress = await prisma.user_rule_progress.findFirst({
        where: {
          user_id: userId,
          rule_id: {
            in: Array.from(applicableRuleIds),
          },
          attempts: { gt: 3 },
          correct_count: { lt: 2 },
        },
        orderBy: [{ updated_at: "desc" }],
        select: {
          rule_id: true,
        },
      })

      selectedRule = weakProgress?.rule_id
        ? ruleById.get(weakProgress.rule_id) ?? null
        : null
    }

    if (!selectedRule && mode === "review" && userId) {
      const reviewProgress = await prisma.user_rule_progress.findFirst({
        where: {
          user_id: userId,
          rule_id: {
            in: Array.from(applicableRuleIds),
          },
          next_review_at: {
            lte: new Date(),
          },
        },
        orderBy: [{ next_review_at: "asc" }],
        select: {
          rule_id: true,
        },
      })

      selectedRule = reviewProgress?.rule_id
        ? ruleById.get(reviewProgress.rule_id) ?? null
        : null
    }

    if (!selectedRule) {
      const randomIndex = Math.floor(Math.random() * applicableRules.length)
      selectedRule = applicableRules[randomIndex]
    }

    return NextResponse.json(toRuleResponse(selectedRule))
  } catch (error) {
    console.error("RULES NEXT ERROR:", error)
    return NextResponse.json(
      { error: "Failed to load next rule" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import {
  getApplicableRuleUniverse,
  getApplicableRuleUniverseForUser,
} from "@/lib/rules/registry"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get("userId")
    const jurisdiction = searchParams.get("jurisdiction")
    const examRegime = searchParams.get("examRegime")
    const examDate = searchParams.get("examDate")

    const ruleUniverse = userId
      ? await getApplicableRuleUniverseForUser(userId)
      : await getApplicableRuleUniverse({
          jurisdictionCode: jurisdiction ?? "UBE",
          examRegimeCode: examRegime,
          examDate,
        })

    const rules = ruleUniverse.rules
      .filter((rule) => String(rule.ruleText ?? "").trim())
      .sort((a, b) => {
        if (b.priorityWeight !== a.priorityWeight) {
          return b.priorityWeight - a.priorityWeight
        }

        return a.title.localeCompare(b.title)
      })
      .slice(0, 120)
      .map((rule) => ({
        id: rule.id,
        title: rule.title,
        rule_text: rule.ruleText,
        subject_id: rule.subjectId,
        topic_id: rule.topicId,
        subtopic_id: rule.subtopicId,
        source_package: rule.sourcePackage,
        priority_weight: rule.priorityWeight,
        jurisdiction_code: rule.jurisdictionCode,
        exam_regime_code: rule.examRegimeCode,
        subjects: {
          name: rule.subjectName,
        },
      }))

    return NextResponse.json(rules)
  } catch (err) {
    console.error("Most tested rules error:", err)

    return NextResponse.json([])
  }
}

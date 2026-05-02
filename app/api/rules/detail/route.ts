import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRuleDetailById } from "@/lib/rules/get-rule-detail"

type TrapItem = {
  title: string
  explanation: string
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return [trimmed]
    }

    return [trimmed]
  }

  return []
}

function normalizeTrapArray(value: unknown): TrapItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const explanation = item.trim()
          if (!explanation) return null

          return {
            title: `Trap ${index + 1}`,
            explanation,
          }
        }

        if (item && typeof item === "object") {
          const record = item as {
            title?: unknown
            heading?: unknown
            label?: unknown
            explanation?: unknown
            text?: unknown
            body?: unknown
          }

          const title = String(
            record.title ?? record.heading ?? record.label ?? `Trap ${index + 1}`
          ).trim()

          const explanation = String(
            record.explanation ?? record.text ?? record.body ?? ""
          ).trim()

          if (!explanation) return null

          return {
            title: title || `Trap ${index + 1}`,
            explanation,
          }
        }

        return null
      })
      .filter((item): item is TrapItem => Boolean(item))
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      return normalizeTrapArray(parsed)
    } catch {
      return [
        {
          title: "Common Trap",
          explanation: trimmed,
        },
      ]
    }
  }

  return []
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ruleId = searchParams.get("ruleId")?.trim()

    if (!ruleId) {
      return NextResponse.json({ error: "Missing ruleId" }, { status: 400 })
    }

    const dbRule = await prisma.rules.findUnique({
      where: {
        id: ruleId,
      },
      select: {
        id: true,
        title: true,
        rule_text: true,
        prompt_question: true,
        application_example: true,
        how_to_apply: true,
        common_traps: true,
        common_trap: true,
        exam_tip: true,
        topics: {
          select: {
            name: true,
          },
        },
        subtopics: {
          select: {
            name: true,
          },
        },
        subjects: {
          select: {
            name: true,
          },
        },
      },
    })

    if (dbRule) {
      const commonTraps = normalizeTrapArray(dbRule.common_traps)

      return NextResponse.json({
        rule: {
          id: dbRule.id,
          title: dbRule.title,
          subject: dbRule.subjects?.name || "Unknown Subject",
          topic: dbRule.topics?.name || "",
          subtopic: dbRule.subtopics?.name || "",
          ruleText: dbRule.rule_text || "",
          promptQuestion: dbRule.prompt_question || "",
          howToApply: normalizeStringArray(dbRule.how_to_apply),
          commonTraps:
            commonTraps.length > 0
              ? commonTraps
              : normalizeTrapArray(dbRule.common_trap),
          applicationExample: dbRule.application_example || "",
          examTip: dbRule.exam_tip || "",
        },
      })
    }

    const fileRule = await getRuleDetailById(ruleId)

    if (!fileRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    return NextResponse.json({
      rule: fileRule,
    })
  } catch (error) {
    console.error("RULE DETAIL ERROR:", error)

    return NextResponse.json(
      { error: "Failed to load rule detail" },
      { status: 500 }
    )
  }
}

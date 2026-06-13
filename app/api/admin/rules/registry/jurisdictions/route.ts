import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"

type RegistryJurisdictionsCacheEntry = {
  expiresAt: number
  payload: unknown
}

const REGISTRY_JURISDICTIONS_CACHE_MS = 60_000
let registryJurisdictionsCache: RegistryJurisdictionsCacheEntry | null = null

const SUBJECT_ALIASES: Record<string, string> = {
  Trusts: "Trusts and Estates",
  Wills: "Trusts and Estates",
  "Trusts and Estates": "Trusts and Estates",
}

function canonicalSubjectName(name: string) {
  return SUBJECT_ALIASES[name] ?? name
}

function dateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

function isCurrentPeriod(
  effectiveFrom: Date,
  effectiveUntil: Date | null,
  today: Date
) {
  return (
    effectiveFrom <= today &&
    (!effectiveUntil || effectiveUntil >= today)
  )
}

function isFuturePeriod(effectiveFrom: Date, today: Date) {
  return effectiveFrom > today
}

function categoriesFor(
  jurisdictionType: string,
  regimeCodes: string[]
) {
  const categories = new Set<
    "all" | "nextgen" | "ube" | "state" | "territory"
  >(["all"])

  if (jurisdictionType.toUpperCase() === "TERRITORY") {
    categories.add("territory")
  }

  for (const rawCode of regimeCodes) {
    const code = rawCode.toUpperCase()

    if (code.includes("NEXTGEN")) {
      categories.add("nextgen")
    }

    if (code.includes("UBE")) {
      categories.add("ube")
    }

    if (
      code.includes("CALIFORNIA") ||
      code.includes("FLORIDA") ||
      code.includes("STATE_SPECIFIC") ||
      code.includes("LOCAL_COMPONENT")
    ) {
      categories.add("state")
    }

    if (code.includes("TERRITORY")) {
      categories.add("territory")
    }
  }

  return Array.from(categories)
}

export async function GET() {
  const auth = await requireRuleAdmin()

  if (auth.response || !auth.admin) {
    return auth.response
  }

  if (
    registryJurisdictionsCache &&
    registryJurisdictionsCache.expiresAt > Date.now()
  ) {
    return NextResponse.json(registryJurisdictionsCache.payload)
  }

  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [jurisdictions, applicability] =
      await Promise.all([
        prisma.jurisdictions.findMany({
          where: {
            is_active: true,
          },
          orderBy: [
            {
              jurisdiction_type: "asc",
            },
            {
              name: "asc",
            },
          ],
          select: {
            id: true,
            code: true,
            name: true,
            jurisdiction_type: true,
            exam_regime_mappings: {
              where: {
                is_active: true,
                exam_regime: {
                  is_active: true,
                },
              },
              orderBy: [
                {
                  effective_from: "asc",
                },
                {
                  priority: "desc",
                },
              ],
              select: {
                id: true,
                mapping_key: true,
                effective_from: true,
                effective_until: true,
                priority: true,
                exam_regime: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        }),

        prisma.rule_applicability.findMany({
          where: {
            is_active: true,
            is_tested: true,
            rule: {
              is_active: true,
              publication_status: "PUBLISHED",
            },
            exam_regime: {
              is_active: true,
            },
          },
          select: {
            id: true,
            rule_id: true,
            jurisdiction_id: true,
            exam_regime_id: true,
            source_package: true,
            effective_from: true,
            effective_until: true,
            rule: {
              select: {
                id: true,
                subject_id: true,
                subjects: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
      ])

    const payload = jurisdictions.map((jurisdiction) => {
      const schedules = jurisdiction.exam_regime_mappings.map(
        (mapping) => {
          const applicableRows = applicability.filter((row) => {
            if (
              row.exam_regime_id !== mapping.exam_regime.id
            ) {
              return false
            }

            if (
              row.jurisdiction_id &&
              row.jurisdiction_id !== jurisdiction.id
            ) {
              return false
            }

            if (
              row.effective_from &&
              mapping.effective_until &&
              row.effective_from > mapping.effective_until
            ) {
              return false
            }

            if (
              row.effective_until &&
              row.effective_until < mapping.effective_from
            ) {
              return false
            }

            return true
          })

          const uniqueRuleIds = new Set<string>()

          const subjectMap = new Map<
            string,
            {
              name: string
              ruleIds: Set<string>
              globalRuleIds: Set<string>
              jurisdictionRuleIds: Set<string>
              sourcePackages: Set<string>
            }
          >()

          for (const row of applicableRows) {
            uniqueRuleIds.add(row.rule_id)

            const rawSubject =
              row.rule.subjects?.name?.trim() ||
              "Unassigned Subject"

            const subjectName =
              canonicalSubjectName(rawSubject)

            const subject =
              subjectMap.get(subjectName) ?? {
                name: subjectName,
                ruleIds: new Set<string>(),
                globalRuleIds: new Set<string>(),
                jurisdictionRuleIds:
                  new Set<string>(),
                sourcePackages: new Set<string>(),
              }

            subject.ruleIds.add(row.rule_id)

            if (
              row.jurisdiction_id === jurisdiction.id
            ) {
              subject.jurisdictionRuleIds.add(
                row.rule_id
              )
            } else {
              subject.globalRuleIds.add(row.rule_id)
            }

            subject.sourcePackages.add(
              row.source_package || "core"
            )

            subjectMap.set(subjectName, subject)
          }

          const subjects = Array.from(
            subjectMap.values()
          )
            .map((subject) => ({
              name: subject.name,
              ruleCount: subject.ruleIds.size,
              globalRuleCount:
                subject.globalRuleIds.size,
              jurisdictionRuleCount:
                subject.jurisdictionRuleIds.size,
              sourcePackages: Array.from(
                subject.sourcePackages
              ).sort(),
            }))
            .sort((a, b) =>
              a.name.localeCompare(b.name)
            )

          return {
            id: mapping.id,
            mappingKey: mapping.mapping_key,
            priority: mapping.priority,
            effectiveFrom:
              dateOnly(mapping.effective_from) ??
              "1900-01-01",
            effectiveUntil: dateOnly(
              mapping.effective_until
            ),
            isCurrent: isCurrentPeriod(
              mapping.effective_from,
              mapping.effective_until,
              today
            ),
            isFuture: isFuturePeriod(
              mapping.effective_from,
              today
            ),
            regime: {
              id: mapping.exam_regime.id,
              code: mapping.exam_regime.code,
              name: mapping.exam_regime.name,
              description:
                mapping.exam_regime.description,
            },
            applicableRuleCount: uniqueRuleIds.size,
            subjectCount: subjects.length,
            subjects,
          }
        }
      )

      const currentCandidates = schedules
        .filter((schedule) => schedule.isCurrent)
        .sort((a, b) => b.priority - a.priority)

      const futureCandidates = schedules
        .filter((schedule) => schedule.isFuture)
        .sort(
          (a, b) =>
            new Date(a.effectiveFrom).getTime() -
            new Date(b.effectiveFrom).getTime()
        )

      const currentRegime =
        currentCandidates[0] ?? null

      const nextRegime = futureCandidates[0] ?? null

      const activeReference =
        currentRegime ??
        nextRegime ??
        schedules[schedules.length - 1] ??
        null

      return {
        id: jurisdiction.id,
        code: jurisdiction.code,
        name: jurisdiction.name,
        jurisdictionType:
          jurisdiction.jurisdiction_type,
        categories: categoriesFor(
          jurisdiction.jurisdiction_type,
          schedules.map(
            (schedule) => schedule.regime.code
          )
        ),
        currentRegime,
        nextRegime,
        schedules,
        applicableRuleCount:
          activeReference?.applicableRuleCount ?? 0,
        subjectCount:
          activeReference?.subjectCount ?? 0,
      }
    })

    const responsePayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      jurisdictions: payload,
      summary: {
        total: payload.length,
        nextgen: payload.filter((item) =>
          item.categories.includes("nextgen")
        ).length,
        ube: payload.filter((item) =>
          item.categories.includes("ube")
        ).length,
        state: payload.filter((item) =>
          item.categories.includes("state")
        ).length,
        territory: payload.filter((item) =>
          item.categories.includes("territory")
        ).length,
      },
    }

    registryJurisdictionsCache = {
      expiresAt: Date.now() + REGISTRY_JURISDICTIONS_CACHE_MS,
      payload: responsePayload,
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error(
      "LOAD JURISDICTION SCHEDULE ERROR:",
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Jurisdiction schedule could not be loaded.",
      },
      {
        status: 500,
      }
    )
  }
}

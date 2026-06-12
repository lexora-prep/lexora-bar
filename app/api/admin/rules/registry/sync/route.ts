import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"
import { JURISDICTION_OPTIONS } from "@/app/(app)/dashboard/_components/dashboardConstants"

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function dayBefore(value: string) {
  const date = dateOnly(value)
  date.setUTCDate(date.getUTCDate() - 1)
  return date
}

function currentRegimeCode(option: (typeof JURISDICTION_OPTIONS)[number]) {
  if (option.code === "CA") return "CALIFORNIA_CURRENT"
  if (option.code === "FL") return "FLORIDA_CURRENT"
  if (option.group === "State-Specific / Non-UBE") return "STATE_SPECIFIC"
  if (option.group === "Territories / Special") return "TERRITORY_SPECIAL"
  if (option.group === "Local Component") return "LOCAL_COMPONENT"
  return "UBE_CURRENT"
}

function nextRegimeCode(option: (typeof JURISDICTION_OPTIONS)[number]) {
  return option.code === "FL" ? "FLORIDA_NEXTGEN" : "NEXTGEN"
}

export async function POST() {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  const regimes = await prisma.exam_regimes.findMany({
    where: { is_active: true },
    select: { id: true, code: true },
  })
  const regimeByCode = new Map(regimes.map((item) => [item.code, item.id]))

  let jurisdictionsCreated = 0
  let jurisdictionsUpdated = 0
  let mappingsUpserted = 0

  await prisma.$transaction(async (tx) => {
    for (const option of JURISDICTION_OPTIONS) {
      const existing = await tx.jurisdictions.findUnique({ where: { code: option.code } })
      const jurisdiction = await tx.jurisdictions.upsert({
        where: { code: option.code },
        update: {
          name: option.name,
          jurisdiction_type:
            option.group === "Territories / Special" ? "TERRITORY" : option.code === "DC" ? "DISTRICT" : "STATE",
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          code: option.code,
          name: option.name,
          jurisdiction_type:
            option.group === "Territories / Special" ? "TERRITORY" : option.code === "DC" ? "DISTRICT" : "STATE",
          is_active: true,
        },
      })

      if (existing) jurisdictionsUpdated += 1
      else jurisdictionsCreated += 1

      const currentCode = currentRegimeCode(option)
      const currentRegimeId = regimeByCode.get(currentCode)
      if (!currentRegimeId) throw new Error(`Missing exam regime: ${currentCode}`)

      await tx.jurisdiction_exam_regimes.upsert({
        where: { mapping_key: `${option.code}::${currentCode}::1900-01-01` },
        update: {
          jurisdiction_id: jurisdiction.id,
          exam_regime_id: currentRegimeId,
          effective_from: dateOnly("1900-01-01"),
          effective_until: option.nextGenStart ? dayBefore(option.nextGenStart) : null,
          priority: 100,
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          mapping_key: `${option.code}::${currentCode}::1900-01-01`,
          jurisdiction_id: jurisdiction.id,
          exam_regime_id: currentRegimeId,
          effective_from: dateOnly("1900-01-01"),
          effective_until: option.nextGenStart ? dayBefore(option.nextGenStart) : null,
          priority: 100,
          is_active: true,
        },
      })
      mappingsUpserted += 1

      if (option.nextGenStart) {
        const nextCode = nextRegimeCode(option)
        const nextRegimeId = regimeByCode.get(nextCode)
        if (!nextRegimeId) throw new Error(`Missing exam regime: ${nextCode}`)

        await tx.jurisdiction_exam_regimes.upsert({
          where: { mapping_key: `${option.code}::${nextCode}::${option.nextGenStart}` },
          update: {
            jurisdiction_id: jurisdiction.id,
            exam_regime_id: nextRegimeId,
            effective_from: dateOnly(option.nextGenStart),
            effective_until: null,
            priority: 200,
            is_active: true,
            updated_at: new Date(),
          },
          create: {
            mapping_key: `${option.code}::${nextCode}::${option.nextGenStart}`,
            jurisdiction_id: jurisdiction.id,
            exam_regime_id: nextRegimeId,
            effective_from: dateOnly(option.nextGenStart),
            effective_until: null,
            priority: 200,
            is_active: true,
          },
        })
        mappingsUpserted += 1
      }
    }
  })

  return NextResponse.json({
    ok: true,
    jurisdictionsCreated,
    jurisdictionsUpdated,
    mappingsUpserted,
    source: "dashboard jurisdiction configuration",
  })
}

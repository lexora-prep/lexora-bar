import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"
import { JURISDICTION_OPTIONS } from "@/app/(app)/dashboard/_components/dashboardConstants"

export const dynamic = "force-dynamic"

function normalizeTransitionDate(value: string) {
  const clean = String(value ?? "").trim()

  if (!clean) {
    throw new Error("A jurisdiction transition date is missing.")
  }

  if (/^\d{4}-\d{2}$/.test(clean)) {
    return `${clean}-01`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }

  const parsed = new Date(clean)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid jurisdiction transition date: "${clean}". Use YYYY-MM-DD.`
    )
  }

  return parsed.toISOString().slice(0, 10)
}

function dateOnly(value: string) {
  const normalized = normalizeTransitionDate(value)
  const date = new Date(`${normalized}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unable to create a date from "${value}".`)
  }

  return date
}

function dateKey(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null
}

function dayBefore(value: string) {
  const date = dateOnly(value)
  date.setUTCDate(date.getUTCDate() - 1)
  return date
}

function jurisdictionType(option: (typeof JURISDICTION_OPTIONS)[number]) {
  if (option.group === "Territories / Special") return "TERRITORY"
  if (option.code === "DC") return "DISTRICT"
  return "STATE"
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

function logSyncStep(step: string, startedAt: number) {
  console.log(`[registry-sync] ${step}: ${Date.now() - startedAt}ms`)
}

async function withSyncTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  let timeout: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Registry synchronization timed out after ${ms}ms.`))
    }, ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function readableSyncError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Server has closed the connection")) {
      return "The database closed the connection during jurisdiction synchronization. The sync was stopped safely."
    }

    return error.message
  }

  return "Jurisdictions could not be synchronized."
}

async function synchronizeJurisdictionRegistry() {
  const syncStartedAt = Date.now()
  console.log("[registry-sync] started")

  const auth = await requireRuleAdmin()
  logSyncStep("admin authorization checked", syncStartedAt)
  if (auth.response || !auth.admin) return auth.response

  const now = new Date()
  const jurisdictionCodes = JURISDICTION_OPTIONS.map((option) => option.code)
  const requiredRegimeCodes = Array.from(
    new Set(
      JURISDICTION_OPTIONS.flatMap((option) => [
        currentRegimeCode(option),
        ...(option.nextGenStart ? [nextRegimeCode(option)] : []),
      ])
    )
  )

  const regimes = await prisma.exam_regimes.findMany({
    where: {
      code: { in: requiredRegimeCodes },
      is_active: true,
    },
    select: { id: true, code: true },
  })
  logSyncStep("exam regimes loaded", syncStartedAt)

  const regimeByCode = new Map(regimes.map((item) => [item.code, item.id]))
  const missingRegimes = requiredRegimeCodes.filter((code) => !regimeByCode.has(code))

  if (missingRegimes.length > 0) {
    throw new Error(`Missing active exam regime records: ${missingRegimes.join(", ")}`)
  }

  const existingJurisdictions = await prisma.jurisdictions.findMany({
    where: { code: { in: jurisdictionCodes } },
    select: {
      id: true,
      code: true,
      name: true,
      jurisdiction_type: true,
      is_active: true,
    },
  })
  logSyncStep("existing jurisdictions loaded", syncStartedAt)

  const existingJurisdictionByCode = new Map(
    existingJurisdictions.map((item) => [item.code, item])
  )

  const created = await prisma.jurisdictions.createMany({
    data: JURISDICTION_OPTIONS.filter(
      (option) => !existingJurisdictionByCode.has(option.code)
    ).map((option) => ({
      code: option.code,
      name: option.name,
      jurisdiction_type: jurisdictionType(option),
      is_active: true,
    })),
    skipDuplicates: true,
  })
  logSyncStep("jurisdiction createMany completed", syncStartedAt)

  let jurisdictionsUpdated = 0
  const jurisdictionUpdates = JURISDICTION_OPTIONS.filter((option) => {
    const existing = existingJurisdictionByCode.get(option.code)
    if (!existing) return false

    return (
      existing.name !== option.name ||
      existing.jurisdiction_type !== jurisdictionType(option) ||
      existing.is_active !== true
    )
  })

  for (const option of jurisdictionUpdates) {
    const result = await prisma.jurisdictions.updateMany({
      where: { code: option.code },
      data: {
        name: option.name,
        jurisdiction_type: jurisdictionType(option),
        is_active: true,
        updated_at: now,
      },
    })

    jurisdictionsUpdated += result.count
  }
  logSyncStep(
    `jurisdiction updateMany completed, changed records: ${jurisdictionUpdates.length}`,
    syncStartedAt
  )

  const jurisdictions = await prisma.jurisdictions.findMany({
    where: { code: { in: jurisdictionCodes }, is_active: true },
    select: { id: true, code: true },
  })
  logSyncStep("jurisdictions reloaded", syncStartedAt)

  const jurisdictionByCode = new Map(jurisdictions.map((item) => [item.code, item.id]))
  const missingJurisdictions = jurisdictionCodes.filter(
    (code) => !jurisdictionByCode.has(code)
  )

  if (missingJurisdictions.length > 0) {
    throw new Error(
      `Unable to resolve synchronized jurisdiction records: ${missingJurisdictions.join(", ")}`
    )
  }

  const mappingRows = JURISDICTION_OPTIONS.flatMap((option) => {
    const jurisdictionId = jurisdictionByCode.get(option.code)
    if (!jurisdictionId) return []

    const currentCode = currentRegimeCode(option)
    const currentRegimeId = regimeByCode.get(currentCode)
    if (!currentRegimeId) {
      throw new Error(`Missing exam regime: ${currentCode}`)
    }

    const rows = [
      {
        mapping_key: `${option.code}::${currentCode}::1900-01-01`,
        jurisdiction_id: jurisdictionId,
        exam_regime_id: currentRegimeId,
        effective_from: dateOnly("1900-01-01"),
        effective_until: option.nextGenStart ? dayBefore(option.nextGenStart) : null,
        priority: 100,
        is_active: true,
      },
    ]

    if (option.nextGenStart) {
      const nextCode = nextRegimeCode(option)
      const nextRegimeId = regimeByCode.get(nextCode)
      if (!nextRegimeId) {
        throw new Error(`Missing exam regime: ${nextCode}`)
      }

      rows.push({
        mapping_key: `${option.code}::${nextCode}::${normalizeTransitionDate(option.nextGenStart)}`,
        jurisdiction_id: jurisdictionId,
        exam_regime_id: nextRegimeId,
        effective_from: dateOnly(option.nextGenStart),
        effective_until: null,
        priority: 200,
        is_active: true,
      })
    }

    return rows
  })
  logSyncStep(`mapping rows prepared: ${mappingRows.length}`, syncStartedAt)

  const existingMappings = await prisma.jurisdiction_exam_regimes.findMany({
    where: {
      mapping_key: { in: mappingRows.map((row) => row.mapping_key) },
    },
    select: {
      mapping_key: true,
      jurisdiction_id: true,
      exam_regime_id: true,
      effective_from: true,
      effective_until: true,
      priority: true,
      is_active: true,
    },
  })
  logSyncStep("existing mappings loaded", syncStartedAt)

  const existingMappingByKey = new Map(
    existingMappings.map((mapping) => [mapping.mapping_key, mapping])
  )

  const createdMappings = await prisma.jurisdiction_exam_regimes.createMany({
    data: mappingRows.filter((row) => !existingMappingByKey.has(row.mapping_key)),
    skipDuplicates: true,
  })
  logSyncStep("mapping createMany completed", syncStartedAt)

  const mappingUpdates = mappingRows.filter((row) => {
    const existing = existingMappingByKey.get(row.mapping_key)
    if (!existing) return false

    return (
      existing.jurisdiction_id !== row.jurisdiction_id ||
      existing.exam_regime_id !== row.exam_regime_id ||
      dateKey(existing.effective_from) !== dateKey(row.effective_from) ||
      dateKey(existing.effective_until) !== dateKey(row.effective_until) ||
      existing.priority !== row.priority ||
      existing.is_active !== row.is_active
    )
  })

  let mappingsUpdated = 0

  for (const row of mappingUpdates) {
    const result = await prisma.jurisdiction_exam_regimes.updateMany({
      where: { mapping_key: row.mapping_key },
      data: {
        jurisdiction_id: row.jurisdiction_id,
        exam_regime_id: row.exam_regime_id,
        effective_from: row.effective_from,
        effective_until: row.effective_until,
        priority: row.priority,
        is_active: row.is_active,
        updated_at: now,
      },
    })

    mappingsUpdated += result.count
  }
  logSyncStep(
    `mapping updateMany completed, changed records: ${mappingUpdates.length}`,
    syncStartedAt
  )

  return NextResponse.json({
    ok: true,
    jurisdictionsCreated: created.count,
    jurisdictionsUpdated,
    mappingsCreated: createdMappings.count,
    mappingsUpdated,
    mappingsConfirmed: mappingRows.length,
    source: "dashboard jurisdiction configuration",
  })
}

export async function POST() {
  try {
    return await withSyncTimeout(synchronizeJurisdictionRegistry(), 30000)
  } catch (error) {
    console.error("Registry jurisdiction synchronization failed:", error)

    return NextResponse.json(
      {
        ok: false,
        error: readableSyncError(error),
      },
      { status: 500 }
    )
  }
}

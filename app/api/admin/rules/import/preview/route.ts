import { Prisma } from "@prisma/client"
import ExcelJS from "exceljs"
import { parse } from "csv-parse/sync"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizeRuleInput,
  requireRuleAdmin,
  validateRuleInput,
} from "@/lib/rules/admin-registry"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_ROWS = 5000

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeRecord(record: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    normalized[normalizeHeader(key)] = value
  }
  return normalized
}

function readCsv(buffer: Buffer) {
  return parse(buffer.toString("utf8"), {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as Record<string, unknown>[]
}

async function readWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headers: string[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    headers[column] = normalizeHeader(cell.text)
  })

  const rows: Record<string, unknown>[] = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const record: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      const header = headers[column]
      if (header) record[header] = cell.text
    })
    if (Object.values(record).some((value) => String(value ?? "").trim())) rows.push(record)
  })
  return rows
}

export async function POST(req: Request) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Select a CSV or XLSX file." }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "The import file must be 10 MB or smaller." }, { status: 400 })
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!["csv", "xlsx"].includes(extension)) {
      return NextResponse.json({ ok: false, error: "Only CSV and XLSX files are supported." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawRows = extension === "csv" ? readCsv(buffer) : await readWorkbook(buffer)
    if (rawRows.length === 0) {
      return NextResponse.json({ ok: false, error: "The file does not contain any rule rows." }, { status: 400 })
    }
    if (rawRows.length > MAX_ROWS) {
      return NextResponse.json({ ok: false, error: `A single import may contain at most ${MAX_ROWS} rows.` }, { status: 400 })
    }

    const normalizedRows = rawRows.map((raw, index) => {
      const normalized = normalizeRuleInput(normalizeRecord(raw))
      const errors = validateRuleInput(normalized)
      return { rowNumber: index + 2, raw, normalized, errors }
    })

    const seen = new Map<string, number>()
    for (const row of normalizedRows) {
      const key = row.normalized.externalKey?.toLowerCase()
      if (!key) continue
      const first = seen.get(key)
      if (first) row.errors.push(`External key is duplicated in this file; first used on row ${first}.`)
      else seen.set(key, row.rowNumber)
    }

    const keys = normalizedRows
      .map((row) => row.normalized.externalKey)
      .filter((value): value is string => !!value)
    const existing = keys.length
      ? await prisma.rules.findMany({
          where: { external_key: { in: keys } },
          select: { id: true, external_key: true },
        })
      : []
    const existingByKey = new Map(existing.map((row) => [row.external_key!.toLowerCase(), row.id]))

    const regimeCodes = Array.from(new Set(normalizedRows.map((row) => row.normalized.examRegimeCode).filter(Boolean)))
    const knownRegimes = await prisma.exam_regimes.findMany({
      where: { code: { in: regimeCodes, mode: "insensitive" }, is_active: true },
      select: { code: true },
    })
    const knownRegimeCodes = new Set(knownRegimes.map((item) => item.code.toUpperCase()))

    const jurisdictionCodes = Array.from(
      new Set(
        normalizedRows
          .map((row) => row.normalized.jurisdictionCode?.toUpperCase())
          .filter((value): value is string => !!value)
      )
    )
    const knownJurisdictions = await prisma.jurisdictions.findMany({
      where: { code: { in: jurisdictionCodes, mode: "insensitive" }, is_active: true },
      select: { code: true },
    })
    const knownJurisdictionCodes = new Set(knownJurisdictions.map((item) => item.code.toUpperCase()))

    for (const row of normalizedRows) {
      if (row.normalized.examRegimeCode && !knownRegimeCodes.has(row.normalized.examRegimeCode)) {
        row.errors.push(`Unknown exam regime: ${row.normalized.examRegimeCode}.`)
      }
      const jurisdiction = row.normalized.jurisdictionCode?.toUpperCase()
      if (jurisdiction && !knownJurisdictionCodes.has(jurisdiction)) {
        row.errors.push(`Unknown jurisdiction: ${jurisdiction}.`)
      }
    }

    const validRows = normalizedRows.filter((row) => row.errors.length === 0)
    const invalidRows = normalizedRows.filter((row) => row.errors.length > 0)

    const batch = await prisma.rule_import_batches.create({
      data: {
        file_name: file.name,
        file_format: extension.toUpperCase(),
        status: invalidRows.length > 0 ? "VALIDATED_WITH_ERRORS" : "VALIDATED",
        total_rows: normalizedRows.length,
        valid_rows: validRows.length,
        invalid_rows: invalidRows.length,
        uploaded_by: auth.admin.id,
        validated_at: new Date(),
        rows: {
          create: normalizedRows.map((row) => {
            const key = row.normalized.externalKey?.toLowerCase() ?? ""
            const existingId = existingByKey.get(key) ?? null
            return {
              row_number: row.rowNumber,
              external_key: row.normalized.externalKey,
              action: existingId ? "UPDATE" : "CREATE",
              validation_status: row.errors.length === 0 ? "VALID" : "INVALID",
              raw_data: row.raw as Prisma.InputJsonValue,
              normalized_data: row.normalized as unknown as Prisma.InputJsonValue,
              errors: row.errors as Prisma.InputJsonValue,
              resolved_rule_id: existingId,
            }
          }),
        },
      },
      select: { id: true, status: true },
    })

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      status: batch.status,
      summary: {
        total: normalizedRows.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        create: validRows.filter((row) => !existingByKey.has(row.normalized.externalKey!.toLowerCase())).length,
        update: validRows.filter((row) => existingByKey.has(row.normalized.externalKey!.toLowerCase())).length,
      },
      rows: normalizedRows.slice(0, 250).map((row) => ({
        rowNumber: row.rowNumber,
        externalKey: row.normalized.externalKey,
        title: row.normalized.title,
        subject: row.normalized.subjectName,
        jurisdiction: row.normalized.jurisdictionCode || "Global",
        examRegime: row.normalized.examRegimeCode,
        action: existingByKey.has(row.normalized.externalKey?.toLowerCase() ?? "") ? "UPDATE" : "CREATE",
        status: row.errors.length === 0 ? "VALID" : "INVALID",
        errors: row.errors,
      })),
      truncated: normalizedRows.length > 250,
    })
  } catch (error) {
    console.error("rule import preview error", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "The import could not be validated." },
      { status: 400 }
    )
  }
}

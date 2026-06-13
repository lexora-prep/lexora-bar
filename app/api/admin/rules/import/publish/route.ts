import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizeRuleInput,
  requireRuleAdmin,
  saveRuleWithVersion,
} from "@/lib/rules/admin-registry"

export async function POST(req: Request) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  try {
    const body = (await req.json()) as { batchId?: string }
    const batchId = String(body.batchId ?? "").trim()
    if (!batchId) {
      return NextResponse.json({ ok: false, error: "Import batch ID is required." }, { status: 400 })
    }

    const batch = await prisma.rule_import_batches.findUnique({
      where: { id: batchId },
      include: {
        rows: {
          where: { validation_status: "VALID" },
          orderBy: { row_number: "asc" },
        },
      },
    })
    if (!batch) {
      return NextResponse.json({ ok: false, error: "Import batch not found." }, { status: 404 })
    }
    if (batch.invalid_rows > 0) {
      return NextResponse.json(
        { ok: false, error: "Resolve invalid rows before publishing this batch." },
        { status: 409 }
      )
    }
    if (batch.status === "PUBLISHED") {
      return NextResponse.json({ ok: true, alreadyPublished: true, batchId })
    }

    await prisma.rule_import_batches.update({
      where: { id: batchId },
      data: { status: "PUBLISHING" },
    })

    let created = 0
    let updated = 0
    let skipped = 0

    for (const row of batch.rows) {
      try {
        const raw = (row.normalized_data ?? {}) as Record<string, unknown>
        const input = normalizeRuleInput(raw)
        const existed = !!row.resolved_rule_id
        const stored = await prisma.$transaction((tx) =>
          saveRuleWithVersion(tx, input, auth.admin!.id)
        )

        await prisma.rule_import_rows.update({
          where: { id: row.id },
          data: {
            action: existed ? "UPDATE" : "CREATE",
            validation_status: "PUBLISHED",
            resolved_rule_id: stored.id,
            updated_at: new Date(),
          },
        })
        if (existed) updated += 1
        else created += 1
      } catch (error) {
        skipped += 1
        await prisma.rule_import_rows.update({
          where: { id: row.id },
          data: {
            validation_status: "FAILED",
            errors: [error instanceof Error ? error.message : "Unknown publish error"],
            updated_at: new Date(),
          },
        })
      }
    }

    const finalStatus = skipped > 0 ? "PUBLISHED_WITH_ERRORS" : "PUBLISHED"
    await prisma.rule_import_batches.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        created_rows: created,
        updated_rows: updated,
        skipped_rows: skipped,
        published_by: auth.admin.id,
        published_at: new Date(),
        error_summary: skipped > 0 ? { skipped } : undefined,
      },
    })

    return NextResponse.json({
      ok: skipped === 0,
      batchId,
      status: finalStatus,
      created,
      updated,
      skipped,
    })
  } catch (error) {
    console.error("rule import publish error", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "The import could not be published." },
      { status: 400 }
    )
  }
}

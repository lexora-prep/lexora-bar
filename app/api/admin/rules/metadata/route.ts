import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"

export async function GET() {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  const [jurisdictions, examRegimes, subjects, batches, totals] = await Promise.all([
    prisma.jurisdictions.findMany({
      where: { is_active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, code: true, name: true, jurisdiction_type: true },
    }),
    prisma.exam_regimes.findMany({
      where: { is_active: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        effective_from: true,
        effective_until: true,
      },
    }),
    prisma.subjects.findMany({
      orderBy: [{ order_index: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        exam_status: true,
        show_in_rule_training: true,
        show_in_analytics: true,
        _count: { select: { rules: true, topics: true } },
      },
    }),
    prisma.rule_import_batches.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: {
        id: true,
        file_name: true,
        file_format: true,
        status: true,
        total_rows: true,
        valid_rows: true,
        invalid_rows: true,
        created_rows: true,
        updated_rows: true,
        skipped_rows: true,
        created_at: true,
        validated_at: true,
        published_at: true,
      },
    }),
    Promise.all([
      prisma.rules.count(),
      prisma.rules.count({ where: { publication_status: "PUBLISHED", is_active: true } }),
      prisma.rules.count({ where: { publication_status: "DRAFT" } }),
      prisma.rules.count({ where: { publication_status: "ARCHIVED" } }),
      prisma.rule_applicability.count({ where: { is_active: true, is_tested: true } }),
    ]),
  ])

  return NextResponse.json({
    ok: true,
    jurisdictions,
    examRegimes,
    subjects,
    batches,
    totals: {
      all: totals[0],
      published: totals[1],
      draft: totals[2],
      archived: totals[3],
      applicability: totals[4],
    },
  })
}

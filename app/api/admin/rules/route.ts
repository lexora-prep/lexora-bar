import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizeRuleInput,
  requireRuleAdmin,
  saveRuleWithVersion,
} from "@/lib/rules/admin-registry"

function clampPage(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(req: Request) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") ?? "").trim()
  const status = (url.searchParams.get("status") ?? "all").trim().toUpperCase()
  const subjectId = (url.searchParams.get("subjectId") ?? "all").trim()
  const regimeCode = (url.searchParams.get("regime") ?? "all").trim()
  const jurisdictionCode = (url.searchParams.get("jurisdiction") ?? "all").trim()
  const page = clampPage(url.searchParams.get("page"), 1)
  const pageSize = Math.min(clampPage(url.searchParams.get("pageSize"), 50), 100)

  const where: Prisma.rulesWhereInput = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { rule_text: { contains: q, mode: "insensitive" } },
            { external_key: { contains: q, mode: "insensitive" } },
            { subjects: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status !== "ALL" ? { publication_status: status } : {}),
    ...(subjectId !== "all" ? { subject_id: subjectId } : {}),
    ...(regimeCode !== "all" || jurisdictionCode !== "all"
      ? {
          registry_applicability: {
            some: {
              is_active: true,
              ...(regimeCode !== "all"
                ? { exam_regime: { code: { equals: regimeCode, mode: "insensitive" } } }
                : {}),
              ...(jurisdictionCode !== "all"
                ? {
                    jurisdiction: {
                      code: { equals: jurisdictionCode, mode: "insensitive" },
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.rules.count({ where }),
    prisma.rules.findMany({
      where,
      orderBy: [{ updated_at: "desc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        external_key: true,
        title: true,
        rule_text: true,
        prompt_question: true,
        buzzwords: true,
        priority: true,
        publication_status: true,
        current_version: true,
        source_type: true,
        is_active: true,
        updated_at: true,
        subjects: { select: { id: true, name: true } },
        topics: { select: { id: true, name: true } },
        subtopics: { select: { id: true, name: true } },
        registry_applicability: {
          where: { is_active: true },
          select: {
            id: true,
            source_package: true,
            priority_weight: true,
            effective_from: true,
            effective_until: true,
            jurisdiction: { select: { code: true, name: true } },
            exam_regime: { select: { code: true, name: true } },
          },
          orderBy: { created_at: "asc" },
        },
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}

export async function POST(req: Request) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response

  try {
    const raw = (await req.json()) as Record<string, unknown>
    const input = normalizeRuleInput(raw)
    const stored = await prisma.$transaction((tx) =>
      saveRuleWithVersion(tx, input, auth.admin!.id)
    )

    return NextResponse.json({ ok: true, id: stored.id, externalKey: stored.external_key })
  } catch (error) {
    console.error("admin rule create error", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Rule could not be saved." },
      { status: 400 }
    )
  }
}

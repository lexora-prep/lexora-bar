import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizeRuleInput,
  requireRuleAdmin,
  saveRuleWithVersion,
} from "@/lib/rules/admin-registry"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response
  const { id } = await context.params

  const rule = await prisma.rules.findUnique({
    where: { id },
    include: {
      subjects: { select: { id: true, name: true } },
      topics: { select: { id: true, name: true } },
      subtopics: { select: { id: true, name: true } },
      registry_versions: {
        orderBy: { version_number: "desc" },
        take: 30,
      },
      registry_applicability: {
        orderBy: { created_at: "asc" },
        include: {
          jurisdiction: { select: { id: true, code: true, name: true } },
          exam_regime: { select: { id: true, code: true, name: true } },
          curriculum_subject: { select: { id: true, display_name: true } },
        },
      },
    },
  })

  if (!rule) {
    return NextResponse.json({ ok: false, error: "Rule not found." }, { status: 404 })
  }

  return NextResponse.json({ ok: true, rule })
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response
  const { id } = await context.params

  try {
    const raw = (await req.json()) as Record<string, unknown>
    const input = normalizeRuleInput({ ...raw, id })
    const stored = await prisma.$transaction((tx) =>
      saveRuleWithVersion(tx, input, auth.admin!.id)
    )
    return NextResponse.json({ ok: true, id: stored.id, version: stored.current_version })
  } catch (error) {
    console.error("admin rule update error", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Rule could not be updated." },
      { status: 400 }
    )
  }
}

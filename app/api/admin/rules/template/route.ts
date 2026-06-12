import { NextResponse } from "next/server"
import { requireRuleAdmin } from "@/lib/rules/admin-registry"

const headers = [
  "external_key",
  "title",
  "rule_text",
  "subject",
  "topic",
  "subtopic",
  "prompt_question",
  "buzzwords",
  "how_to_apply",
  "common_traps",
  "application_example",
  "exam_tip",
  "priority",
  "publication_status",
  "jurisdiction_code",
  "exam_regime_code",
  "source_package",
  "priority_weight",
  "effective_from",
  "effective_until",
  "change_note",
]

const example = [
  "ca_prof_resp_conflicts_001",
  "Concurrent Conflicts of Interest",
  "A lawyer must not represent a client when the representation creates a concurrent conflict unless each affected client gives informed written consent and the representation is otherwise permissible.",
  "Professional Responsibility",
  "Conflicts of Interest",
  "Current Clients",
  "What must a lawyer establish before accepting representation involving a concurrent conflict?",
  "concurrent conflict|informed written consent|affected client",
  "identify the conflict|determine whether consent is permitted|obtain informed written consent",
  "assuming every conflict is consentable|using oral consent only",
  "A lawyer represents two clients whose interests become directly adverse in the same transaction.",
  "State the conflict first, then analyze consentability and consent.",
  "high",
  "DRAFT",
  "CA",
  "CALIFORNIA_CURRENT",
  "california",
  "3",
  "2026-07-01",
  "",
  "Initial California rule import",
]

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET() {
  const auth = await requireRuleAdmin()
  if (auth.response || !auth.admin) return auth.response
  const csv = [headers, example].map((row) => row.map(escapeCsv).join(",")).join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lexora-rule-import-template.csv"',
    },
  })
}

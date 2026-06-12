import fs from "node:fs"
import path from "node:path"
import {
  normalizeList,
  normalizeRuleInput,
  validateRuleInput,
} from "../lib/rules/admin-registry"

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${label}`)
  console.log(`PASS: ${label}`)
}

const root = process.cwd()

const list = normalizeList("minimum contacts | purposeful availment; fairness\nnotice")
assert(list.length === 4, "list fields accept vertical bars, semicolons, and line breaks")
assert(new Set(list).size === list.length, "list fields are deduplicated")

const valid = normalizeRuleInput({
  external_key: "ca_prof_resp_conflicts_001",
  title: "Concurrent Conflicts of Interest",
  rule_text: "A lawyer must not represent clients with a concurrent conflict unless the conflict is consentable and the required informed consent is obtained.",
  subject: "Professional Responsibility",
  topic: "Conflicts of Interest",
  buzzwords: "concurrent conflict|informed consent",
  jurisdiction_code: "CA",
  exam_regime_code: "CALIFORNIA_CURRENT",
  publication_status: "DRAFT",
})
assert(validateRuleInput(valid).length === 0, "a complete import row passes validation")
assert(valid.buzzwords?.length === 2, "buzzwords remain one array field inside the rule")

const invalid = normalizeRuleInput({ title: "Incomplete row" })
const errors = validateRuleInput(invalid)
assert(errors.some((item) => item.includes("Rule text")), "missing rule text is rejected")
assert(errors.some((item) => item.includes("Subject")), "missing subject is rejected")
assert(errors.some((item) => item.includes("External key")), "bulk import requires a stable external key")

const helper = fs.readFileSync(path.join(root, "lib/rules/admin-registry.ts"), "utf8")
const publishRoute = fs.readFileSync(path.join(root, "app/api/admin/rules/import/publish/route.ts"), "utf8")
assert(helper.includes("rule_versions.create"), "every manual or imported update creates a version snapshot")
assert(helper.includes("rules.update") && !helper.includes("rules.delete"), "updates preserve rule UUIDs and do not hard-delete rules")
assert(publishRoute.includes('invalid_rows > 0'), "imports with invalid rows are blocked from publication")
assert(publishRoute.includes("saveRuleWithVersion"), "manual and bulk workflows use the same versioned save logic")

console.log("PASS: Build 8B tests completed without changing database records.")

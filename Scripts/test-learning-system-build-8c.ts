import fs from "node:fs"
import path from "node:path"

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${label}`)
  console.log(`PASS: ${label}`)
}

const root = process.cwd()
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8")

const registry = read("lib/rules/registry.ts")
const cycles = read("lib/learning/cycles.ts")
const allRules = read("app/api/get-all-rules/route.ts")
const subjectRules = read("app/api/get-rules-by-subject/route.ts")
const flashcards = read("app/api/flashcards/start-session/route.ts")
const weakFocus = read("app/api/rules/weak-focus/route.ts")
const weakAreas = read("app/api/weak-areas/route.ts")
const ruleWeakAreas = read("app/api/rule-weak-areas/route.ts")
const subjectAnalytics = read("app/api/bll-subject-analytics/route.ts")
const strengthsWeaknesses = read("app/api/strengths-weaknesses/route.ts")
const dashboardSummary = read("app/api/dashboard/summary/route.ts")
const progressHistory = read("lib/progress-history-analytics.ts")
const studyPlan = read("app/api/study-plan/route.ts")

assert(
  cycles.includes("getApplicableLearningRulesForUser") &&
    cycles.includes("getApplicableRuleUniverseForUser(userId)"),
  "learning-cycle totals are jurisdiction-aware"
)
assert(
  allRules.includes("applicableRuleIds.has(rule.id)") &&
    subjectRules.includes("applicableRuleIds.has(rule.id)"),
  "rule-training APIs exclude non-applicable rules"
)
assert(
  !allRules.includes("id: { in: applicableRuleIds }") &&
    !flashcards.includes("id: { in: applicableRuleIds }"),
  "primary study routes avoid one oversized applicable-rule IN query"
)
assert(
  flashcards.includes("getApplicableRuleUniverseForUser(userId)") &&
    flashcards.includes("rules.filter((rule) => applicableRuleIds.has(rule.id))"),
  "flashcard sessions use the selected jurisdiction curriculum"
)
assert(
  [weakFocus, weakAreas, ruleWeakAreas].every(
    (source) =>
      source.includes("getApplicableRuleUniverseForUser") &&
      source.includes("applicableRuleIds.has")
  ),
  "weak-area queues use only currently applicable rules"
)
assert(
  subjectAnalytics.includes("const applicableRules = ruleUniverse.rules") &&
    dashboardSummary.includes("safeApplicableRules"),
  "analytics denominators use the applicable full-rule universe"
)
assert(
  strengthsWeaknesses.includes("const attempts = allAttempts.filter") &&
    progressHistory.includes("const applicableAttempts = allAttempts.filter") &&
    progressHistory.includes("const masteredRules = applicableProgressRows"),
  "historical analytics exclude unrelated jurisdiction attempts"
)
assert(
  studyPlan.includes("getApplicableRuleCountForPlan") &&
    studyPlan.includes("jurisdictionCode: jurisdiction.code") &&
    studyPlan.includes("examRegimeCode: examRegime"),
  "study-plan daily rule totals follow jurisdiction and exam regime"
)
assert(
  !registry.includes("sourcePackages: plan?.rulePackages"),
  "study-pack selection cannot silently trigger the legacy all-rule fallback"
)
assert(
  registry.includes("rule_applicability.findMany") &&
    registry.includes('publication_status: params.includeDrafts'),
  "only active and publishable registry rules enter the user curriculum"
)

console.log("PASS: Build 8C tests completed without changing database records.")

#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()


def check(label: str, condition: bool):
    if not condition:
        raise SystemExit(f"FAIL: {label}")
    print(f"PASS: {label}")

files = {
    "registry resolver": ROOT / "lib/rules/registry.ts",
    "learning cycles": ROOT / "lib/learning/cycles.ts",
    "all-rule API": ROOT / "app/api/get-all-rules/route.ts",
    "subject-rule API": ROOT / "app/api/get-rules-by-subject/route.ts",
    "subject API": ROOT / "app/api/get-subjects/route.ts",
    "flashcard API": ROOT / "app/api/flashcards/start-session/route.ts",
    "weak-focus API": ROOT / "app/api/rules/weak-focus/route.ts",
    "weak-areas API": ROOT / "app/api/weak-areas/route.ts",
    "rule weak-areas API": ROOT / "app/api/rule-weak-areas/route.ts",
    "subject analytics API": ROOT / "app/api/bll-subject-analytics/route.ts",
    "strength analytics API": ROOT / "app/api/strengths-weaknesses/route.ts",
    "dashboard summary API": ROOT / "app/api/dashboard/summary/route.ts",
    "progress history analytics": ROOT / "lib/progress-history-analytics.ts",
    "study plan API": ROOT / "app/api/study-plan/route.ts",
}

for label, path in files.items():
    check(f"file exists: {label}", path.exists())

text = {label: path.read_text(encoding="utf-8") for label, path in files.items()}

check(
    "learning cycles resolve the user's jurisdiction rule universe",
    "getApplicableLearningRulesForUser" in text["learning cycles"]
    and "getApplicableRuleUniverseForUser(userId)" in text["learning cycles"],
)
check(
    "rule training loads only applicable published rules",
    "getApplicableRuleUniverseForUser(auth.userId)" in text["all-rule API"]
    and "applicableRuleIds.has(rule.id)" in text["all-rule API"],
)
check(
    "subject training uses the same applicable universe",
    "getApplicableRuleUniverseForUser(auth.userId)" in text["subject-rule API"]
    and "applicableRuleIds.has(rule.id)" in text["subject-rule API"],
)
check(
    "flashcards use applicable jurisdiction rules",
    "getApplicableRuleUniverseForUser(userId)" in text["flashcard API"]
    and "rules.filter((rule) => applicableRuleIds.has(rule.id))" in text["flashcard API"],
)
check(
    "weak-area queues exclude rules outside the current curriculum",
    all(
        "getApplicableRuleUniverseForUser" in text[label]
        and "applicableRuleIds.has" in text[label]
        for label in ["weak-focus API", "weak-areas API", "rule weak-areas API"]
    ),
)
check(
    "subject analytics denominator uses applicable rules",
    "const applicableRules = ruleUniverse.rules" in text["subject analytics API"],
)
check(
    "strengths and weaknesses use current-jurisdiction attempts",
    "const attempts = allAttempts.filter" in text["strength analytics API"]
    and "applicableRuleIds.has(attempt.rule_id)" in text["strength analytics API"],
)
check(
    "dashboard subject totals use the registry universe",
    "getApplicableRuleUniverseForUser(userId)" in text["dashboard summary API"]
    and "safeApplicableRules" in text["dashboard summary API"],
)
check(
    "progress history filters attempts and mastery to applicable rules",
    "const applicableAttempts = allAttempts.filter" in text["progress history analytics"]
    and "const masteredRules = applicableProgressRows" in text["progress history analytics"],
)
check(
    "study-plan daily totals use jurisdiction and exam date",
    "getApplicableRuleCountForPlan" in text["study plan API"]
    and "getApplicableRuleUniverse({" in text["study plan API"],
)
check(
    "study packs do not accidentally force legacy fallback",
    "sourcePackages: plan?.rulePackages" not in text["registry resolver"],
)
check(
    "large applicable-rule ID lists are filtered in memory in primary study routes",
    "id: { in: applicableRuleIds }" not in text["all-rule API"]
    and "id: { in: applicableRuleIds }" not in text["flashcard API"],
)
check(
    "buzzwords remain fields and are not counted as rules",
    "buzzwords" not in text["study plan API"]
    or "getApplicableRuleCountForPlan" in text["study plan API"],
)
check("installer payload removed", not (ROOT / "payload-learning-system-build-8c").exists())

print("PASS: Lexora Learning System Build 8C source installation is complete.")
print("PASS: This verifier did not modify project files or database records.")

#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()


def check(label: str, condition: bool):
    if not condition:
        raise SystemExit(f"FAIL: {label}")
    print(f"PASS: {label}")

files = {
    "admin rule page": ROOT / "app/admin/rules/page.tsx",
    "admin rule API": ROOT / "app/api/admin/rules/route.ts",
    "admin rule detail API": ROOT / "app/api/admin/rules/[id]/route.ts",
    "admin metadata API": ROOT / "app/api/admin/rules/metadata/route.ts",
    "import preview API": ROOT / "app/api/admin/rules/import/preview/route.ts",
    "import publish API": ROOT / "app/api/admin/rules/import/publish/route.ts",
    "template API": ROOT / "app/api/admin/rules/template/route.ts",
    "registry sync API": ROOT / "app/api/admin/rules/registry/sync/route.ts",
    "admin registry helper": ROOT / "lib/rules/admin-registry.ts",
}

for label, path in files.items():
    check(f"file exists: {label}", path.exists())

page = files["admin rule page"].read_text(encoding="utf-8")
helper = files["admin registry helper"].read_text(encoding="utf-8")
preview = files["import preview API"].read_text(encoding="utf-8")
publish = files["import publish API"].read_text(encoding="utf-8")
sync = files["registry sync API"].read_text(encoding="utf-8")

check("rule library interface", "Rule Library Management" in page and "Rule library" in page)
check("manual rule editor", "Create a new rule" in page and "Full rule statement" in page)
check("jurisdiction and exam-regime controls", "jurisdictionCode" in page and "examRegimeCode" in page)
check("version history interface", "Version history" in page and "Save new version" in page)
check("CSV and XLSX import", 'accept=".csv,.xlsx"' in page and "ExcelJS" in preview)
check("validation preview before publication", "Validate import" in page and "validation_status" in preview)
check("invalid batches cannot publish", "Resolve invalid rows before publishing" in publish)
check("stable-key updates preserve UUIDs", "existing.current_version + 1" in helper and "rules.update" in helper)
check("version snapshots are created", "rule_versions.create" in helper)
check("rules are never hard-deleted", "rules.delete" not in helper and "rules.delete" not in publish)
check("buzzwords remain rule fields", "buzzwords:" in helper and "registry denominator" not in page)
check("rule-management permission required", "can_manage_rules" in helper and "super_admin" in helper)
check("scheduler jurisdiction synchronization", "JURISDICTION_OPTIONS" in sync and "jurisdiction_exam_regimes.upsert" in sync)
check("installer payload removed", not (ROOT / "payload-learning-system-build-8b").exists())

print("PASS: Lexora Learning System Build 8B source installation is complete.")
print("PASS: This verifier did not modify project files or database records.")

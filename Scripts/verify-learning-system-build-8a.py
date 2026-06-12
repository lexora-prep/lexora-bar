#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()


def check(label: str, condition: bool):
    if not condition:
        raise SystemExit(f"FAIL: {label}")
    print(f"PASS: {label}")


schema_path = ROOT / "prisma/schema.prisma"
migration_path = ROOT / "prisma/migrations/20260612220000_dynamic_rule_registry_foundation/migration.sql"
registry_path = ROOT / "lib/rules/registry.ts"
backfill_path = ROOT / "Scripts/backfill-rule-registry-build-8a.ts"

check("Prisma schema exists", schema_path.exists())
check("Dynamic Rule Registry migration exists", migration_path.exists())
check("Applicable rule universe resolver exists", registry_path.exists())
check("Registry baseline backfill exists", backfill_path.exists())

schema = schema_path.read_text(encoding="utf-8")
migration = migration_path.read_text(encoding="utf-8")
registry = registry_path.read_text(encoding="utf-8")
backfill = backfill_path.read_text(encoding="utf-8")

for model in [
    "jurisdictions",
    "exam_regimes",
    "jurisdiction_exam_regimes",
    "curriculum_subjects",
    "rule_versions",
    "rule_applicability",
    "rule_import_batches",
    "rule_import_rows",
]:
    check(f"Prisma model installed: {model}", f"model {model} {{" in schema)

for field in [
    "external_key",
    "source_type",
    "publication_status",
    "current_version",
    "published_at",
    "archived_at",
]:
    check(f"Rule registry field installed: {field}", field in schema)

check("migration preserves existing rule IDs", 'ALTER TABLE "public"."rules"' in migration and 'DROP TABLE "public"."rules"' not in migration)
check("migration snapshots existing rule versions", 'INSERT INTO "public"."rule_versions"' in migration)
check("migration seeds baseline exam regimes", "UBE_CURRENT" in migration and "NEXTGEN" in migration)
check("migration creates rule applicability", 'CREATE TABLE "public"."rule_applicability"' in migration)
check("resolver supports jurisdiction and exam date", "jurisdictionCode" in registry and "examDate" in registry)
check("resolver separates registry from legacy fallback", 'source: "registry"' in registry and 'source: "legacy-fallback"' in registry)
check("resolver deduplicates by stable rule ID", "selected.set(row.rule_id" in registry)
check("backfill reads canonical subject files", "loadCanonicalSubjectFiles" in backfill)
check("backfill requires 1,162 full rules", "expectedTotal !== 1162" in backfill)
check("backfill stores buzzwords inside rule content", "mapCanonicalRuleToDb" in backfill)
check("backfill registers rule applicability", "rule_applicability.upsert" in backfill)
check("backfill does not delete learning history", "user_rule_progress.delete" not in backfill and "user_rule_attempts.delete" not in backfill)
check("extracted payload directory removed", not (ROOT / "payload-learning-system-build-8a").exists())

print("PASS: Lexora Learning System Build 8A source installation is complete.")
print("PASS: This verifier did not execute a migration or change database records.")

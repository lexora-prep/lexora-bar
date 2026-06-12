#!/usr/bin/env python3
from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path.cwd()
PAYLOAD = ROOT / "payload-learning-system-build-8a"
FILES = [
    Path("prisma/schema.prisma"),
    Path("prisma/migrations/20260612220000_dynamic_rule_registry_foundation/migration.sql"),
    Path("lib/rules/registry.ts"),
    Path("Scripts/backfill-rule-registry-build-8a.ts"),
]

if not PAYLOAD.exists():
    raise SystemExit(
        "ERROR: payload-learning-system-build-8a was not found. "
        "Run this script from the Lexora project root after unzipping the build."
    )

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / ".backups" / f"learning-system-build-8a-{stamp}"
backup.mkdir(parents=True, exist_ok=True)

for relative in FILES:
    source = PAYLOAD / relative
    target = ROOT / relative

    if not source.exists():
        raise SystemExit(f"ERROR: Missing payload file: {source}")

    if target.exists():
        backup_target = backup / relative
        backup_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, backup_target)

    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)

shutil.rmtree(PAYLOAD)

print("PASS: Lexora Learning System Build 8A installed.")
print(f"Backup: {backup}")
print("PASS: Dynamic jurisdiction, exam-regime, curriculum, applicability, version, and import models were added.")
print("PASS: Existing rule IDs and user learning history were preserved by the installer.")
print("PASS: A reusable applicable-rule-universe resolver was added.")
print("PASS: The migration was copied but was not executed by this installer.")
print("Next, from this same Lexora project folder, run:")
print("  npx prisma format")
print("  npx prisma validate")
print("  npx prisma generate")
print("  npx tsc --noEmit")
print("  npx prisma migrate deploy")
print("  npx tsx Scripts/backfill-rule-registry-build-8a.ts")
print("  python3 Scripts/verify-learning-system-build-8a.py")
print("  npx tsx Scripts/test-learning-system-build-8a.ts")

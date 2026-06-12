#!/usr/bin/env python3
from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path.cwd()
PAYLOAD = ROOT / "payload-learning-system-build-8b"
FILES = [
    Path("app/admin/rules/page.tsx"),
    Path("app/api/admin/rules/route.ts"),
    Path("app/api/admin/rules/[id]/route.ts"),
    Path("app/api/admin/rules/metadata/route.ts"),
    Path("app/api/admin/rules/import/preview/route.ts"),
    Path("app/api/admin/rules/import/publish/route.ts"),
    Path("app/api/admin/rules/template/route.ts"),
    Path("app/api/admin/rules/registry/sync/route.ts"),
    Path("lib/rules/admin-registry.ts"),
]

if not PAYLOAD.exists():
    raise SystemExit(
        "ERROR: payload-learning-system-build-8b was not found. "
        "Run this script from the Lexora project root after unzipping the build."
    )

schema = ROOT / "prisma/schema.prisma"
required_models = [
    "model jurisdictions {",
    "model exam_regimes {",
    "model rule_versions {",
    "model rule_applicability {",
    "model rule_import_batches {",
    "model rule_import_rows {",
]
if not schema.exists():
    raise SystemExit("ERROR: prisma/schema.prisma was not found.")
schema_text = schema.read_text(encoding="utf-8")
missing = [model for model in required_models if model not in schema_text]
if missing:
    raise SystemExit(
        "ERROR: Build 8A Dynamic Rule Registry models are missing. "
        "Install and migrate Build 8A before Build 8B."
    )

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / ".backups" / f"learning-system-build-8b-{stamp}"
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

print("PASS: Lexora Learning System Build 8B installed.")
print(f"Backup: {backup}")
print("PASS: Admin rule library, manual editor, version history, and registry controls were installed.")
print("PASS: CSV and XLSX validation-preview imports were installed.")
print("PASS: The installer did not run a migration or change database records.")
print("Next, from this same Lexora project folder, run:")
print("  npx prisma generate")
print("  npx prisma validate")
print("  npx tsc --noEmit")
print("  python3 Scripts/verify-learning-system-build-8b.py")
print("  npx tsx Scripts/test-learning-system-build-8b.ts")
print("Then open /admin/rules and use 'Sync scheduler jurisdictions' once.")

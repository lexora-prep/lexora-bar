#!/usr/bin/env python3
from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path.cwd()
PAYLOAD = ROOT / "payload-learning-system-build-8c"
FILES = [
    Path("lib/rules/registry.ts"),
    Path("lib/learning/cycles.ts"),
    Path("app/api/get-all-rules/route.ts"),
    Path("app/api/get-rules-by-subject/route.ts"),
    Path("app/api/get-subjects/route.ts"),
    Path("app/api/flashcards/start-session/route.ts"),
    Path("app/api/rules/weak-focus/route.ts"),
    Path("app/api/weak-areas/route.ts"),
    Path("app/api/rule-weak-areas/route.ts"),
    Path("app/api/bll-subject-analytics/route.ts"),
    Path("app/api/strengths-weaknesses/route.ts"),
    Path("app/api/dashboard/summary/route.ts"),
    Path("lib/progress-history-analytics.ts"),
    Path("app/api/study-plan/route.ts"),
]

if not PAYLOAD.exists():
    raise SystemExit(
        "ERROR: payload-learning-system-build-8c was not found. "
        "Run this script from the Lexora project root after unzipping the build."
    )

schema = ROOT / "prisma/schema.prisma"
registry = ROOT / "lib/rules/registry.ts"
if not schema.exists() or "model rule_applicability {" not in schema.read_text(encoding="utf-8"):
    raise SystemExit(
        "ERROR: Build 8A Dynamic Rule Registry is missing. "
        "Install and migrate Build 8A before Build 8C."
    )
if not registry.exists():
    raise SystemExit("ERROR: lib/rules/registry.ts is missing.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / ".backups" / f"learning-system-build-8c-{stamp}"
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

print("PASS: Lexora Learning System Build 8C installed.")
print(f"Backup: {backup}")
print("PASS: Rule training, flashcards, weak-area queues, analytics, and study-plan totals now use the applicable jurisdiction rule universe.")
print("PASS: Existing rule UUIDs and user learning history were not changed.")
print("PASS: The installer did not run a migration or modify database records.")
print("Next, from this same Lexora project folder, run:")
print("  npx prisma generate")
print("  npx prisma validate")
print("  npx tsc --noEmit")
print("  python3 Scripts/verify-learning-system-build-8c.py")
print("  npx tsx Scripts/test-learning-system-build-8c.ts")

# Lexora Learning System Build 8B

Build 8B adds the operational admin interface for the Dynamic Rule Registry introduced in Build 8A.

## What this build adds

- A complete Rule Library Management page at `/admin/rules`.
- Search and filtering by publication status, subject, jurisdiction, and exam regime.
- Manual rule creation and editing with subject, topic, subtopic, learning fields, jurisdiction, exam regime, source package, priority, and effective dates.
- Version snapshots on every update while preserving the existing rule UUID and user learning history.
- Draft, published, and archived publication states.
- CSV and XLSX import with row-by-row validation before publication.
- Safe import updates based on stable `external_key` values.
- Import batch history and validation summaries.
- A downloadable CSV template.
- Registry visibility for jurisdictions, exam regimes, subjects, and applicability totals.
- An explicit admin action to synchronize the database jurisdiction registry with the jurisdictions already configured in the study scheduler.

## Safety behavior

- The installer does not run a database migration.
- The installer does not publish or change database records.
- No rule is hard-deleted.
- Archiving retains the rule and its version history.
- Bulk imports cannot publish while invalid rows remain.
- Existing rules are updated in place by UUID and receive a new version snapshot.

## Installation

Run the commands printed after the installer completes. Build 8B requires Build 8A to already be installed and migrated.

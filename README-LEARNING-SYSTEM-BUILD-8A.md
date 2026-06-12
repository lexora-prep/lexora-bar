# Lexora Learning System Build 8A

## Dynamic Rule Registry Foundation

Build 8A adds the database and service foundation required to manage rules by jurisdiction, exam regime, subject, effective date, version, and publication state.

It does not yet replace the Admin Rules page. The admin library, manual rule form, CSV/XLSX validation workflow, and publishing interface belong to the following builds.

## Added

- Jurisdiction registry
- Exam-regime registry
- Date-based jurisdiction-to-regime mappings
- Curriculum subject memberships
- Rule applicability records
- Stable external rule keys
- Rule publication status and source type
- Rule-version history
- Staged import batches and import rows
- Central `getApplicableRuleUniverse` resolver
- Baseline backfill for the current 1,162 full rules

## Preserved

- Existing `rules.id` values wherever an existing canonical rule is matched
- User attempts
- Mastery and spaced-review history
- Learning-cycle history
- Flashcard references
- Buzzwords as fields inside one rule

## Installation order

Run from the Lexora project root:

```bash
unzip -o ./lexora-learning-system-build-8a.zip -d .
python3 Scripts/install-learning-system-build-8a.py

npx prisma format
npx prisma validate
npx prisma generate
npx tsc --noEmit

npx prisma migrate deploy
npx tsx Scripts/backfill-rule-registry-build-8a.ts

python3 Scripts/verify-learning-system-build-8a.py
npx tsx Scripts/test-learning-system-build-8a.ts
```

## Important

The installer only copies source files. `npx prisma migrate deploy` is the command that applies the database migration. The baseline backfill runs only after the migration has completed.

The migration file must later be committed even though the repository currently ignores `*.sql` files. Use `git add -f` for this migration.

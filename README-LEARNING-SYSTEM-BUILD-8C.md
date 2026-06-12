# Lexora Learning System Build 8C

Build 8C connects the Dynamic Rule Registry to the actual user learning system.

## What this build changes

- Rule Training now loads the rule universe applicable to the user's jurisdiction, exam regime, exam date, and active registry mappings.
- Learning-cycle coverage, remaining-rule totals, recommendations, and subject progress use the same applicable universe.
- Flashcards, Priority Review, Weak Areas, and focused practice exclude rules outside the user's current curriculum.
- Rule Analytics, Strengths and Weaknesses, Dashboard subject summaries, and Progress History use jurisdiction-correct denominators.
- Study-plan daily rule totals use the selected jurisdiction and effective exam regime rather than a global hardcoded rule total.
- Study-pack selection no longer causes the user resolver to fall back accidentally to the legacy global rule library.
- Primary study routes avoid a single oversized `IN` query for the full 1,162-rule universe.

## Safety

- No Prisma model or migration is added.
- No database record is changed by the installer.
- Existing rule UUIDs, attempts, mastery, learning cycles, and version history remain intact.
- Buzzwords remain fields inside a rule and never increase the rule denominator.
- If registry data is unavailable, the existing legacy fallback remains available.

## Installation

Run the commands printed by the installer. Build 8A must already be migrated. Build 8B should already be installed for admin rule management.

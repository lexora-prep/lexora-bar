-- Lexora Dynamic Rule Registry Foundation
-- Adds jurisdiction-aware rule applicability, rule versions, and staged import records.
-- Existing rule IDs and user learning history are preserved.

ALTER TABLE "public"."rules"
  ADD COLUMN "external_key" TEXT,
  ADD COLUMN "source_type" VARCHAR(30) NOT NULL DEFAULT 'LEXORA_CORE',
  ADD COLUMN "publication_status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "current_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "published_at" TIMESTAMPTZ(6),
  ADD COLUMN "archived_at" TIMESTAMPTZ(6),
  ADD COLUMN "created_by" UUID,
  ADD COLUMN "updated_by" UUID;

UPDATE "public"."rules"
SET
  "external_key" = COALESCE("external_key", 'legacy-' || "id"::text),
  "published_at" = COALESCE("published_at", "created_at");

CREATE UNIQUE INDEX "rules_external_key_unique"
  ON "public"."rules"("external_key");

CREATE INDEX "idx_rules_publication_status"
  ON "public"."rules"("publication_status");

CREATE INDEX "idx_rules_source_type"
  ON "public"."rules"("source_type");

CREATE TABLE "public"."jurisdictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jurisdiction_type" VARCHAR(30) NOT NULL DEFAULT 'STATE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jurisdictions_code_key"
  ON "public"."jurisdictions"("code");
CREATE INDEX "jurisdictions_is_active_idx"
  ON "public"."jurisdictions"("is_active");

CREATE TABLE "public"."exam_regimes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "effective_from" DATE,
  "effective_until" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_regimes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_regimes_code_key"
  ON "public"."exam_regimes"("code");
CREATE INDEX "exam_regimes_is_active_idx"
  ON "public"."exam_regimes"("is_active");

CREATE TABLE "public"."jurisdiction_exam_regimes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mapping_key" TEXT NOT NULL,
  "jurisdiction_id" UUID NOT NULL,
  "exam_regime_id" UUID NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_until" DATE,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jurisdiction_exam_regimes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "jurisdiction_exam_regimes_jurisdiction_id_fkey"
    FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "jurisdiction_exam_regimes_exam_regime_id_fkey"
    FOREIGN KEY ("exam_regime_id") REFERENCES "public"."exam_regimes"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "jurisdiction_exam_regimes_mapping_key_key"
  ON "public"."jurisdiction_exam_regimes"("mapping_key");
CREATE INDEX "jurisdiction_exam_regimes_jurisdiction_date_idx"
  ON "public"."jurisdiction_exam_regimes"("jurisdiction_id", "effective_from");
CREATE INDEX "jurisdiction_exam_regimes_exam_regime_id_idx"
  ON "public"."jurisdiction_exam_regimes"("exam_regime_id");
CREATE INDEX "jurisdiction_exam_regimes_is_active_idx"
  ON "public"."jurisdiction_exam_regimes"("is_active");

CREATE TABLE "public"."curriculum_subjects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registry_key" TEXT NOT NULL,
  "jurisdiction_id" UUID,
  "exam_regime_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "display_name" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" DATE,
  "effective_until" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curriculum_subjects_jurisdiction_id_fkey"
    FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "curriculum_subjects_exam_regime_id_fkey"
    FOREIGN KEY ("exam_regime_id") REFERENCES "public"."exam_regimes"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "curriculum_subjects_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "curriculum_subjects_registry_key_key"
  ON "public"."curriculum_subjects"("registry_key");
CREATE INDEX "curriculum_subjects_jurisdiction_id_idx"
  ON "public"."curriculum_subjects"("jurisdiction_id");
CREATE INDEX "curriculum_subjects_exam_regime_active_idx"
  ON "public"."curriculum_subjects"("exam_regime_id", "is_active");
CREATE INDEX "curriculum_subjects_subject_id_idx"
  ON "public"."curriculum_subjects"("subject_id");

CREATE TABLE "public"."rule_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rule_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "rule_text" TEXT NOT NULL,
  "explanation" TEXT,
  "buzzwords" JSONB,
  "cloze_template" TEXT,
  "prompt_question" TEXT,
  "application_example" TEXT,
  "common_trap" TEXT,
  "common_traps" JSONB,
  "exam_tip" TEXT,
  "how_to_apply" JSONB,
  "priority" TEXT,
  "publication_status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "change_note" TEXT,
  "effective_from" DATE,
  "effective_until" DATE,
  "created_by" UUID,
  "approved_by" UUID,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_versions_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "rule_versions_rule_version_unique"
  ON "public"."rule_versions"("rule_id", "version_number");
CREATE INDEX "rule_versions_publication_status_idx"
  ON "public"."rule_versions"("publication_status");
CREATE INDEX "rule_versions_effective_dates_idx"
  ON "public"."rule_versions"("effective_from", "effective_until");

CREATE TABLE "public"."rule_applicability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "applicability_key" TEXT NOT NULL,
  "rule_id" UUID NOT NULL,
  "jurisdiction_id" UUID,
  "exam_regime_id" UUID NOT NULL,
  "curriculum_subject_id" UUID,
  "source_package" VARCHAR(50) NOT NULL DEFAULT 'core',
  "is_tested" BOOLEAN NOT NULL DEFAULT true,
  "priority_weight" INTEGER NOT NULL DEFAULT 1,
  "effective_from" DATE,
  "effective_until" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_applicability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_applicability_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "rule_applicability_jurisdiction_id_fkey"
    FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "rule_applicability_exam_regime_id_fkey"
    FOREIGN KEY ("exam_regime_id") REFERENCES "public"."exam_regimes"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "rule_applicability_curriculum_subject_id_fkey"
    FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "rule_applicability_applicability_key_key"
  ON "public"."rule_applicability"("applicability_key");
CREATE INDEX "rule_applicability_rule_id_idx"
  ON "public"."rule_applicability"("rule_id");
CREATE INDEX "rule_applicability_jurisdiction_regime_idx"
  ON "public"."rule_applicability"("jurisdiction_id", "exam_regime_id");
CREATE INDEX "rule_applicability_regime_active_tested_idx"
  ON "public"."rule_applicability"("exam_regime_id", "is_active", "is_tested");
CREATE INDEX "rule_applicability_effective_dates_idx"
  ON "public"."rule_applicability"("effective_from", "effective_until");

CREATE TABLE "public"."rule_import_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "file_name" TEXT NOT NULL,
  "file_format" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "invalid_rows" INTEGER NOT NULL DEFAULT 0,
  "created_rows" INTEGER NOT NULL DEFAULT 0,
  "updated_rows" INTEGER NOT NULL DEFAULT 0,
  "skipped_rows" INTEGER NOT NULL DEFAULT 0,
  "uploaded_by" UUID,
  "published_by" UUID,
  "error_summary" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validated_at" TIMESTAMPTZ(6),
  "published_at" TIMESTAMPTZ(6),
  CONSTRAINT "rule_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rule_import_batches_status_created_idx"
  ON "public"."rule_import_batches"("status", "created_at" DESC);
CREATE INDEX "rule_import_batches_uploaded_by_idx"
  ON "public"."rule_import_batches"("uploaded_by");

CREATE TABLE "public"."rule_import_rows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "external_key" TEXT,
  "action" VARCHAR(20) NOT NULL DEFAULT 'CREATE',
  "validation_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "raw_data" JSONB NOT NULL,
  "normalized_data" JSONB,
  "errors" JSONB,
  "resolved_rule_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_import_rows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rule_import_rows_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "public"."rule_import_batches"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "rule_import_rows_resolved_rule_id_fkey"
    FOREIGN KEY ("resolved_rule_id") REFERENCES "public"."rules"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "rule_import_rows_batch_row_unique"
  ON "public"."rule_import_rows"("batch_id", "row_number");
CREATE INDEX "rule_import_rows_validation_status_idx"
  ON "public"."rule_import_rows"("validation_status");
CREATE INDEX "rule_import_rows_external_key_idx"
  ON "public"."rule_import_rows"("external_key");
CREATE INDEX "rule_import_rows_resolved_rule_id_idx"
  ON "public"."rule_import_rows"("resolved_rule_id");

-- Seed the current baseline registry. Additional jurisdictions and date ranges
-- will be managed through the Rule Registry rather than hardcoded frontend arrays.
INSERT INTO "public"."jurisdictions" ("code", "name", "jurisdiction_type")
VALUES ('UBE', 'UBE / Uniform Current', 'UNIFORM')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "jurisdiction_type" = EXCLUDED."jurisdiction_type",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."exam_regimes" ("code", "name", "description") VALUES
  ('UBE_CURRENT', 'UBE / Uniform Current', 'Current uniform and national-core rule curriculum.'),
  ('NEXTGEN', 'NextGen Bar Exam', 'NextGen exam curriculum.'),
  ('CALIFORNIA_CURRENT', 'California Current', 'California bar examination curriculum.'),
  ('FLORIDA_CURRENT', 'Florida Current', 'Current Florida bar examination curriculum.'),
  ('FLORIDA_NEXTGEN', 'NextGen + Florida Component', 'NextGen curriculum with Florida-specific components.'),
  ('STATE_SPECIFIC', 'State-Specific', 'State-specific non-UBE examination curriculum.'),
  ('TERRITORY_SPECIAL', 'Territory / Special', 'Territorial or special examination curriculum.'),
  ('LOCAL_COMPONENT', 'Local Component', 'Local-law component used alongside a national examination.')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."jurisdiction_exam_regimes" (
  "mapping_key", "jurisdiction_id", "exam_regime_id", "effective_from", "priority"
)
SELECT
  'UBE::UBE_CURRENT::1900-01-01', j."id", e."id", DATE '1900-01-01', 100
FROM "public"."jurisdictions" j
JOIN "public"."exam_regimes" e ON e."code" = 'UBE_CURRENT'
WHERE j."code" = 'UBE'
ON CONFLICT ("mapping_key") DO UPDATE SET
  "jurisdiction_id" = EXCLUDED."jurisdiction_id",
  "exam_regime_id" = EXCLUDED."exam_regime_id",
  "effective_from" = EXCLUDED."effective_from",
  "priority" = EXCLUDED."priority",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

-- Snapshot current published rule content as version 1 without changing rule IDs.
INSERT INTO "public"."rule_versions" (
  "rule_id", "version_number", "title", "rule_text", "explanation", "buzzwords",
  "cloze_template", "prompt_question", "application_example", "common_trap",
  "common_traps", "exam_tip", "how_to_apply", "priority",
  "publication_status", "published_at", "created_at"
)
SELECT
  r."id", 1, r."title", r."rule_text", r."explanation", r."buzzwords",
  r."cloze_template", r."prompt_question", r."application_example", r."common_trap",
  r."common_traps", r."exam_tip", r."how_to_apply", r."priority",
  'PUBLISHED', COALESCE(r."published_at", r."created_at"), r."created_at"
FROM "public"."rules" r
ON CONFLICT ("rule_id", "version_number") DO NOTHING;

-- Register current subjects and rules under the baseline UBE curriculum.
INSERT INTO "public"."curriculum_subjects" (
  "registry_key", "exam_regime_id", "subject_id", "display_name", "weight"
)
SELECT
  'UBE_CURRENT::GLOBAL::' || s."id"::text,
  e."id",
  s."id",
  s."name",
  1
FROM "public"."subjects" s
JOIN "public"."exam_regimes" e ON e."code" = 'UBE_CURRENT'
WHERE EXISTS (
  SELECT 1 FROM "public"."rules" r
  WHERE r."subject_id" = s."id" AND r."is_active" = true
)
ON CONFLICT ("registry_key") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "public"."rule_applicability" (
  "applicability_key", "rule_id", "exam_regime_id", "curriculum_subject_id",
  "source_package", "is_tested", "priority_weight"
)
SELECT
  'UBE_CURRENT::GLOBAL::' || r."id"::text,
  r."id",
  e."id",
  cs."id",
  'core',
  true,
  CASE LOWER(COALESCE(r."priority", 'medium'))
    WHEN 'high' THEN 3
    WHEN 'low' THEN 1
    ELSE 2
  END
FROM "public"."rules" r
JOIN "public"."exam_regimes" e ON e."code" = 'UBE_CURRENT'
LEFT JOIN "public"."curriculum_subjects" cs
  ON cs."registry_key" = 'UBE_CURRENT::GLOBAL::' || r."subject_id"::text
WHERE
  r."is_active" = true
  AND r."rule_type" IS NULL
  AND r."subject_id" IS NOT NULL
  AND COALESCE(BTRIM(r."prompt_question"), '') <> ''
  AND COALESCE(BTRIM(r."rule_text"), '') <> ''
ON CONFLICT ("applicability_key") DO UPDATE SET
  "rule_id" = EXCLUDED."rule_id",
  "exam_regime_id" = EXCLUDED."exam_regime_id",
  "curriculum_subject_id" = EXCLUDED."curriculum_subject_id",
  "source_package" = EXCLUDED."source_package",
  "is_tested" = true,
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

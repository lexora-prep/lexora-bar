-- Lexora Learning System Build 1
-- Additive cycle and coverage tracking. Existing mastery and attempt history is preserved.

CREATE TABLE IF NOT EXISTS public.learning_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_number integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  archived_at timestamptz,
  reset_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_cycles_user_cycle_unique UNIQUE (user_id, cycle_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_cycles_one_active_per_user
  ON public.learning_cycles (user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_learning_cycles_user_status
  ON public.learning_cycles (user_id, status);

CREATE TABLE IF NOT EXISTS public.user_rule_cycle_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  study_exposures integer NOT NULL DEFAULT 0,
  assessed_attempts integer NOT NULL DEFAULT 0,
  passed_assessments integer NOT NULL DEFAULT 0,
  best_assessment_score integer,
  first_studied_at timestamptz,
  last_studied_at timestamptz,
  first_assessed_at timestamptz,
  last_assessed_at timestamptz,
  covered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_rule_cycle_progress_cycle_rule_unique UNIQUE (cycle_id, rule_id),
  CONSTRAINT user_rule_cycle_progress_cycle_fk FOREIGN KEY (cycle_id)
    REFERENCES public.learning_cycles(id) ON DELETE CASCADE,
  CONSTRAINT user_rule_cycle_progress_rule_fk FOREIGN KEY (rule_id)
    REFERENCES public.rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_rule_cycle_progress_user_cycle
  ON public.user_rule_cycle_progress (user_id, cycle_id);

CREATE INDEX IF NOT EXISTS idx_user_rule_cycle_progress_user_rule
  ON public.user_rule_cycle_progress (user_id, rule_id);

CREATE INDEX IF NOT EXISTS idx_user_rule_cycle_progress_cycle_covered
  ON public.user_rule_cycle_progress (cycle_id, covered_at);

-- Backfill one active cycle for existing learners so their prior work remains visible.
INSERT INTO public.learning_cycles (user_id, cycle_number, status, started_at, created_at, updated_at)
SELECT existing.user_id, 1, 'ACTIVE', COALESCE(existing.first_activity, now()), now(), now()
FROM (
  SELECT user_id, MIN(created_at) AS first_activity
  FROM public.user_rule_attempts
  GROUP BY user_id

  UNION

  SELECT user_id, MIN(created_at) AS first_activity
  FROM public.user_rule_progress
  GROUP BY user_id
) AS existing
ON CONFLICT (user_id, cycle_number) DO NOTHING;

-- Prefer the detailed attempt log when it exists.
INSERT INTO public.user_rule_cycle_progress (
  user_id,
  cycle_id,
  rule_id,
  study_exposures,
  assessed_attempts,
  passed_assessments,
  best_assessment_score,
  first_studied_at,
  last_studied_at,
  first_assessed_at,
  last_assessed_at,
  covered_at,
  created_at,
  updated_at
)
SELECT
  attempts.user_id,
  cycles.id,
  attempts.rule_id,
  COUNT(*) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') = 'study'
       OR COALESCE(attempts.revealed_answer, false) = true
       OR COALESCE(attempts.self_reported, false) = true
  )::integer,
  COUNT(*) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') <> 'study'
      AND COALESCE(attempts.revealed_answer, false) = false
      AND COALESCE(attempts.self_reported, false) = false
  )::integer,
  COUNT(*) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') <> 'study'
      AND COALESCE(attempts.revealed_answer, false) = false
      AND COALESCE(attempts.self_reported, false) = false
      AND attempts.score >= 80
  )::integer,
  MAX(attempts.score) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') <> 'study'
      AND COALESCE(attempts.revealed_answer, false) = false
      AND COALESCE(attempts.self_reported, false) = false
  ),
  MIN(attempts.created_at) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') = 'study'
       OR COALESCE(attempts.revealed_answer, false) = true
       OR COALESCE(attempts.self_reported, false) = true
  ),
  MAX(attempts.created_at) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') = 'study'
       OR COALESCE(attempts.revealed_answer, false) = true
       OR COALESCE(attempts.self_reported, false) = true
  ),
  MIN(attempts.created_at) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') <> 'study'
      AND COALESCE(attempts.revealed_answer, false) = false
      AND COALESCE(attempts.self_reported, false) = false
  ),
  MAX(attempts.created_at) FILTER (
    WHERE COALESCE(attempts.training_context, 'quiz') <> 'study'
      AND COALESCE(attempts.revealed_answer, false) = false
      AND COALESCE(attempts.self_reported, false) = false
  ),
  MIN(attempts.created_at),
  COALESCE(MIN(attempts.created_at), now()),
  COALESCE(MAX(attempts.created_at), now())
FROM public.user_rule_attempts AS attempts
JOIN public.learning_cycles AS cycles
  ON cycles.user_id = attempts.user_id
 AND cycles.status = 'ACTIVE'
GROUP BY attempts.user_id, cycles.id, attempts.rule_id
ON CONFLICT (cycle_id, rule_id) DO NOTHING;

-- Fall back to aggregate progress for legacy rows that predate the attempt log.
INSERT INTO public.user_rule_cycle_progress (
  user_id,
  cycle_id,
  rule_id,
  study_exposures,
  assessed_attempts,
  passed_assessments,
  best_assessment_score,
  first_assessed_at,
  last_assessed_at,
  covered_at,
  created_at,
  updated_at
)
SELECT
  progress.user_id,
  cycles.id,
  progress.rule_id,
  0,
  GREATEST(0, progress.attempts),
  GREATEST(0, progress.correct_count),
  progress.last_score,
  COALESCE(progress.created_at, progress.last_reviewed),
  COALESCE(progress.last_reviewed, progress.updated_at),
  COALESCE(progress.last_reviewed, progress.updated_at, progress.created_at),
  progress.created_at,
  progress.updated_at
FROM public.user_rule_progress AS progress
JOIN public.learning_cycles AS cycles
  ON cycles.user_id = progress.user_id
 AND cycles.status = 'ACTIVE'
WHERE progress.attempts > 0
ON CONFLICT (cycle_id, rule_id) DO NOTHING;

-- Correct legacy learning status for rules that have only guided or visible-answer activity.
UPDATE public.user_rule_progress AS progress
SET
  learning_status = 'STUDIED',
  mastery_level = 0,
  mastery_confidence = 0,
  effective_evidence = 0,
  successful_recall_count = 0,
  needs_practice = false,
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.user_rule_attempts AS attempts
  WHERE attempts.user_id = progress.user_id
    AND attempts.rule_id = progress.rule_id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.user_rule_attempts AS attempts
  WHERE attempts.user_id = progress.user_id
    AND attempts.rule_id = progress.rule_id
    AND COALESCE(attempts.training_context, 'quiz') <> 'study'
    AND COALESCE(attempts.revealed_answer, false) = false
    AND COALESCE(attempts.self_reported, false) = false
);

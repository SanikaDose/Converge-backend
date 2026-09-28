-- Default "critical points" on template tasks. When a project is generated,
-- each point becomes an (unchecked) checklist item on the created task.
-- Additive & non-destructive; existing template tasks get an empty array.
-- Idempotent. Local Postgres adds this via synchronize; run once on hosted.
SET search_path TO pmt_converge;

ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS critical_points jsonb NOT NULL DEFAULT '[]'::jsonb;

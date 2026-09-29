-- related_repositories on projects. The Project entity declares this column
-- (jsonb, defaulting to an empty array), but it was never migrated to hosted —
-- local Postgres created it via synchronize. Additive & non-destructive:
-- existing rows get '[]'. Idempotent. Run once on the hosted DB.
SET search_path TO pmt_converge;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS related_repositories jsonb NOT NULL DEFAULT '[]'::jsonb;

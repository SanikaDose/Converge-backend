-- Migration for: multi-owner tasks, phase/task "Not Required", and project "last updated".
-- All three columns are ADDITIVE and non-destructive: existing rows get the
-- defaults, old code ignores the new columns, new code needs them. Safe to run
-- against a live database while the old backend is still serving.
--
-- Run once per database (the local/hosted Postgres AND the production Railway DB,
-- if they are different — see the SD003 login note). synchronize is off, so these
-- are not created automatically.

-- 1. Tasks can have multiple owners. jsonb array, no FK (assigned_to still mirrors [0]).
ALTER TABLE tasks   ADD COLUMN IF NOT EXISTS assignees   jsonb        NOT NULL DEFAULT '[]'::jsonb;

-- 2. A phase can be marked out-of-scope; its tasks then drop out of progress math.
ALTER TABLE phases  ADD COLUMN IF NOT EXISTS not_required boolean      NOT NULL DEFAULT false;

-- 3. When the project (or any of its phases/tasks) was last changed.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- Optional backfill: seed assignees from the existing single owner so pre-migration
-- tasks show their owner immediately (the app also derives this at read time, so
-- this is belt-and-braces, not required).
UPDATE tasks
SET assignees = to_jsonb(ARRAY[assigned_to])
WHERE assigned_to IS NOT NULL
  AND (assignees IS NULL OR assignees = '[]'::jsonb);

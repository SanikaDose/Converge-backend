-- Optional "estimated hours to complete" on misc tasks. Additive &
-- non-destructive; existing rows get NULL (the field is optional). double
-- precision so it reads back as a number, not a numeric string. Idempotent.
-- Local Postgres adds this via synchronize; run once on the hosted DB.
SET search_path TO pmt_converge;

ALTER TABLE misc_tasks
  ADD COLUMN IF NOT EXISTS estimated_hours double precision NULL;

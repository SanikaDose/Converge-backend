-- Start / end dates on misc tasks. Additive & non-destructive; existing rows
-- get NULL (the old `due_date` column is kept as-is for them). Local Postgres
-- adds these via synchronize; run this once on the hosted DB (synchronize off),
-- against the renamed schema.
SET search_path TO pmt_converge;

ALTER TABLE misc_tasks ADD COLUMN IF NOT EXISTS start_date date NULL;
ALTER TABLE misc_tasks ADD COLUMN IF NOT EXISTS end_date   date NULL;

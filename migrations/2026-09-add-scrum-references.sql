-- Generic work-item references (projects / tasks / tickets) on each scrum entry.
-- Additive & non-destructive; existing rows default to an empty array. Stored as
-- jsonb of { type, id, label } — a label snapshot so a reference still reads
-- correctly if the underlying row is later renamed or deleted. Local Postgres
-- adds this via synchronize; run once on the hosted DB (synchronize off).
SET search_path TO pmt_converge;

-- "references" is a reserved word — it must be double-quoted (TypeORM quotes it
-- automatically, which is why local synchronize creates it fine).
ALTER TABLE scrum_entries ADD COLUMN IF NOT EXISTS "references" jsonb NOT NULL DEFAULT '[]'::jsonb;

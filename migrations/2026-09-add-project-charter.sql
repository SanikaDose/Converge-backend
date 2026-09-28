-- Standard Project Charter (sections 02–08) captured at project creation for
-- Solution projects. Stored as one jsonb blob on the project. Additive &
-- non-destructive; existing rows and Products get NULL. Idempotent.
-- Local Postgres adds this via synchronize; run once on the hosted DB.
SET search_path TO pmt_converge;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS charter jsonb NULL;

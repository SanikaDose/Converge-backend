-- Employee lifecycle + scrum participation.
--   status:       'active' | 'inactive' (a leaver is marked inactive, not deleted).
--   scrum_enabled: whether they appear on the daily scrum board.
-- Additive & non-destructive. `scrum_enabled` is left NULLABLE on purpose: the
-- app's boot-time backfill (EmployeesService.onModuleInit, runs regardless of
-- SEED_ON_BOOT) fills every NULL — everyone IN except the sales team + a few
-- named exceptions — and never overrides an admin's later toggle. Local Postgres
-- adds these via synchronize; run this once on the hosted DB (synchronize off).
SET search_path TO pmt_converge;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS status        varchar NOT NULL DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS scrum_enabled boolean NULL;

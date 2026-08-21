-- Adds warranty details to projects (filled once a project is completed):
--   { completionDate, contactPerson, phone, email }
-- Additive and non-destructive; existing projects get NULL. Safe to re-run.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty jsonb;

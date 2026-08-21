-- Adds the Financial Year attribute to projects (e.g. "FY26-27"), chosen at
-- creation. Additive and non-destructive; existing projects get NULL and keep
-- all their data. Safe to run (and re-run) on any database.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS financial_year varchar;

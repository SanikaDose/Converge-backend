-- Daily scrum board — one row per (employee, day). Additive & non-destructive;
-- no FK on employee_id (plain varchar, matches employees.id) so it never blocks
-- a directory edit. The unique (employee_id, date) index is what makes the
-- "Save Updates" upsert idempotent. Local Postgres creates this via synchronize;
-- run it once on the hosted DB (synchronize off), against the renamed schema.
SET search_path TO pmt_converge;

CREATE TABLE IF NOT EXISTS scrum_entries (
  id             uuid PRIMARY KEY,
  employee_id    varchar NOT NULL,
  date           date    NOT NULL,
  work_performed text    NOT NULL DEFAULT '',
  work_mode      varchar NOT NULL DEFAULT 'Office',
  updated_at     timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scrum_employee_date ON scrum_entries(employee_id, date);

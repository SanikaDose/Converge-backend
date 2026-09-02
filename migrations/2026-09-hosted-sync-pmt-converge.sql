-- ============================================================================
--  Hosted DB sync — brings the renamed "pmt_converge" schema up to date with
--  every column/table the current entities expect. Run ONCE on the hosted
--  Postgres (Railway) after pointing the app at it.
--
--  Everything here is ADDITIVE and IDEMPOTENT:
--    - ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS — never drops
--      anything, safe to re-run, and skips columns/tables that already exist.
--    - No existing data is touched except the two backfills at the bottom,
--      which only fill blank values.
--
--  It supersedes the individual 2026-08-*.sql files (it includes all of them)
--  and also adds columns that never had their own migration (tasks.checklist,
--  tickets.action_points, projects.week_off).
--
--  The base tables (teams, employees, projects, phases, tasks, tickets,
--  dashboard_baseline) must already exist in the pmt_converge schema — this
--  only adds what's missing. phase_templates/task_templates are created here
--  if absent; the app seeds their rows on boot.
-- ============================================================================

-- Target the renamed schema for every statement below.
SET search_path TO pmt_converge;

-- ---------------------------------------------------------------- employees
-- Sign-in + contact columns (login is by email now).
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code varchar;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash varchar;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS app_role      varchar;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email         varchar;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number  varchar;

-- ----------------------------------------------------------------- projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at     timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS financial_year varchar;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty       jsonb;
-- Per-project week-off (0=Sun … 6=Sat). Default Sat+Sun for existing rows.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS week_off       integer[] NOT NULL DEFAULT '{0,6}';

-- ------------------------------------------------------------------- phases
ALTER TABLE phases ADD COLUMN IF NOT EXISTS not_required boolean NOT NULL DEFAULT false;

-- -------------------------------------------------------------------- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description    text  NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees      jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist      jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pending_change jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS achievement    jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS history        jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------------ tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description   text  NOT NULL DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS phase         varchar;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignees     jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at   date;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS action_points jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ----------------------------------------------- project template tables
CREATE TABLE IF NOT EXISTS phase_templates (
  id          uuid PRIMARY KEY,
  name        varchar NOT NULL,
  "order"     integer NOT NULL,
  critical    boolean NOT NULL DEFAULT false,
  discipline  varchar NULL
);

CREATE TABLE IF NOT EXISTS task_templates (
  id                 uuid PRIMARY KEY,
  phase_template_id  uuid NOT NULL REFERENCES phase_templates(id) ON DELETE CASCADE,
  name               varchar NOT NULL,
  description        text    NOT NULL DEFAULT '',
  day_offset         integer NOT NULL,
  duration           integer NOT NULL,
  "order"            integer NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_templates_phase ON task_templates(phase_template_id);
-- In case task_templates already existed without the description column:
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- ============================================================================
--  Backfills — fill blanks only, never overwrite existing values.
-- ============================================================================

-- Multi-owner mirrors: seed assignees from the single owner where empty.
UPDATE tasks
   SET assignees = to_jsonb(ARRAY[assigned_to])
 WHERE assigned_to IS NOT NULL AND (assignees IS NULL OR assignees = '[]'::jsonb);

UPDATE tickets
   SET assignees = to_jsonb(ARRAY[assigned_to])
 WHERE assigned_to IS NOT NULL AND (assignees IS NULL OR assignees = '[]'::jsonb);

-- Email = firstname + last-name initial @elansoltech.com (e.g. Sanika Dose ->
-- sanikad@elansoltech.com). Only rows with no email; matches the seeder's rule.
-- (The seeder also does this on boot when SEED_ON_BOOT=true; this makes the
--  hosted DB correct immediately, regardless of seeder timing.)
UPDATE employees
   SET email = lower(
         regexp_replace(split_part(trim(name), ' ', 1), '[^a-zA-Z0-9]', '', 'g')
         || CASE WHEN position(' ' in trim(name)) > 0
                 THEN left(regexp_replace(reverse(split_part(reverse(trim(name)), ' ', 1)), '[^a-zA-Z0-9]', '', 'g'), 1)
                 ELSE '' END
       ) || '@elansoltech.com'
 WHERE email IS NULL OR email = '';

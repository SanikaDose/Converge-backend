-- Miscellaneous Tasks feature — one new standalone table. Additive and
-- non-destructive; references projects/employees softly (SET NULL) and nothing
-- references it. Local Postgres creates it via synchronize; run this on the
-- hosted DB (synchronize off) once. Targets the renamed pmt_converge schema.
SET search_path TO pmt_converge;

CREATE TABLE IF NOT EXISTS misc_tasks (
  id           uuid PRIMARY KEY,
  title        varchar NOT NULL,
  description  text    NOT NULL DEFAULT '',
  project_id   uuid    NULL REFERENCES projects(id)  ON DELETE SET NULL,
  project_name varchar NULL,
  assigned_to  varchar NULL REFERENCES employees(id) ON DELETE SET NULL,
  assignees    jsonb   NOT NULL DEFAULT '[]'::jsonb,
  priority     varchar NOT NULL DEFAULT 'Medium',
  status       varchar NOT NULL DEFAULT 'To Do',
  due_date     date    NULL,
  checklist    jsonb   NOT NULL DEFAULT '[]'::jsonb,
  created_at   date    NOT NULL,
  created_by   varchar NULL,
  updated_at   timestamptz NULL,
  history      jsonb   NOT NULL DEFAULT '[]'::jsonb
);
-- If the table already existed from an earlier run, add the audit column:
ALTER TABLE misc_tasks ADD COLUMN IF NOT EXISTS created_by varchar NULL;

CREATE INDEX IF NOT EXISTS idx_misc_tasks_project ON misc_tasks(project_id);

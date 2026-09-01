-- Template tasks can now carry a default description, copied onto each
-- generated project task. Existing rows default to an empty string.
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

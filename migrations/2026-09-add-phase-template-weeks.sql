-- Per-phase week scheduling for project templates.
-- Adds week_start + duration_weeks to phase_templates and backfills the default
-- "Standard" template's 12 phases with their intended week windows.
-- Run once on hosted (synchronize is off there):
--   psql "host=178.18.243.161 port=5432 user=root dbname=converge sslmode=require" -f 2026-09-add-phase-template-weeks.sql

SET search_path TO pmt_converge;

ALTER TABLE phase_templates ADD COLUMN IF NOT EXISTS week_start    int NOT NULL DEFAULT 1;
ALTER TABLE phase_templates ADD COLUMN IF NOT EXISTS duration_weeks int NOT NULL DEFAULT 1;

-- Backfill the default template's phases (by 0-based order) with the standard plan.
UPDATE phase_templates pt
SET week_start = v.ws, duration_weeks = v.dw
FROM (VALUES
  (0, 1, 1),  -- 01 Project Initialization
  (1, 2, 1),  -- 02 Engineering
  (2, 3, 1),  -- 03 Infrastructure
  (3, 3, 2),  -- 04 Software        (Week 3-4)
  (4, 3, 2),  -- 05 Vision Software (Week 3-4)
  (5, 3, 2),  -- 06 Automation      (Week 3-4)
  (6, 4, 1),  -- 07 FAT
  (7, 5, 1),  -- 08 Dispatch
  (8, 5, 1),  -- 09 Site
  (9, 5, 3),  -- 10 SAT             (Week 5-7)
  (10, 8, 1), -- 11 Handover
  (11, 8, 1)  -- 12 Closure
) AS v(ord, ws, dw)
WHERE pt."order" = v.ord
  AND pt.template_id = (SELECT id FROM project_templates WHERE is_default = true LIMIT 1);

-- Every other template: derive each phase's week window from its tasks' existing
-- day offsets (5 working days/week), so their schedules aren't collapsed to Week 1.
UPDATE phase_templates pt
SET week_start    = GREATEST(1, (agg.min_off / 5) + 1),
    duration_weeks = GREATEST(1, CEIL((agg.max_end - agg.min_off)::numeric / 5)::int)
FROM (
  SELECT phase_template_id, MIN(day_offset) AS min_off, MAX(day_offset + duration) AS max_end
  FROM task_templates GROUP BY phase_template_id
) agg
WHERE pt.id = agg.phase_template_id
  AND pt.template_id <> (SELECT id FROM project_templates WHERE is_default = true LIMIT 1);

-- NOTE on task_templates.day_offset: it is now interpreted as "day from the
-- phase's week start" (working days), not from the project start. No bulk
-- rewrite is applied here: the live template rows already hold small, phase-
-- local values (authored while the previous "tasks span the phase window"
-- model ignored them), which are valid as-is under the per-task model. Fresh
-- seeds come from the in-code TEMPLATE, which is already phase-relative.
-- Admins tune per-task Day/Duration from /template going forward.

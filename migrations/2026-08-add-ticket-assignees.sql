-- Multi-assignee tickets: assignees jsonb array (mirrors tasks.assignees).
-- Additive; existing tickets get [] and are backfilled from assigned_to.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignees jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE tickets
SET assignees = to_jsonb(ARRAY[assigned_to])
WHERE assigned_to IS NOT NULL AND (assignees IS NULL OR assignees = '[]'::jsonb);

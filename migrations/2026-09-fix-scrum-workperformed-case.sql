-- Corrective migration. 2026-09-add-scrum-entries.sql created the column as
-- snake_case work_performed, but the ScrumEntry entity's `workPerformed`
-- property has no name override, so TypeORM quotes it as the camelCase
-- "workPerformed" (which is what local synchronize creates). Rename it on hosted
-- so queries stop failing. Guarded/idempotent: only renames when the snake_case
-- column exists and the camelCase one does not. Safe — scrum_entries had no rows.
SET search_path TO pmt_converge;

DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'pmt_converge' AND table_name = 'scrum_entries'
           AND column_name = 'work_performed'
      )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'pmt_converge' AND table_name = 'scrum_entries'
           AND column_name = 'workPerformed'
      )
  THEN
    ALTER TABLE scrum_entries RENAME COLUMN work_performed TO "workPerformed";
  END IF;
END $$;

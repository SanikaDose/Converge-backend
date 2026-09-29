-- Multiple named project templates. Introduces a `project_templates` table and
-- links each phase_template to one via `template_id`. Additive & non-destructive.
-- The app (ProjectTemplatesService.ensureSeeded, runs on every boot) creates the
-- default "Standard" template if none exists and backfills every existing phase
-- onto it, so this migration only needs to create the table + column empty.
-- Idempotent. Run once on the hosted DB (synchronize off).
SET search_path TO pmt_converge;

CREATE TABLE IF NOT EXISTS project_templates (
  id           uuid PRIMARY KEY,
  name         varchar NOT NULL,
  description  text NOT NULL DEFAULT '',
  is_default   boolean NOT NULL DEFAULT false,
  "order"      int NOT NULL DEFAULT 0,
  created_at   date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE phase_templates
  ADD COLUMN IF NOT EXISTS template_id uuid NULL;

-- FK is optional but keeps cascade-delete consistent with the entity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'pmt_converge' AND constraint_name = 'fk_phase_templates_template'
  ) THEN
    ALTER TABLE phase_templates
      ADD CONSTRAINT fk_phase_templates_template
      FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

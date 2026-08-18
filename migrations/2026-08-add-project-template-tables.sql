-- Migration for the DB-driven project template (Option 2).
-- Two new tables that hold the master phases + their default tasks. New
-- projects are generated from these; admins edit the tasks via the app.
--
-- These are ADDITIVE and empty. On first boot the app seeds them from the
-- in-code TEMPLATE (ProjectTemplatesService.onModuleInit, which runs
-- regardless of SEED_ON_BOOT because the template is essential data), so you
-- do NOT need to insert any rows here — just create the tables.
--
-- Run once per database (local Postgres has these already via synchronize;
-- this file is for the hosted Railway DB where synchronize is off).

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
  day_offset         integer NOT NULL,
  duration           integer NOT NULL,
  "order"            integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_templates_phase ON task_templates(phase_template_id);

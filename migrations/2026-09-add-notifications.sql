-- Stored per-user notification events (misc-task assigned / completed) that the
-- bell feed merges with its derived items. Additive & non-destructive; no FKs
-- (user_id is a plain employee id, so a notification never blocks a directory
-- edit). Local Postgres creates it via synchronize; run this on the hosted DB
-- (synchronize off) once. Targets the renamed pmt_converge schema.
SET search_path TO pmt_converge;

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY,
  user_id    varchar NOT NULL,
  kind       varchar NOT NULL,
  title      varchar NOT NULL,
  context    varchar NOT NULL,
  link       varchar NULL,
  ref_id     varchar NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The feed queries by recipient, newest first.
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

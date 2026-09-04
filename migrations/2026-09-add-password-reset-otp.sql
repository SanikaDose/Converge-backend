-- Forgot-password email OTP columns on employees. Additive & non-destructive;
-- existing rows get NULL / 0. Local Postgres adds these via synchronize; run
-- this once on the hosted DB (synchronize off), against the renamed schema.
SET search_path TO pmt_converge;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_otp_hash       varchar NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_otp_expires_at timestamptz NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_otp_attempts   integer NOT NULL DEFAULT 0;

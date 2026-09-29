-- "Resolved" was removed as a ticket status — "Closed" is now the only
-- completion state. Convert any existing Resolved tickets to Closed, keeping
-- their completion date (resolved_at) or stamping today if it's missing.
-- Idempotent: re-running finds nothing once converted. Run once on the hosted DB.
SET search_path TO pmt_converge;

UPDATE tickets
   SET status = 'Closed',
       resolved_at = COALESCE(resolved_at, CURRENT_DATE)
 WHERE status = 'Resolved';

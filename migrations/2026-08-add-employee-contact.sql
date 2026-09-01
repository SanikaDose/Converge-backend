-- The notifications feature added email + phone_number to the Employee entity,
-- but no migration created the columns — so GET /employees 500s on any DB with
-- synchronize off (which empties the org directory and shows every project lead
-- as "Unassigned"). Additive and non-destructive; existing rows get NULL.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email        varchar;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number varchar;

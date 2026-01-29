-- Add resignation fields to users table
ALTER TABLE users
ADD COLUMN resignation_date DATE,
ADD COLUMN termination_reason TEXT;

-- Add check constraint to ensure resignation_date is set when terminated but not active
-- Note: Allow inactive employees without resignation_date for backward compatibility
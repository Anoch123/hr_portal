-- Add probation fields to users table
ALTER TABLE users
ADD COLUMN is_on_probation BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN probation_start_date DATE,
ADD COLUMN probation_period_months INTEGER NOT NULL DEFAULT 6;

-- Add check constraint to ensure probation_period_months is positive
ALTER TABLE users
ADD CONSTRAINT probation_period_positive
CHECK (probation_period_months > 0);

-- Add check constraint for probation dates
ALTER TABLE users
ADD CONSTRAINT probation_dates_check
CHECK (
  (is_on_probation = false AND probation_start_date IS NULL) OR
  (is_on_probation = true AND probation_start_date IS NOT NULL)
);
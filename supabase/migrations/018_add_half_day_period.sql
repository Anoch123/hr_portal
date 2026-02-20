-- Add half_day_period column for storing Morning/Evening half day selection
-- This provides a cleaner way to store the half day period instead of inferring from time

DO $$
BEGIN
  -- Drop existing check constraint if it exists
  ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_half_day_period_check;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'half_day_period') THEN
    ALTER TABLE leave_requests ADD COLUMN half_day_period VARCHAR(20);
  END IF;
  
  -- Add check constraint to only allow MORNING or EVENING values
  ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_half_day_period_check 
    CHECK (half_day_period IS NULL OR half_day_period IN ('MORNING', 'EVENING'));
END $$;

-- Add comment describing the field
COMMENT ON COLUMN leave_requests.half_day_period IS 'Half day period: MORNING or EVENING';

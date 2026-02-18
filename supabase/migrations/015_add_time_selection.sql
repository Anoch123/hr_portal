-- Add time selection fields for half day and short leave requests
-- start_time and end_time: Used for both half day and short leave to specify exact time range

-- Add columns only if they don't exist (idempotent migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'start_time') THEN
    ALTER TABLE leave_requests ADD COLUMN start_time TIME;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'end_time') THEN
    ALTER TABLE leave_requests ADD COLUMN end_time TIME;
  END IF;
END $$;

-- Add comment describing the fields
COMMENT ON COLUMN leave_requests.start_time IS 'Start time for half day and short leave requests';
COMMENT ON COLUMN leave_requests.end_time IS 'End time for half day and short leave requests';

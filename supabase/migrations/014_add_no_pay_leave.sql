-- Add is_no_pay column to leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_no_pay BOOLEAN NOT NULL DEFAULT false;

-- Add comment to describe the column
COMMENT ON COLUMN leave_requests.is_no_pay IS 'Indicates if this leave request is without pay (when leave balance is exhausted)';

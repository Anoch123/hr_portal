-- Add leave_mode column to leave_requests table
ALTER TABLE leave_requests
ADD COLUMN leave_mode TEXT NOT NULL DEFAULT 'FULL' CHECK (leave_mode IN ('FULL', 'HALF', 'SHORT'));
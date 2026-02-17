-- Add employee-specific fields to users table
ALTER TABLE users
ADD COLUMN nic_no TEXT,
ADD COLUMN joining_date DATE,
ADD COLUMN employee_no TEXT;

-- Add unique constraint on employee_no if needed
-- ALTER TABLE users ADD CONSTRAINT users_employee_no_unique UNIQUE (employee_no);EST. 2026
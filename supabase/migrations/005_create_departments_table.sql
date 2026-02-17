-- Create departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add department_id column to users table
ALTER TABLE users
ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_users_department_id ON users(department_id);

-- Enable RLS on departments table
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for departments
CREATE POLICY "Departments are viewable by authenticated users" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Departments are manageable by admins and hr managers" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

-- Insert some default departments
INSERT INTO departments (name, description) VALUES
  ('Human Resources', 'Human Resources Department'),
  ('Engineering', 'Software Development and Engineering'),
  ('Marketing', 'Marketing and Sales Department'),
  ('Finance', 'Finance and Accounting Department'),
  ('Operations', 'Operations and Administration');

-- Update existing users to link to departments based on department text field
-- This will match existing department names to the new departments table
UPDATE users
SET department_id = departments.id
FROM departments
WHERE LOWER(users.department) = LOWER(departments.name)
AND users.department IS NOT NULL
AND users.department != '';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
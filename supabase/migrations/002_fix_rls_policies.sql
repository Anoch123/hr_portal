-- Fix RLS policies to avoid infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Users can view their team members" ON users;
DROP POLICY IF EXISTS "Managers can view team leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Managers can view team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can update team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can view team leave history" ON leave_history;
DROP POLICY IF EXISTS "Users can insert leave history" ON leave_history;
DROP POLICY IF EXISTS "Admin can manage leave types" ON leave_types;
DROP POLICY IF EXISTS "Admin can manage leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Admin can manage leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admin can manage leave history" ON leave_history;
DROP POLICY IF EXISTS "Admin can manage email logs" ON email_logs;
DROP POLICY IF EXISTS "Admin can manage file uploads" ON file_uploads;

-- Add policy for users to view their team members
CREATE POLICY "Users can view their team members" ON users
  FOR SELECT USING (manager_id = auth.uid());

-- Recreate admin policy using JWT role
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can update all users" ON users
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can insert users" ON users
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can delete users" ON users
  FOR DELETE USING (auth.jwt() ->> 'role' = 'ADMIN');

-- Recreate manager policies using JWT role
CREATE POLICY "Managers can view team leave balances" ON leave_balances
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('ADMIN', 'HR_MANAGER', 'MANAGER') OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view team leave requests" ON leave_requests
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('ADMIN', 'HR_MANAGER', 'MANAGER') OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team leave requests" ON leave_requests
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('ADMIN', 'HR_MANAGER', 'MANAGER') OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leave history" ON leave_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers can view team leave history" ON leave_history
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('ADMIN', 'HR_MANAGER', 'MANAGER') OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

-- Add admin policies for other tables
CREATE POLICY "Admin can manage leave types" ON leave_types
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can manage leave balances" ON leave_balances
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can manage leave requests" ON leave_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can manage leave history" ON leave_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can manage email logs" ON email_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Admin can manage file uploads" ON file_uploads
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
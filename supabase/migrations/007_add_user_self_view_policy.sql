-- Allow users to view their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Also allow users to update their own record (for password changes, etc.)
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);
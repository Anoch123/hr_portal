-- Update RLS policies for leave_types to respect permissions
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Public can view leave types" ON leave_types;

-- Create new policy for SELECT that checks permissions
CREATE POLICY "Users can view leave types based on permissions" ON leave_types
  FOR SELECT USING (
    is_active = true AND (
      -- Admins can always view
      auth.jwt() ->> 'role' = 'ADMIN' OR
      -- Check if user's role has leave_types:read or leave_requests:create permission
      EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = auth.jwt() ->> 'role'
        AND p.name IN ('leave_types:read', 'leave_requests:create')
      )
    )
  );

-- Keep the admin policy for management operations
CREATE POLICY "Admin can manage leave types" ON leave_types
  FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
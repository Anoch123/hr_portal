-- Create privacy_policy table
CREATE TABLE privacy_policy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE privacy_policy ENABLE ROW LEVEL SECURITY;

-- RLS policies for privacy_policy
-- All authenticated users can view active privacy policies
CREATE POLICY "Privacy policies are viewable by authenticated users" ON privacy_policy
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only ADMIN and HR_MANAGER can create/update/delete privacy policies
CREATE POLICY "Privacy policies are manageable by admins and hr managers" ON privacy_policy
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

-- Add privacy_policy permissions
INSERT INTO permissions (name, description, module, action) VALUES
  ('privacy_policy:read', 'View privacy policy', 'privacy_policy', 'read'),
  ('privacy_policy:create', 'Create privacy policy', 'privacy_policy', 'create'),
  ('privacy_policy:update', 'Update privacy policy', 'privacy_policy', 'update'),
  ('privacy_policy:delete', 'Delete privacy policy', 'privacy_policy', 'delete');

-- Assign permissions to roles
-- ADMIN gets all privacy policy permissions
INSERT INTO role_permissions (role, permission_id) VALUES
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'privacy_policy:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'privacy_policy:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'privacy_policy:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'privacy_policy:delete'));

-- HR_MANAGER gets all privacy policy permissions
INSERT INTO role_permissions (role, permission_id) VALUES
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'privacy_policy:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'privacy_policy:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'privacy_policy:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'privacy_policy:delete'));

-- MANAGER can only read
INSERT INTO role_permissions (role, permission_id) VALUES
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'privacy_policy:read'));

-- EMPLOYEE can only read
INSERT INTO role_permissions (role, permission_id) VALUES
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'privacy_policy:read'));

-- Create trigger for updated_at
CREATE TRIGGER update_privacy_policy_updated_at
  BEFORE UPDATE ON privacy_policy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

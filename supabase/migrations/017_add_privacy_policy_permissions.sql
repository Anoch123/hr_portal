-- Add privacy policy permissions
-- This migration adds permissions for the privacy policy module

-- Insert privacy policy permissions
INSERT INTO permissions (name, description, module, action) VALUES
  ('privacy_policy:read', 'Can view privacy policies', 'privacy_policy', 'read'),
  ('privacy_policy:create', 'Can create new privacy policies', 'privacy_policy', 'create'),
  ('privacy_policy:update', 'Can update existing privacy policies', 'privacy_policy', 'update'),
  ('privacy_policy:delete', 'Can delete privacy policies', 'privacy_policy', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Assign privacy policy permissions to ADMIN role
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions WHERE name IN (
  'privacy_policy:read',
  'privacy_policy:create',
  'privacy_policy:update',
  'privacy_policy:delete'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign privacy policy permissions to HR_MANAGER role
INSERT INTO role_permissions (role, permission_id)
SELECT 'HR_MANAGER', id FROM permissions WHERE name IN (
  'privacy_policy:read',
  'privacy_policy:create',
  'privacy_policy:update',
  'privacy_policy:delete'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign read-only privacy policy permission to MANAGER role
INSERT INTO role_permissions (role, permission_id)
SELECT 'MANAGER', id FROM permissions WHERE name = 'privacy_policy:read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign read-only privacy policy permission to EMPLOYEE role
INSERT INTO role_permissions (role, permission_id)
SELECT 'EMPLOYEE', id FROM permissions WHERE name = 'privacy_policy:read'
ON CONFLICT (role, permission_id) DO NOTHING;

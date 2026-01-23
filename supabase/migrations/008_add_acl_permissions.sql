-- Add permissions for navigation and ACL management (ignore if already exist)
INSERT INTO permissions (name, description, module, action) VALUES
  ('dashboard:read', 'Access dashboard', 'dashboard', 'read'),
  ('permissions:read', 'View permissions', 'permissions', 'read'),
  ('permissions:create', 'Create permissions', 'permissions', 'create'),
  ('permissions:update', 'Update permissions', 'permissions', 'update'),
  ('permissions:delete', 'Delete permissions', 'permissions', 'delete'),
  ('role_permissions:read', 'View role permissions', 'role_permissions', 'read'),
  ('role_permissions:update', 'Update role permissions', 'role_permissions', 'update')
ON CONFLICT (name) DO NOTHING;

-- Assign dashboard access to all roles (ignore if already assigned)
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions WHERE name = 'dashboard:read'
UNION ALL
SELECT 'HR_MANAGER', id FROM permissions WHERE name = 'dashboard:read'
UNION ALL
SELECT 'MANAGER', id FROM permissions WHERE name = 'dashboard:read'
UNION ALL
SELECT 'EMPLOYEE', id FROM permissions WHERE name = 'dashboard:read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign ACL permissions to ADMIN (ignore if already assigned)
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions WHERE name IN ('permissions:read', 'permissions:create', 'permissions:update', 'permissions:delete', 'role_permissions:read', 'role_permissions:update')
ON CONFLICT (role, permission_id) DO NOTHING;
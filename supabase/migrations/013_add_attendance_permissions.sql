-- Insert attendance permissions into the permissions table
INSERT INTO permissions (name, description, module, action, is_active) VALUES
('attendance:read', 'View attendance records', 'attendance', 'read', true),
('attendance:create', 'Create attendance records', 'attendance', 'create', true),
('attendance:update', 'Update attendance records', 'attendance', 'update', true),
('attendance:delete', 'Delete attendance records', 'attendance', 'delete', true),
('attendance:upload', 'Upload fingerprint attendance data', 'attendance', 'upload', true)
ON CONFLICT (name) DO NOTHING;

-- Assign all attendance permissions to ADMIN role
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions WHERE name LIKE 'attendance:%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign all attendance permissions to HR_MANAGER role
INSERT INTO role_permissions (role, permission_id)
SELECT 'HR_MANAGER', id FROM permissions WHERE name LIKE 'attendance:%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign read permission to MANAGER role
INSERT INTO role_permissions (role, permission_id)
SELECT 'MANAGER', id FROM permissions WHERE name = 'attendance:read'
ON CONFLICT (role, permission_id) DO NOTHING;

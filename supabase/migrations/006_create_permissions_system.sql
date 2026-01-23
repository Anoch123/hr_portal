-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- e.g., 'employees', 'departments', 'leave_types'
  action TEXT NOT NULL, -- e.g., 'read', 'create', 'update', 'delete'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')),
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions (only admins can manage)
CREATE POLICY "Permissions are viewable by authenticated users" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permissions are manageable by admins only" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Role permissions are viewable by authenticated users" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Role permissions are manageable by admins only" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
  -- Employees
  ('employees:read', 'View employee information', 'employees', 'read'),
  ('employees:create', 'Create new employees', 'employees', 'create'),
  ('employees:update', 'Update employee information', 'employees', 'update'),
  ('employees:delete', 'Delete employees', 'employees', 'delete'),

  -- Departments
  ('departments:read', 'View department information', 'departments', 'read'),
  ('departments:create', 'Create new departments', 'departments', 'create'),
  ('departments:update', 'Update department information', 'departments', 'update'),
  ('departments:delete', 'Delete departments', 'departments', 'delete'),

  -- Leave Types
  ('leave_types:read', 'View leave types', 'leave_types', 'read'),
  ('leave_types:create', 'Create leave types', 'leave_types', 'create'),
  ('leave_types:update', 'Update leave types', 'leave_types', 'update'),
  ('leave_types:delete', 'Delete leave types', 'leave_types', 'delete'),

  -- Leave Requests
  ('leave_requests:read', 'View leave requests', 'leave_requests', 'read'),
  ('leave_requests:create', 'Create leave requests', 'leave_requests', 'create'),
  ('leave_requests:update', 'Update leave requests', 'leave_requests', 'update'),
  ('leave_requests:delete', 'Delete leave requests', 'leave_requests', 'delete'),
  ('leave_requests:approve', 'Approve leave requests', 'leave_requests', 'approve'),
  ('leave_requests:reject', 'Reject leave requests', 'leave_requests', 'reject'),

  -- Leave Balances
  ('leave_balances:read', 'View leave balances', 'leave_balances', 'read'),
  ('leave_balances:update', 'Update leave balances', 'leave_balances', 'update'),

  -- Leave History
  ('leave_history:read', 'View leave history', 'leave_history', 'read'),

  -- Reports
  ('reports:read', 'View reports', 'reports', 'read'),

  -- Settings
  ('settings:read', 'View settings', 'settings', 'read'),
  ('settings:update', 'Update settings', 'settings', 'update');

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id) VALUES
  -- ADMIN gets all permissions
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_balances:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'reports:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'settings:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'settings:update')),

  -- HR_MANAGER permissions
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:delete')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'reports:read')),

  -- MANAGER permissions
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'reports:read')),

  -- EMPLOYEE permissions
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_history:read'));

-- Create trigger for updated_at-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- e.g., 'employees', 'departments', 'leave_types'
  action TEXT NOT NULL, -- e.g., 'read', 'create', 'update', 'delete'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')),
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions (only admins can manage)
CREATE POLICY "Permissions are viewable by authenticated users" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permissions are manageable by admins only" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Role permissions are viewable by authenticated users" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Role permissions are manageable by admins only" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
  -- Employees
  ('employees:read', 'View employee information', 'employees', 'read'),
  ('employees:create', 'Create new employees', 'employees', 'create'),
  ('employees:update', 'Update employee information', 'employees', 'update'),
  ('employees:delete', 'Delete employees', 'employees', 'delete'),

  -- Departments
  ('departments:read', 'View department information', 'departments', 'read'),
  ('departments:create', 'Create new departments', 'departments', 'create'),
  ('departments:update', 'Update department information', 'departments', 'update'),
  ('departments:delete', 'Delete departments', 'departments', 'delete'),

  -- Leave Types
  ('leave_types:read', 'View leave types', 'leave_types', 'read'),
  ('leave_types:create', 'Create leave types', 'leave_types', 'create'),
  ('leave_types:update', 'Update leave types', 'leave_types', 'update'),
  ('leave_types:delete', 'Delete leave types', 'leave_types', 'delete'),

  -- Leave Requests
  ('leave_requests:read', 'View leave requests', 'leave_requests', 'read'),
  ('leave_requests:create', 'Create leave requests', 'leave_requests', 'create'),
  ('leave_requests:update', 'Update leave requests', 'leave_requests', 'update'),
  ('leave_requests:delete', 'Delete leave requests', 'leave_requests', 'delete'),
  ('leave_requests:approve', 'Approve leave requests', 'leave_requests', 'approve'),
  ('leave_requests:reject', 'Reject leave requests', 'leave_requests', 'reject'),

  -- Leave Balances
  ('leave_balances:read', 'View leave balances', 'leave_balances', 'read'),
  ('leave_balances:update', 'Update leave balances', 'leave_balances', 'update'),

  -- Leave History
  ('leave_history:read', 'View leave history', 'leave_history', 'read'),

  -- Reports
  ('reports:read', 'View reports', 'reports', 'read'),

  -- Settings
  ('settings:read', 'View settings', 'settings', 'read'),
  ('settings:update', 'Update settings', 'settings', 'update');

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id) VALUES
  -- ADMIN gets all permissions
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'employees:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'departments:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_types:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:delete')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_balances:update')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'reports:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'settings:read')),
  ('ADMIN', (SELECT id FROM permissions WHERE name = 'settings:update')),

  -- HR_MANAGER permissions
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'employees:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'departments:delete')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:update')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('HR_MANAGER', (SELECT id FROM permissions WHERE name = 'reports:read')),

  -- MANAGER permissions
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'employees:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:approve')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_requests:reject')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'leave_history:read')),
  ('MANAGER', (SELECT id FROM permissions WHERE name = 'reports:read')),

  -- EMPLOYEE permissions
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_types:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_requests:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_requests:create')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_balances:read')),
  ('EMPLOYEE', (SELECT id FROM permissions WHERE name = 'leave_history:read'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
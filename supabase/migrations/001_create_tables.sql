-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')),
  department TEXT,
  position TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Leave Types table
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  max_consecutive_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Leave Balances table
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days FLOAT NOT NULL DEFAULT 0,
  used_days FLOAT NOT NULL DEFAULT 0,
  pending_days FLOAT NOT NULL DEFAULT 0,
  carried_over FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, leave_type_id, year)
);

-- Leave Requests table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days FLOAT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Leave History table (audit trail)
CREATE TABLE leave_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'APPROVED', 'REJECTED', 'CANCELLED', 'MODIFIED')),
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Email Logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- File Uploads table (for Supabase Storage tracking)
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  bucket_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX idx_leave_history_user_id ON leave_history(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for leave_types table
CREATE POLICY "Public can view leave types" ON leave_types
  FOR SELECT USING (is_active = true);

-- RLS Policies for leave_balances table
CREATE POLICY "Users can view their own leave balances" ON leave_balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team leave balances" ON leave_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER', 'MANAGER')
    ) OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

-- RLS Policies for leave_requests table
CREATE POLICY "Users can view their own leave requests" ON leave_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team leave requests" ON leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER', 'MANAGER')
    ) OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending requests" ON leave_requests
  FOR UPDATE USING (user_id = auth.uid() AND status = 'PENDING');

-- RLS Policies for leave_history table
CREATE POLICY "Users can view their own leave history" ON leave_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team leave history" ON leave_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER', 'MANAGER')
    ) OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

-- RLS Policies for file_uploads table
CREATE POLICY "Users can view their own file uploads" ON file_uploads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own file uploads" ON file_uploads
  FOR INSERT WITH CHECK (user_id = auth.uid());

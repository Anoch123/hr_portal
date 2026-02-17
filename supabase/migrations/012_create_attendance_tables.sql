-- Attendance table for fingerprint attendance tracking
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE')),
  working_hours FLOAT,
  overtime_hours FLOAT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'FINGERPRINT', 'SYSTEM')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Attendance summary table for monthly reports
CREATE TABLE attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  half_days INTEGER NOT NULL DEFAULT 0,
  leave_days INTEGER NOT NULL DEFAULT 0,
  working_hours_total FLOAT DEFAULT 0,
  overtime_hours_total FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Create indexes for better performance
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_summary_user_id ON attendance_summary(user_id);
CREATE INDEX idx_attendance_summary_month_year ON attendance_summary(year, month);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance table
CREATE POLICY "Users can view their own attendance" ON attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER', 'MANAGER')
    ) OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin and HR can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

CREATE POLICY "Admin and HR can insert attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

CREATE POLICY "Admin and HR can update attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

CREATE POLICY "Admin and HR can delete attendance" ON attendance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

-- RLS Policies for attendance_summary table
CREATE POLICY "Users can view their own attendance summary" ON attendance_summary
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team attendance summary" ON attendance_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER', 'MANAGER')
    ) OR
    user_id IN (
      SELECT id FROM users WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin and HR can view all attendance summary" ON attendance_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

CREATE POLICY "Admin and HR can insert attendance summary" ON attendance_summary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

CREATE POLICY "Admin and HR can update attendance summary" ON attendance_summary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u1 
      WHERE u1.id = auth.uid() AND u1.role IN ('ADMIN', 'HR_MANAGER')
    )
  );

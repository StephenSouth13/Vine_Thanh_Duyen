# Supabase Complete Setup Guide

This guide contains all SQL commands needed to set up the Vine application database from scratch.

## Prerequisites
- Supabase project created
- You have access to the SQL editor in Supabase dashboard

## Setup Instructions

### Step 1: Enable Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Step 2: Create Enum Types
```sql
CREATE TYPE app_role AS ENUM ('admin', 'leader', 'staff');
CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'personal', 'unpaid');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE attendance_type AS ENUM ('check_in', 'check_out');
```

### Step 3: Create Tables

#### Teams Table
```sql
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Shifts Table
```sql
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### User Roles Table
```sql
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);
```

#### Profiles Table
```sql
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    cv_url TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    phone TEXT,
    date_of_birth DATE,
    annual_leave_balance INTEGER DEFAULT 12,
    last_online TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Attendance Table
```sql
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type attendance_type NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tasks Table
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Task Columns Table (for dynamic board columns)
```sql
CREATE TABLE IF NOT EXISTS task_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    position INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, created_by)
);
```

#### Task Comments Table
```sql
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Meeting Rooms Table
```sql
CREATE TABLE IF NOT EXISTS meeting_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER NOT NULL DEFAULT 1,
    equipment TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Room Bookings Table
```sql
CREATE TABLE IF NOT EXISTS room_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    attendees UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Leave Requests Table
```sql
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status leave_status NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Audit Logs Table
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Step 4: Enable Row Level Security (RLS)

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Step 5: Create Helper Functions

#### Check User Role Function
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### Get User's Team Function
```sql
CREATE OR REPLACE FUNCTION public.get_user_team(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = _user_id
$$;
```

#### Updated At Trigger Function
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### New User Handler Function
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;
```

### Step 6: Create Triggers

#### New User Signup Trigger
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Updated At Triggers
```sql
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_columns_updated_at ON task_columns;
CREATE TRIGGER update_task_columns_updated_at BEFORE UPDATE ON task_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_rooms_updated_at ON meeting_rooms;
CREATE TRIGGER update_meeting_rooms_updated_at BEFORE UPDATE ON meeting_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_bookings_updated_at ON room_bookings;
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON room_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 7: Set Up RLS Policies

#### Teams Policies
```sql
DROP POLICY IF EXISTS "Everyone can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;

CREATE POLICY "Everyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage teams" ON teams FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### Shifts Policies
```sql
DROP POLICY IF EXISTS "Everyone can view shifts" ON shifts;
DROP POLICY IF EXISTS "Admins can manage shifts" ON shifts;

CREATE POLICY "Everyone can view shifts" ON shifts FOR SELECT USING (true);
CREATE POLICY "Admins can manage shifts" ON shifts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### User Roles Policies
```sql
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

CREATE POLICY "Users can view their own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### Profiles Policies
```sql
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Leaders can view team profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Leaders can view team profiles" ON profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'leader') AND team_id = public.get_user_team(auth.uid())
);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### Attendance Policies
```sql
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Leaders can view team attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create their own attendance" ON attendance;

CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view team attendance" ON attendance FOR SELECT USING (
  public.has_role(auth.uid(), 'leader') AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND team_id = public.get_user_team(auth.uid()))
);
CREATE POLICY "Admins can view all attendance" ON attendance FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Tasks Policies
```sql
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Leaders can view team tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete any tasks" ON tasks;

CREATE POLICY "Users can view assigned tasks" ON tasks FOR SELECT USING (
  auth.uid() = assignee_id OR auth.uid() = creator_id
);
CREATE POLICY "Leaders can view team tasks" ON tasks FOR SELECT USING (
  public.has_role(auth.uid(), 'leader') AND team_id = public.get_user_team(auth.uid())
);
CREATE POLICY "Admins can view all tasks" ON tasks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their tasks" ON tasks FOR UPDATE USING (
  auth.uid() = assignee_id OR auth.uid() = creator_id OR 
  public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Admins can delete any tasks" ON tasks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
```

#### Task Columns Policies
```sql
DROP POLICY IF EXISTS "Users can view their own columns" ON task_columns;
DROP POLICY IF EXISTS "Admins can view all columns" ON task_columns;
DROP POLICY IF EXISTS "Users can create columns" ON task_columns;
DROP POLICY IF EXISTS "Users can update their own columns" ON task_columns;
DROP POLICY IF EXISTS "Users can delete their own columns" ON task_columns;

CREATE POLICY "Users can view their own columns" ON task_columns FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all columns" ON task_columns FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create columns" ON task_columns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own columns" ON task_columns FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own columns" ON task_columns FOR DELETE USING (auth.uid() = created_by);
```

#### Task Comments Policies
```sql
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments" ON task_comments;

CREATE POLICY "Users can view comments on their tasks" ON task_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE id = task_id AND (assignee_id = auth.uid() OR creator_id = auth.uid())
  )
);
CREATE POLICY "Users can create comments" ON task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Meeting Rooms Policies
```sql
DROP POLICY IF EXISTS "Everyone can view active meeting rooms" ON meeting_rooms;
DROP POLICY IF EXISTS "Admins can manage meeting rooms" ON meeting_rooms;

CREATE POLICY "Everyone can view active meeting rooms" ON meeting_rooms FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage meeting rooms" ON meeting_rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### Room Bookings Policies
```sql
DROP POLICY IF EXISTS "Users can view their own bookings" ON room_bookings;
DROP POLICY IF EXISTS "Leaders can view team bookings" ON room_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON room_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON room_bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON room_bookings;
DROP POLICY IF EXISTS "Leaders and admins can update bookings" ON room_bookings;

CREATE POLICY "Users can view their own bookings" ON room_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view team bookings" ON room_bookings FOR SELECT USING (
  public.has_role(auth.uid(), 'leader') AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND team_id = public.get_user_team(auth.uid()))
);
CREATE POLICY "Admins can view all bookings" ON room_bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create bookings" ON room_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON room_bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Leaders and admins can update bookings" ON room_bookings FOR UPDATE USING (
  public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')
);
```

#### Leave Requests Policies
```sql
DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Leaders can view team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update their pending requests" ON leave_requests;
DROP POLICY IF EXISTS "Leaders and admins can update leave requests" ON leave_requests;

CREATE POLICY "Users can view their own leave requests" ON leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view team leave requests" ON leave_requests FOR SELECT USING (
  public.has_role(auth.uid(), 'leader') AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND team_id = public.get_user_team(auth.uid()))
);
CREATE POLICY "Admins can view all leave requests" ON leave_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their pending requests" ON leave_requests FOR UPDATE USING (
  auth.uid() = user_id AND status = 'pending'
);
CREATE POLICY "Leaders and admins can update leave requests" ON leave_requests FOR UPDATE USING (
  public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')
);
```

#### Audit Logs Policies
```sql
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
```

### Step 8: Create Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_shift_id ON profiles(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_task_columns_created_by ON task_columns(created_by);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_user_id ON room_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
```

### Step 9: Configure Storage

Go to Supabase Dashboard > Storage and create these buckets:

1. **avatars** - For user profile pictures
   - Make public (disable RLS if needed for public avatars)
   
2. **documents** - For CV files and documents
   - Keep private, configure RLS if needed
   
3. **task-attachments** - For task attachments
   - Keep private, configure RLS if needed

### Step 10: Test the Setup

1. Create a test user in Authentication
2. Verify profile is auto-created via trigger
3. Test RLS policies with test queries
4. Verify all tables and functions exist

## Troubleshooting

### Profile not found error
- Check that the auth user trigger is active
- Manually insert a profile: `INSERT INTO profiles (id, email) VALUES (user_uuid, user_email);`

### RLS permission errors (406, 400)
- Verify RLS policies are correctly created
- Check that user has appropriate role assigned
- Ensure security definer functions are properly set up

### Schema cache errors (400)
- Wait 30 seconds for schema cache refresh
- Or hard refresh browser (Ctrl+F5)

## Features Included

✅ User Management with roles (admin, leader, staff)
✅ Team Management
✅ Attendance Tracking
✅ Task Management with dynamic columns
✅ Leave Requests
✅ Meeting Room Bookings
✅ Profile Management with avatar upload
✅ Row Level Security (RLS) for all tables
✅ Automatic timestamp management
✅ Audit logging

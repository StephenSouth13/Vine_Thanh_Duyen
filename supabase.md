# Supabase Database Setup Guide - Vine CRM

Complete guide for setting up and configuring the Supabase PostgreSQL database for the Vine CRM application.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Database Schema](#database-schema)
3. [Authentication Configuration](#authentication-configuration)
4. [Row-Level Security (RLS)](#row-level-security-rls)
5. [Environment Variables](#environment-variables)
6. [Seeding Initial Data](#seeding-initial-data)
7. [Running Migrations](#running-migrations)
8. [Local Development Setup](#local-development-setup)

---

## Initial Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in with your account
3. Click **"New Project"**
4. Fill in project details:
   - **Name**: vine-crm (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free or Pro (Free tier includes 500MB database)
5. Click **"Create new project"**

### Step 2: Get Connection Details

Once your project is created:

1. Go to **Settings → Database**
2. Copy the following information:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **Anon Public Key**: For client-side authentication
   - **Service Role Key**: For server-side operations (keep secret!)
   - **Database Password**: For direct database connections

### Step 3: Update Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_PUBLIC_KEY]

# Server-side only (if needed for backend)
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
```

Update `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";
```

---

## Database Schema

### Complete Database Structure for Vine CRM

#### Table 1: `auth.users` (Built-in Supabase)
System-managed table for authentication. Automatically created by Supabase.

```sql
-- No SQL needed - managed by Supabase
-- Contains: id, email, encrypted_password, email_confirmed_at, created_at, updated_at
```

---

#### Table 2: `profiles`
Stores extended user information beyond basic auth.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(20),
  date_of_birth DATE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  annual_leave_balance DECIMAL(5, 2) DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_profiles_shift_id ON profiles(shift_id);
```

---

#### Table 3: `user_roles`
Maps users to their roles (admin, leader, staff).

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'leader', 'staff')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

---

#### Table 4: `teams`
Organization teams/departments.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_teams_manager_id ON teams(manager_id);
CREATE INDEX idx_teams_department ON teams(department);
```

---

#### Table 5: `shifts`
Work shift patterns and schedules.

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_flexible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO shifts (name, start_time, end_time, is_flexible) VALUES
  ('Morning', '08:00', '16:00', FALSE),
  ('Afternoon', '14:00', '22:00', FALSE),
  ('Night', '22:00', '06:00', FALSE),
  ('Flexible', '09:00', '17:00', TRUE);
```

---

#### Table 6: `attendance`
Employee check-in/check-out records.

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('check_in', 'check_out')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  location GEOGRAPHY(POINT),
  device_info JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX idx_attendance_type ON attendance(type);
CREATE INDEX idx_attendance_user_timestamp ON attendance(user_id, timestamp);
```

---

#### Table 7: `tasks`
Task management and tracking.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

#### Table 8: `meeting_rooms`
Available meeting/conference rooms.

```sql
CREATE TABLE meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  floor INTEGER,
  building VARCHAR(100),
  amenities JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_meeting_rooms_capacity ON meeting_rooms(capacity);
CREATE INDEX idx_meeting_rooms_is_active ON meeting_rooms(is_active);

-- Sample data
INSERT INTO meeting_rooms (name, description, capacity, floor, building, amenities, is_active) VALUES
  ('Conference Room A', 'Large conference room', 20, 2, 'Building A', '{"projector": true, "whiteboard": true, "video_conferencing": true}', TRUE),
  ('Meeting Room 1', 'Small meeting room', 6, 1, 'Building A', '{"whiteboard": true, "monitor": true}', TRUE),
  ('Board Room', 'Executive board room', 12, 3, 'Building B', '{"projector": true, "video_conferencing": true, "catering_available": true}', TRUE);
```

---

#### Table 9: `room_bookings`
Meeting room reservations and bookings.

```sql
CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  attendees INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX idx_room_bookings_user_id ON room_bookings(user_id);
CREATE INDEX idx_room_bookings_start_time ON room_bookings(start_time);
CREATE INDEX idx_room_bookings_status ON room_bookings(status);

-- Constraint: Prevent double-booking
ALTER TABLE room_bookings ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (room_id WITH =, tsrange(start_time, end_time) WITH &&);
```

---

#### Table 10: `leave_requests`
Employee leave and vacation requests.

```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'maternity', 'sabbatical')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX idx_leave_requests_approver_id ON leave_requests(approver_id);

-- Constraint: End date must be after start date
ALTER TABLE leave_requests ADD CONSTRAINT valid_date_range
CHECK (end_date >= start_date);
```

---

#### Table 11: `salary_records`
Employee salary and payroll information.

```sql
CREATE TABLE salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_salary DECIMAL(12, 2) NOT NULL,
  allowances DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_salary_records_user_id ON salary_records(user_id);
CREATE INDEX idx_salary_records_pay_period_start ON salary_records(pay_period_start);
CREATE INDEX idx_salary_records_payment_status ON salary_records(payment_status);
```

---

#### Table 12: `notifications`
System notifications for users.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  notification_type VARCHAR(50) CHECK (notification_type IN ('task', 'attendance', 'leave', 'meeting', 'system')),
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

## Authentication Configuration

### Enable Authentication Methods

1. **Email/Password Authentication** (Default - Already Enabled)
   - Go to **Authentication → Providers**
   - Email/Password is enabled by default
   - No additional configuration needed

2. **Email Confirmation** (Recommended)
   - Go to **Authentication → Email Templates**
   - Customize confirmation email if needed
   - Ensure SMTP settings are configured for production

3. **Password Recovery**
   - Email templates automatically available
   - Recovery link valid for 24 hours (configurable)

### Configure Authentication Settings

1. Go to **Authentication → Policies**
2. Set the following:
   - **Email confirmation required**: Toggle ON (for production)
   - **Enable session management**: ON
   - **Redirect URLs**: Add your app URL (e.g., `http://localhost:5173` for dev, `https://yourdomain.com` for prod)
   - **Disable signup**: Toggle if needed to restrict registration

---

## Row-Level Security (RLS)

### Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### Implement RLS Policies

#### Profiles Table Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert profiles
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

#### Tasks Table Policies

```sql
-- Users can view their own tasks (as assignee or creator)
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = assignee_id OR auth.uid() = creator_id
  );

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create tasks
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Users can update their assigned or created tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR auth.uid() = creator_id
  );

-- Admins can update any task
CREATE POLICY "Admins can update any task" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

#### Attendance Table Policies

```sql
-- Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON attendance
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own attendance
CREATE POLICY "Users can insert own attendance" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

#### Room Bookings Table Policies

```sql
-- Users can view their own bookings and public rooms
CREATE POLICY "Users can view own bookings" ON room_bookings
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON room_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own bookings
CREATE POLICY "Users can update own bookings" ON room_bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON room_bookings
  FOR DELETE USING (auth.uid() = user_id);
```

#### Leave Requests Table Policies

```sql
-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests" ON leave_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Leaders/Admins can view team member requests
CREATE POLICY "Leaders can view team leave requests" ON leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('leader', 'admin')
    )
  );

-- Users can create their own leave requests
CREATE POLICY "Users can create leave requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own requests" ON leave_requests
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  )
  WITH CHECK (auth.uid() = user_id);
```

#### Salary Records Table Policies

```sql
-- Users can view their own salary records
CREATE POLICY "Users can view own salary" ON salary_records
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can view/manage all salary records
CREATE POLICY "Admins can manage all salary" ON salary_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Environment Variables

### Development Environment (`.env.local`)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Optional: For server-side operations (backend only, not in browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Production Environment

Set these in your hosting platform (Netlify, Vercel, etc.):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**⚠️ SECURITY WARNING**:
- Never commit `.env.local` to Git
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Keep keys secret and rotate them periodically
- Use different keys for different environments (dev, staging, prod)

---

## Seeding Initial Data

### Create Seed File (`supabase/seed.sql`)

```sql
-- Seed shifts first (no dependencies)
INSERT INTO shifts (name, start_time, end_time, is_flexible) 
VALUES
  ('Morning Shift', '08:00', '16:00', FALSE),
  ('Afternoon Shift', '14:00', '22:00', FALSE),
  ('Night Shift', '22:00', '06:00', FALSE),
  ('Flexible Hours', '09:00', '17:00', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed teams
INSERT INTO teams (name, description, department)
VALUES
  ('Engineering', 'Software development team', 'Technology'),
  ('Sales', 'Sales and business development', 'Business'),
  ('HR', 'Human resources and recruitment', 'Administration'),
  ('Marketing', 'Marketing and brand management', 'Business')
ON CONFLICT (name) DO NOTHING;

-- Seed meeting rooms
INSERT INTO meeting_rooms (name, description, capacity, floor, building, amenities)
VALUES
  ('Board Room A', 'Executive board room with video conferencing', 12, 3, 'Building A', '{"projector": true, "video_conferencing": true, "whiteboard": true}'),
  ('Conference Room 1', 'Large conference room', 20, 2, 'Building A', '{"projector": true, "whiteboard": true}'),
  ('Meeting Room 1', 'Small meeting room', 6, 1, 'Building A', '{"whiteboard": true}'),
  ('Meeting Room 2', 'Medium meeting room', 10, 1, 'Building B', '{"monitor": true, "whiteboard": true}')
ON CONFLICT (name) DO NOTHING;
```

### Running Seed Data

**Option 1: Using Supabase CLI**

```bash
npx supabase db push
npx supabase db seed run supabase/seed.sql
```

**Option 2: Using Supabase Dashboard**

1. Go to **SQL Editor**
2. Click **New Query**
3. Paste the seed SQL
4. Click **Run**

---

## Running Migrations

### Using Supabase CLI

#### Initialize Supabase in Your Project

```bash
npm install -D supabase@latest
npx supabase init
```

#### Create Schema Migration

```bash
# Create a new migration
npx supabase migration new create_initial_schema
```

This creates a new migration file in `supabase/migrations/`.

#### Edit Migration File

Edit the created migration file with your schema creation SQL:

```sql
-- supabase/migrations/[TIMESTAMP]_create_initial_schema.sql

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... rest of schema
);

-- ... more table definitions
```

#### Apply Migration Locally

```bash
# Create local Supabase environment
npx supabase start

# Test your migration
npx supabase db push
```

#### Push Migration to Production

```bash
# This will push to your Supabase project
npx supabase link
npx supabase db push
```

### Using Supabase Dashboard SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Write or paste your SQL
4. Click **Run**

**Example: Creating the Complete Schema**

```bash
npx supabase migration new create_vine_crm_schema
```

Then add all table creation statements to the migration file.

---

## Local Development Setup

### Setup Supabase Locally

#### 1. Install Docker

Supabase local development requires Docker. Install from [docker.com](https://docker.com)

#### 2. Install Supabase CLI

```bash
npm install -D supabase@latest
```

#### 3. Start Local Supabase

```bash
# Start Supabase container
npx supabase start
```

This will:
- Start PostgreSQL database locally
- Start authentication service
- Start API gateway
- Create local Supabase studio at `http://localhost:54323`

#### 4. Get Local Connection Details

After starting, you'll see:

```
Local Supabase Studio: http://localhost:54323

API URL: http://localhost:54321
Anon Key: your-anon-key-here
Service Role Key: your-service-role-key-here
```

#### 5. Update `.env.local` for Local Development

```env
# Local development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# For production, use actual Supabase project
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

#### 6. Load Schema into Local Database

```bash
# Pull latest schema from remote (if using linked project)
npx supabase db pull

# Or push local migrations
npx supabase db push
```

#### 7. Seed Local Database

```bash
npx supabase db seed run
```

#### 8. Stop Local Supabase

```bash
npx supabase stop
```

### Testing Database Locally

#### Run Tests Against Local DB

```bash
# Make sure local Supabase is running
npx supabase start

# Run your tests
npm run test

# Stop when done
npx supabase stop
```

---

## Backup and Restore

### Automatic Backups

Supabase automatically creates daily backups. To restore:

1. Go to **Settings → Database Backups**
2. Select desired backup
3. Click **Restore**

### Manual Backup

#### Using Supabase CLI

```bash
# Create backup
npx supabase db dump > backup-$(date +%Y%m%d).sql
```

#### Using PostgreSQL Tools

```bash
# Dump entire database
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# Restore from dump
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

---

## Useful Supabase Dashboard Features

### Storage (File Management)

1. Go to **Storage**
2. Create bucket for avatars:
   - **Name**: avatars
   - **Public**: Toggle ON
3. Create bucket for documents:
   - **Name**: documents
   - **Public**: Toggle OFF (for private documents)

#### RLS Policies for Storage

```sql
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to avatars
CREATE POLICY "Public avatars readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### Real-time Subscriptions

Enable real-time for specific tables:

1. Go to **Replication**
2. Toggle ON for tables needing real-time updates:
   - `tasks` (for live task updates)
   - `attendance` (for real-time attendance)
   - `notifications` (for live notifications)
   - `room_bookings` (for live booking updates)

### Database Functions

Create helper functions in SQL Editor:

```sql
-- Function to calculate leave balance
CREATE OR REPLACE FUNCTION calculate_leave_balance(user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_leaves DECIMAL;
  used_leaves DECIMAL;
BEGIN
  SELECT COALESCE(SUM(EXTRACT(DAY FROM (end_date - start_date + INTERVAL '1 day'))), 0)
  INTO used_leaves
  FROM leave_requests
  WHERE user_id = $1 AND status = 'approved';
  
  RETURN 12 - used_leaves; -- 12 = annual leave days
END;
$$ LANGUAGE plpgsql;
```

### Database Webhooks

Set up webhooks to trigger external actions (e.g., send email on leave approval):

1. Go to **Database Webhooks**
2. Create new webhook
3. Configure:
   - **Table**: leave_requests
   - **Event**: UPDATE
   - **HTTP endpoint**: Your backend webhook URL
   - **Headers**: Authorization, Content-Type, etc.

---

## Troubleshooting

### Common Issues

#### Email Confirmation Not Working

- Check SMTP settings in **Authentication → Email**
- Ensure `email_confirmed_at` field is nullable
- Test with Supabase dashboard's email test feature

#### RLS Blocking Queries

- Ensure policies are created correctly
- Check that user is authenticated
- Verify policy conditions match user's role
- Check `auth.uid()` returns expected value

#### Slow Queries

- Add indexes to frequently queried columns
- Use `EXPLAIN ANALYZE` to find bottlenecks
- Consider partitioning large tables (attendance, logs)

#### Connection Pooling Issues

- Use Supabase connection pooling in **Database Settings**
- Set pool size to 10-20 for most applications
- Use service role key for server-side operations

---

## Security Best Practices

### 1. Row-Level Security (RLS)

✅ **DO**: Always enable RLS on user-sensitive tables  
❌ **DON'T**: Disable RLS for convenience

### 2. Environment Variables

✅ **DO**: Keep keys in `.env.local` (gitignored)  
❌ **DON'T**: Commit keys to Git

### 3. API Keys

✅ **DO**: Use Anon Key for client-side, Service Role Key for backend only  
❌ **DON'T**: Expose Service Role Key in browser

### 4. Password Management

✅ **DO**: Enforce strong passwords (min 8 characters)  
✅ **DO**: Use password reset links
❌ **DON'T**: Store passwords in plaintext

### 5. Data Validation

✅ **DO**: Validate all inputs server-side (in RLS policies)  
✅ **DO**: Use constraints and checks in schema
❌ **DON'T**: Trust client-side validation alone

### 6. Audit Logging

✅ **DO**: Keep audit logs of sensitive operations  
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100),
  record_id UUID,
  action VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Monitoring and Debugging

### View Real-time Activity

**Supabase Dashboard → SQL Editor → Monitoring**

Monitor:
- Active connections
- Query performance
- Table sizes
- Replication lag

### Enable Query Logs

```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = 'on';
```

View logs in **Settings → Logs**

### Performance Insights

Check query performance with `EXPLAIN`:

```sql
EXPLAIN ANALYZE
SELECT * FROM tasks WHERE status = 'todo' AND assignee_id = 'user-id';
```

---

## Additional Resources

- **Official Docs**: https://supabase.com/docs
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Row-Level Security Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Real-time Docs**: https://supabase.com/docs/guides/realtime

---

## Summary Checklist

- [ ] Create Supabase project
- [ ] Get API URL and Anon Key
- [ ] Update `.env.local` with credentials
- [ ] Create all database tables
- [ ] Enable RLS on all tables
- [ ] Create RLS policies for each table
- [ ] Seed initial data (shifts, rooms, teams)
- [ ] Set up authentication email templates
- [ ] Configure allowed redirect URLs
- [ ] Test local development setup
- [ ] Backup production database
- [ ] Monitor database size and performance

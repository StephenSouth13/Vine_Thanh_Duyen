-- Fix RLS policy for tasks - Add DELETE permission for task creators
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete any tasks" ON tasks;

CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Admins can delete any tasks" ON tasks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create task_columns table for dynamic board columns (if not exists)
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

-- Enable RLS on task_columns if not already enabled
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own columns" ON task_columns;
DROP POLICY IF EXISTS "Admins can view all columns" ON task_columns;
DROP POLICY IF EXISTS "Users can create columns" ON task_columns;
DROP POLICY IF EXISTS "Users can update their own columns" ON task_columns;
DROP POLICY IF EXISTS "Users can delete their own columns" ON task_columns;

-- RLS Policies for task_columns
CREATE POLICY "Users can view their own columns" ON task_columns FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all columns" ON task_columns FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create columns" ON task_columns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own columns" ON task_columns FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own columns" ON task_columns FOR DELETE USING (auth.uid() = created_by);

-- Add column_id to tasks table if not exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL;

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_task_columns_created_by ON task_columns(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS update_task_columns_updated_at ON task_columns;
CREATE TRIGGER update_task_columns_updated_at BEFORE UPDATE ON task_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

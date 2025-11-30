-- Add approval columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_rejected ON profiles(approval_rejected);

-- Update RLS policy to prevent login of unapproved users
-- This is handled in the application layer, not here

-- For existing users (if any), mark them as approved
UPDATE public.profiles SET is_approved = TRUE, approval_date = NOW() WHERE is_approved = FALSE AND approval_date IS NULL;

-- Link employees to users (profiles) - optional relationship
-- Date: 2025-11-15

-- Add user_id column to employees table (nullable, references profiles)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id) WHERE user_id IS NOT NULL;

-- Partial unique index: one employee record per user per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_user_unique 
    ON public.employees(org_id, user_id) 
    WHERE user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.employees.user_id IS 'Optional link to user profile (profiles table). Allows connecting employee records to system users.';


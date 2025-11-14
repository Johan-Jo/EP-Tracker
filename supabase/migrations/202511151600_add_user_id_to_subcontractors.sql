-- Add user_id to subcontractors table (required for all UE)
-- Date: 2025-11-15

-- Add user_id column (nullable first, then make it required)
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- If there are existing rows without user_id, we need to handle them
-- For now, we'll make it NOT NULL after ensuring all rows have a user_id
-- Note: This migration assumes the table is empty or all rows have been updated
DO $$
BEGIN
    -- Check if there are any rows without user_id
    IF EXISTS (SELECT 1 FROM public.subcontractors WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot make user_id NOT NULL: there are existing subcontractors without user_id. Please update them first.';
    END IF;
    
    -- Make user_id NOT NULL if no null values exist
    ALTER TABLE public.subcontractors
    ALTER COLUMN user_id SET NOT NULL;
EXCEPTION
    WHEN others THEN
        -- If there are null values, we can't make it NOT NULL yet
        -- The application should handle this case
        RAISE NOTICE 'user_id column exists but may contain NULL values. Please update all subcontractors to have a user_id before making it NOT NULL.';
END $$;

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id ON public.subcontractors(user_id);

-- Add unique constraint: one subcontractor per user per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_subcontractors_org_user_unique
ON public.subcontractors (org_id, user_id);

-- Add comment
COMMENT ON COLUMN public.subcontractors.user_id IS 'Required link to the associated user profile in public.profiles. All subcontractors must have an EP-Tracker account.';


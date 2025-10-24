-- Fix circular RLS dependency for memberships (Version 2)
-- This version ensures clean slate by dropping ALL existing membership policies first

-- Drop ALL existing membership policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read org memberships" ON memberships;
DROP POLICY IF EXISTS "Users can read own memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;

-- CRITICAL: Create the "read own" policy FIRST
-- This breaks the circular dependency between user_orgs() and memberships
-- Users must be able to read their own memberships without calling user_orgs()
CREATE POLICY "Users can read own memberships"
    ON memberships FOR SELECT
    USING (user_id = auth.uid());

-- Now create the "read org" policy for admin/foreman functionality
-- This policy only applies when checking OTHER users' memberships
CREATE POLICY "Users can read org memberships"
    ON memberships FOR SELECT
    USING (
        org_id IN (SELECT user_orgs())
        AND user_id != auth.uid()  -- Only for other users, not self
    );

-- Recreate the admin management policies
CREATE POLICY "Admins can insert memberships"
    ON memberships FOR INSERT
    WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can update memberships"
    ON memberships FOR UPDATE
    USING (is_org_admin(org_id));

CREATE POLICY "Admins can delete memberships"
    ON memberships FOR DELETE
    USING (is_org_admin(org_id));

-- Verify policies were created
DO $$
BEGIN
    RAISE NOTICE 'Membership RLS policies updated successfully';
    RAISE NOTICE 'Policy count: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'memberships');
END $$;





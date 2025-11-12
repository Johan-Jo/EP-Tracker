-- Fix circular RLS dependency for memberships
-- Allow users to read their own memberships directly

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read org memberships" ON memberships;

-- Create new policy that allows users to read their own memberships
-- This breaks the circular dependency between user_orgs() and memberships
CREATE POLICY "Users can read own memberships"
    ON memberships FOR SELECT
    USING (user_id = auth.uid());

-- Also allow users to read other memberships in their org
-- This is for admin/foreman functionality
CREATE POLICY "Users can read org memberships"
    ON memberships FOR SELECT
    USING (org_id IN (SELECT user_orgs()));





















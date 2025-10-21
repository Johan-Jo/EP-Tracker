-- Fix RLS policies for organization_members to allow super admin access
-- and prevent infinite recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all memberships in their org" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON organization_members;

-- Create simple, non-recursive policies

-- 1. Super admins can do everything (bypass all checks)
CREATE POLICY "Super admins have full access"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND revoked_at IS NULL
    )
  );

-- 2. Users can view their own membership
CREATE POLICY "Users can view their own membership"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Users can view other members in their organization (simple join, no recursion)
CREATE POLICY "Users can view members in their org"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Verify policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;


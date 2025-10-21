-- Complete RLS policy fix for organization_members
-- Drops ALL policies and recreates them correctly

-- Drop ALL existing policies on organization_members
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create new, simple policies (no recursion)

-- 1. Super admins can do everything (bypass all checks)
CREATE POLICY "super_admins_full_access"
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
CREATE POLICY "users_view_own_membership"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Verify policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;


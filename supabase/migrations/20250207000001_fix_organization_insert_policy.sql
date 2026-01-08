-- Fix organization INSERT policy for signup flow
-- This allows service_role to create organizations during user registration

-- Drop existing INSERT policy if it exists (from fix-signup-complete.sql if applied)
DROP POLICY IF EXISTS "Service role can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Service role can insert organizations (needed for signup via complete-signup API)
CREATE POLICY "Service role can insert organizations"
    ON organizations FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Authenticated users can also insert organizations (for complete-organization flow)
-- This is needed when users complete setup after email verification
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

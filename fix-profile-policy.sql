-- Fix: Allow users to insert their own profile during signup
-- This enables the profile creation in the signup flow

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create correct policy that allows profile insertion
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Also ensure the policy for reading exists
DROP POLICY IF EXISTS "Users can read org member profiles" ON profiles;

CREATE POLICY "Users can read org member profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        id IN (
            SELECT user_id 
            FROM memberships 
            WHERE org_id IN (
                SELECT org_id 
                FROM memberships 
                WHERE user_id = auth.uid()
            )
        )
    );


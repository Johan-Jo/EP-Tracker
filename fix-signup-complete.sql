-- Complete fix for signup flow with automatic profile creation
-- This removes the need to manually create profiles from the API

-- 1. Add missing columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_number TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- 2. Drop existing RLS policies for profiles
DROP POLICY IF EXISTS "Users can read org member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 3. Create new RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Service role can insert profiles (for automatic creation via trigger)
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Authenticated users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Users can read their own profile and profiles of org members
CREATE POLICY "Users can read org member profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        id IN (
            SELECT DISTINCT m2.user_id
            FROM memberships m1
            JOIN memberships m2 ON m1.org_id = m2.org_id
            WHERE m1.user_id = auth.uid()
            AND m1.is_active = true
            AND m2.is_active = true
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 4. Drop existing RLS policies for organizations
DROP POLICY IF EXISTS "Users can read their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

-- 5. Create new RLS policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Service role can insert organizations (needed for signup)
CREATE POLICY "Service role can insert organizations"
    ON organizations FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Authenticated users can insert organizations
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can read organizations they are members of
CREATE POLICY "Users can read their organizations"
    ON organizations FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT org_id 
            FROM memberships 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Only admins can update their organizations
CREATE POLICY "Admins can update their organizations"
    ON organizations FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT org_id 
            FROM memberships 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    )
    WITH CHECK (
        id IN (
            SELECT org_id 
            FROM memberships 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- 6. Create trigger function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 8. Create trigger to run on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;


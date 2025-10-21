-- Discover what tables exist and fix schema if needed

-- 1. List all tables in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if organization_members exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'organization_members'
) as has_organization_members;

-- 3. If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'finance', 'worker')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- 5. Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
CREATE POLICY "Users can view their own memberships"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all memberships in their org" ON organization_members;
CREATE POLICY "Admins can view all memberships in their org"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert memberships" ON organization_members;
CREATE POLICY "Admins can insert memberships"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update memberships" ON organization_members;
CREATE POLICY "Admins can update memberships"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete memberships" ON organization_members;
CREATE POLICY "Admins can delete memberships"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 7. Now insert your membership
INSERT INTO organization_members (
  id,
  user_id,
  organization_id,
  role,
  joined_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  au.id,
  o.id,
  'admin',
  now(),
  now(),
  now()
FROM auth.users au
CROSS JOIN organizations o
WHERE au.email = 'oi@johan.com.br'
  AND NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.user_id = au.id 
      AND om.organization_id = o.id
  )
LIMIT 1;

-- 8. Verify the connection
SELECT 
  om.id,
  om.role,
  om.joined_at,
  o.name as organization_name,
  au.email as user_email
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users au ON au.id = om.user_id
WHERE au.email = 'oi@johan.com.br';


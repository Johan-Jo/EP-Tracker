-- Allow public read access to demo organization data
-- This enables anonymous users to view demo projects, activities, etc.

-- Projects: Allow public read access to demo org projects
DROP POLICY IF EXISTS "Public can read demo projects" ON projects;
CREATE POLICY "Public can read demo projects"
ON projects
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

-- Time entries: Allow public read access to demo org time entries
DROP POLICY IF EXISTS "Public can read demo time entries" ON time_entries;
CREATE POLICY "Public can read demo time entries"
ON time_entries
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

-- Materials: Allow public read access to demo org materials
DROP POLICY IF EXISTS "Public can read demo materials" ON materials;
CREATE POLICY "Public can read demo materials"
ON materials
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

-- Diary entries: Allow public read access to demo org diary entries
DROP POLICY IF EXISTS "Public can read demo diary entries" ON diary_entries;
CREATE POLICY "Public can read demo diary entries"
ON diary_entries
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

-- Work orders: Allow public read access to demo org work orders
DROP POLICY IF EXISTS "Public can read demo work orders" ON work_orders;
CREATE POLICY "Public can read demo work orders"
ON work_orders
FOR SELECT
TO public
USING (organization_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));


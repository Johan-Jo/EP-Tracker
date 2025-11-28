-- Allow public read access to demo organization
-- This enables anonymous users to access the demo organization for demo mode

-- Policy: Anyone can read the demo organization (by slug)
CREATE POLICY "Public can read demo organization"
ON organizations
FOR SELECT
TO public
USING (slug = 'demo');

-- Add comment
COMMENT ON POLICY "Public can read demo organization" ON organizations IS 
'Allows anonymous and authenticated users to read the demo organization for demo mode functionality';


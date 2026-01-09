-- Allow public read access to demo organization customers
-- This enables anonymous users to view demo customers in demo mode

-- Customers: Allow public read access to demo org customers
DROP POLICY IF EXISTS "Public can read demo customers" ON customers;
CREATE POLICY "Public can read demo customers"
ON customers
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

COMMENT ON POLICY "Public can read demo customers" ON customers IS 
'Allows anonymous and authenticated users to read customers for the demo organization in demo mode';

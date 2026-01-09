-- Allow public read access to demo organization invoice_basis and payroll_basis
-- This enables anonymous users to view demo invoice and payroll basis in demo mode

-- Invoice basis: Allow public read access to demo org invoice basis
DROP POLICY IF EXISTS "Public can read demo invoice basis" ON invoice_basis;
CREATE POLICY "Public can read demo invoice basis"
ON invoice_basis
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

COMMENT ON POLICY "Public can read demo invoice basis" ON invoice_basis IS 
'Allows anonymous and authenticated users to read invoice basis for the demo organization in demo mode';

-- Payroll basis: Allow public read access to demo org payroll basis
DROP POLICY IF EXISTS "Public can read demo payroll basis" ON payroll_basis;
CREATE POLICY "Public can read demo payroll basis"
ON payroll_basis
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

COMMENT ON POLICY "Public can read demo payroll basis" ON payroll_basis IS 
'Allows anonymous and authenticated users to read payroll basis for the demo organization in demo mode';

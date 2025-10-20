-- Add organization details columns
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_number TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comment for documentation
COMMENT ON COLUMN organizations.org_number IS 'Swedish organization number (organisationsnummer)';
COMMENT ON COLUMN organizations.phone IS 'Company phone number';
COMMENT ON COLUMN organizations.address IS 'Street address';
COMMENT ON COLUMN organizations.postal_code IS 'Postal code';
COMMENT ON COLUMN organizations.city IS 'City';


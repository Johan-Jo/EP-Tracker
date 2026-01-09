-- =====================================================
-- Add demo_reference_date to organizations table
-- EPIC: Demo Mode - Date-Independent Data
-- =====================================================
-- Purpose: Store reference date when demo data was seeded
-- This allows date-shifting to keep demo data "current" over time

-- Add demo_reference_date column (nullable - only set for demo org)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS demo_reference_date TIMESTAMPTZ;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organizations_demo_reference_date 
ON organizations(demo_reference_date) 
WHERE demo_reference_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN organizations.demo_reference_date IS 
  'Reference date when demo data was seeded. Used for date-shifting to keep demo data current. Only set for demo organization.';

-- Verify
SELECT 'demo_reference_date column added successfully' AS status;

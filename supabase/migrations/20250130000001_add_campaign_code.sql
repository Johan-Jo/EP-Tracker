-- Add campaign code field to organizations table
-- This field allows tracking which campaign code was used during registration

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS campaign_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN organizations.campaign_code IS 'Campaign code entered during registration (optional)';

-- Add index for potential filtering/reporting on campaign codes
CREATE INDEX IF NOT EXISTS idx_organizations_campaign_code ON organizations(campaign_code) WHERE campaign_code IS NOT NULL;


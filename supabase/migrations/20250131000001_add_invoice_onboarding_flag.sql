-- Migration: Add invoice onboarding completion flag to organizations
-- Date: 2025-01-31
-- Description: Track when invoice onboarding has been completed for an organization
-- EPIC: 48 - Fakturaunderlag Step-Based Flow

-- Add invoice_onboarding_completed_at column to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS invoice_onboarding_completed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN organizations.invoice_onboarding_completed_at IS 'Timestamp when invoice onboarding was first completed. NULL means onboarding not yet completed. Once set, onboarding will not be shown again for this organization.';

-- Add index for querying organizations that haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_organizations_invoice_onboarding_completed 
ON organizations(invoice_onboarding_completed_at) 
WHERE invoice_onboarding_completed_at IS NULL;


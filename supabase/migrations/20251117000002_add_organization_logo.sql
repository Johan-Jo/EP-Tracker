-- Add organization logo URL field
-- This is used for branding on invoice PDFs and future salary documents

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN organizations.logo_url IS 'Public URL to organization logo image used in exports (invoice PDF, etc)';



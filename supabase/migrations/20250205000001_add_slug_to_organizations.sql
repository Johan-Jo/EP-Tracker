-- Add slug field to organizations table for demo mode
-- EPIC 1: Data Model & Seed for Demo Organization

-- Add slug column (nullable initially to allow backfill)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index on slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Backfill existing organizations with slug based on name
-- Convert to lowercase, replace spaces/special chars with hyphens
UPDATE organizations
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Add unique constraint on slug
ALTER TABLE organizations
ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);

-- Make slug NOT NULL after backfill
ALTER TABLE organizations
ALTER COLUMN slug SET NOT NULL;

-- Add comment
COMMENT ON COLUMN organizations.slug IS 'Unique slug identifier for organization (used for demo mode)';


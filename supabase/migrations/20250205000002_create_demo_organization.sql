-- Create demo organization for demo mode
-- EPIC 1: Data Model & Seed for Demo Organization

-- Insert demo organization if it doesn't exist
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'EP Bygg & Måleri AB',
  'demo',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE slug = 'demo'
);

-- Add comment
COMMENT ON TABLE organizations IS 'Organizations table - includes demo organization with slug=''demo'' for demo mode';


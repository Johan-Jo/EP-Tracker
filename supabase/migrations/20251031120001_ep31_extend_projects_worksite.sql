-- EPIC 31: Extend projects with worksite/personalliggare fields
-- Date: 2025-10-31

BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS worksite_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS worksite_code TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS building_id TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS control_qr_token TEXT,
  ADD COLUMN IF NOT EXISTS retention_years INT DEFAULT 2 CHECK (retention_years >= 2);

COMMENT ON COLUMN projects.worksite_enabled IS 'Enable Personalliggare for this project';
COMMENT ON COLUMN projects.worksite_code IS 'Internal/display code for worksite';
COMMENT ON COLUMN projects.address_line1 IS 'Worksite address line 1';
COMMENT ON COLUMN projects.address_line2 IS 'Worksite address line 2';
COMMENT ON COLUMN projects.postal_code IS 'Worksite postal code';
COMMENT ON COLUMN projects.city IS 'Worksite city';
COMMENT ON COLUMN projects.country IS 'Worksite country';
COMMENT ON COLUMN projects.building_id IS 'Construction site ID (optional)';
COMMENT ON COLUMN projects.timezone IS 'Default timezone for project';
COMMENT ON COLUMN projects.control_qr_token IS 'One-time token for Control view';
COMMENT ON COLUMN projects.retention_years IS 'Retention period for Personalliggare (>=2 years)';

COMMIT;
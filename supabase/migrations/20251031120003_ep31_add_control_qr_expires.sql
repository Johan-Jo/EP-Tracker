-- EPIC 31: Add control QR expiration column
-- Date: 2025-10-31

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS control_qr_expires_at TIMESTAMPTZ; 

COMMENT ON COLUMN projects.control_qr_expires_at IS 'Expiration timestamp for one-time Control-QR token';
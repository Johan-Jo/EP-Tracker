-- Migration: Add 'ue' role to memberships
-- Date: 2025-11-12
-- Description: Add UE Underentreprenör role with worker-level permissions

ALTER TABLE memberships
DROP CONSTRAINT IF EXISTS memberships_role_check;

ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN ('admin', 'foreman', 'worker', 'finance', 'ue'));

COMMENT ON COLUMN memberships.role IS 'User role: admin (full access), foreman (site management), worker (own data), finance (read-only), ue (subcontractor with worker privileges)';

-- Migration: Add 'finance' role to memberships
-- Date: 2024-10-19
-- Description: Add finance role for users who handle invoicing and salaries

-- Drop existing CHECK constraint on role
ALTER TABLE memberships 
DROP CONSTRAINT IF EXISTS memberships_role_check;

-- Add new CHECK constraint with 'finance' role included
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check 
CHECK (role IN ('admin', 'foreman', 'worker', 'finance'));

-- Comment on the change
COMMENT ON COLUMN memberships.role IS 'User role: admin (full access), foreman (site management), worker (own data only), finance (invoicing and salaries)';


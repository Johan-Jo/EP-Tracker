-- Revert Work Orders M1 Schema
-- This migration removes the work orders feature that was pushed to production prematurely
-- Date: 2025-01-26

-- ============================================================================
-- REMOVE WORK ORDER REFERENCES FROM EXISTING TABLES
-- ============================================================================

-- Remove work_order_id from diary_entries (added in work_orders_m1_schema.sql)
ALTER TABLE diary_entries
DROP COLUMN IF EXISTS work_order_id;

DROP INDEX IF EXISTS idx_diary_entries_work_order_id;

-- Remove work_order_id from time_entries
-- Note: work_order_id was in initial schema but work_orders table was created later
-- Since we're removing work_orders table, we must also remove the foreign key column
ALTER TABLE time_entries
DROP COLUMN IF EXISTS work_order_id;

-- ============================================================================
-- DROP WORK ORDER ASSIGNMENTS TABLE
-- ============================================================================

DROP TABLE IF EXISTS work_order_assignments CASCADE;

-- ============================================================================
-- DROP WORK ORDERS TABLE
-- ============================================================================

DROP TABLE IF EXISTS work_orders CASCADE;

-- ============================================================================
-- DROP WORK ORDER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS generate_work_order_number(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS set_work_order_number() CASCADE;
DROP FUNCTION IF EXISTS update_work_orders_updated_at() CASCADE;

-- ============================================================================
-- DROP WORK ORDER TRIGGERS
-- ============================================================================

-- Drop triggers only if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'work_orders') THEN
        DROP TRIGGER IF EXISTS trigger_set_work_order_number ON work_orders;
        DROP TRIGGER IF EXISTS trigger_update_work_orders_updated_at ON work_orders;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'work_order_assignments') THEN
        DROP TRIGGER IF EXISTS trigger_update_work_order_assignments_updated_at ON work_order_assignments;
    END IF;
END $$;

-- ============================================================================
-- DROP WORK ORDER POLICIES (RLS)
-- ============================================================================

DROP POLICY IF EXISTS work_orders_select_policy ON work_orders;
DROP POLICY IF EXISTS work_orders_insert_policy ON work_orders;
DROP POLICY IF EXISTS work_orders_update_policy ON work_orders;
DROP POLICY IF EXISTS work_orders_delete_policy ON work_orders;
DROP POLICY IF EXISTS work_order_assignments_select_policy ON work_order_assignments;
DROP POLICY IF EXISTS work_order_assignments_insert_policy ON work_order_assignments;
DROP POLICY IF EXISTS work_order_assignments_update_policy ON work_order_assignments;
DROP POLICY IF EXISTS work_order_assignments_delete_policy ON work_order_assignments;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE time_entries IS 'Time tracking entries - work_order_id column removed as work orders feature was reverted';


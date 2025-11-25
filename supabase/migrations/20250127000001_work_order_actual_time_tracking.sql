-- Work Order Actual Time Tracking
-- Automatically updates actual_start_at and actual_end_at from time entries
-- Adds approval workflow for workers to verify/approve recorded time
-- Date: 2025-01-27

-- ============================================================================
-- ADD APPROVAL FIELDS TO WORK_ORDERS
-- ============================================================================

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS actual_time_approved_by_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS actual_time_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_time_approval_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS actual_time_approval_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS send_time_approval_email BOOLEAN NOT NULL DEFAULT true;

-- Index for approval token lookup
CREATE INDEX IF NOT EXISTS idx_work_orders_approval_token ON work_orders(actual_time_approval_token) WHERE actual_time_approval_token IS NOT NULL;

-- ============================================================================
-- FUNCTION: Update actual times from time entries
-- ============================================================================

CREATE OR REPLACE FUNCTION update_work_order_actual_times()
RETURNS TRIGGER AS $$
DECLARE
    min_start TIMESTAMPTZ;
    max_end TIMESTAMPTZ;
BEGIN
    -- Get min start_at and max stop_at from all time entries for this work order
    SELECT 
        MIN(start_at),
        MAX(stop_at)
    INTO min_start, max_end
    FROM time_entries
    WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
      AND stop_at IS NOT NULL; -- Only count completed time entries
    
    -- Update work order with actual times
    UPDATE work_orders
    SET 
        actual_start_at = min_start,
        actual_end_at = max_end,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.work_order_id, OLD.work_order_id)
      AND (min_start IS NOT NULL OR max_end IS NOT NULL);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update actual times when time entries change
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_work_order_actual_times ON time_entries;

CREATE TRIGGER trigger_update_work_order_actual_times
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW
WHEN (COALESCE(NEW.work_order_id, OLD.work_order_id) IS NOT NULL)
EXECUTE FUNCTION update_work_order_actual_times();

-- ============================================================================
-- FUNCTION: Generate approval token
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;


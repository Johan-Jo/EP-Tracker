-- Work Order Two-Step Approval
-- Adds worker confirmation and manager approval workflow
-- Date: 2025-01-28

-- ============================================================================
-- ADD WORKER CONFIRMATION FIELDS
-- ============================================================================

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS actual_time_worker_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_time_worker_confirmed_by_id UUID REFERENCES profiles(id);

-- Index for worker confirmation lookup
CREATE INDEX IF NOT EXISTS idx_work_orders_worker_confirmed ON work_orders(actual_time_worker_confirmed_by_id) 
WHERE actual_time_worker_confirmed_by_id IS NOT NULL;

-- ============================================================================
-- ADD MANAGER APPROVAL FIELDS
-- ============================================================================

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS actual_time_manager_approval_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS actual_time_manager_approval_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_time_manager_approved_by_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS actual_time_manager_approved_at TIMESTAMPTZ;

-- Index for manager approval token lookup
CREATE INDEX IF NOT EXISTS idx_work_orders_manager_approval_token ON work_orders(actual_time_manager_approval_token) 
WHERE actual_time_manager_approval_token IS NOT NULL;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON COLUMN work_orders.actual_time_worker_confirmed_at IS 'When the worker confirmed/approved their registered time';
COMMENT ON COLUMN work_orders.actual_time_worker_confirmed_by_id IS 'Which worker confirmed their time';
COMMENT ON COLUMN work_orders.actual_time_manager_approval_token IS 'Unique token for manager approval link';
COMMENT ON COLUMN work_orders.actual_time_manager_approval_sent_at IS 'When the manager approval email was sent';
COMMENT ON COLUMN work_orders.actual_time_manager_approved_by_id IS 'Which manager/admin approved the time';
COMMENT ON COLUMN work_orders.actual_time_manager_approved_at IS 'When the manager/admin approved the time';


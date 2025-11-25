-- Add work_order_id to time_entries (for work orders feature)
-- This column was removed in the revert migration but needs to be restored

ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_work_order_id ON time_entries(work_order_id);

